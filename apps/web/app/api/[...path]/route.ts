import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { INSTRUMENT_LIST, PLANS, isInstrument, parseJson, planAllows, type PlanId } from "@harsi/shared";
import { STRATEGIES, getStrategy } from "@harsi/strategies";
import { performanceStats } from "@harsi/trading-engine";
import { prisma } from "@/lib/prisma";
import { authenticate, clearSessionCookie, createAccount, getCurrentUser, rateLimit, sessionCookie, signSession } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";
import {
  analyticsFor,
  cancelPaperOrder,
  closeAllPaper,
  closePaperPosition,
  connectBroker,
  dashboardPayload,
  disconnectBroker,
  listBrokers,
  moveProtection,
  placeOrderForUser,
  runUserBacktest,
  serializeSignal,
  syncBroker,
  tickUser,
} from "@/lib/actions";
import { loadLedger } from "@/lib/ledger";
import { runtimeState } from "@/lib/market";

async function body(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function actor() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: fail("Sign in required.", 401) };
  return { user, error: null };
}

async function dispatch(method: string, req: NextRequest, path: string[]) {
  const key = `${method} ${path.join("/")}`;
  if (key === "POST auth/signup") {
    const input = z.object({ name: z.string().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(100) }).safeParse(await body(req));
    if (!input.success) return fail("Name, email, and a password of at least 8 characters are required.");
    if (!rateLimit(`signup:${input.data.email}`)) return fail("Too many attempts. Wait a few minutes.", 429);
    const created = await createAccount(input.data);
    if (!created.ok) return fail(created.error, 409);
    sessionCookie(await signSession(created.userId));
    return NextResponse.json({ ok: true });
  }
  if (key === "POST auth/login") {
    const input = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(await body(req));
    if (!input.success) return fail("Enter an email and password.");
    if (!rateLimit(`login:${input.data.email}`, 8)) return fail("Too many sign-in attempts.", 429);
    const auth = await authenticate(input.data.email, input.data.password);
    if (!auth.ok) return fail(auth.error, 401);
    sessionCookie(await signSession(auth.userId));
    return NextResponse.json({ ok: true });
  }
  if (key === "POST auth/logout") {
    const user = await getCurrentUser();
    if (user) await prisma.auditLog.create({ data: { userId: user.id, action: "logout", detail: "Signed out." } });
    clearSessionCookie();
    return NextResponse.json({ ok: true });
  }
  if (key === "POST auth/forgot") {
    const input = z.object({ email: z.string().email() }).safeParse(await body(req));
    if (!input.success) return fail("Enter the account email.");
    const user = await prisma.user.findUnique({ where: { email: input.data.email.toLowerCase() } });
    let devResetUrl: string | undefined;
    if (user) {
      const token = randomBytes(24).toString("hex");
      await prisma.passwordReset.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      });
      await prisma.auditLog.create({ data: { userId: user.id, action: "password_reset_requested", detail: process.env.SMTP_URL ? "Reset token created." : "Reset token created. SMTP is not configured, so no email was sent." } });
      if (process.env.DEMO_MODE === "true") devResetUrl = `/reset-password?token=${token}`;
    }
    return NextResponse.json({
      ok: true,
      message: "If an account exists, a reset token was created. SMTP is not configured, so no email was sent.",
      devResetUrl,
    });
  }
  if (key === "POST auth/reset") {
    const input = z.object({ token: z.string().min(10), password: z.string().min(8).max(100) }).safeParse(await body(req));
    if (!input.success) return fail("A valid token and a new password are required.");
    const row = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(input.data.token) } });
    if (!row || row.used || row.expiresAt.getTime() < Date.now()) return fail("This reset link is invalid or expired.");
    await prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(input.data.password, 10) } });
    await prisma.passwordReset.update({ where: { id: row.id }, data: { used: true } });
    await prisma.auditLog.create({ data: { userId: row.userId, action: "password_reset", detail: "Password changed from a reset token." } });
    return NextResponse.json({ ok: true });
  }
  if (key === "POST auth/password") {
    const gate = await actor();
    if (!gate.user) return gate.error;
    const input = z.object({ current: z.string().min(1), next: z.string().min(8).max(100) }).safeParse(await body(req));
    if (!input.success) return fail("Enter the current password and a new password of at least 8 characters.");
    const row = await prisma.user.findUnique({ where: { id: gate.user.id } });
    if (!row || !(await bcrypt.compare(input.data.current, row.passwordHash))) return fail("The current password is incorrect.", 401);
    await prisma.user.update({ where: { id: row.id }, data: { passwordHash: await bcrypt.hash(input.data.next, 10) } });
    await prisma.auditLog.create({ data: { userId: row.id, action: "password_changed", detail: "Password changed while signed in." } });
    return NextResponse.json({ ok: true });
  }
  if (key === "GET auth/me") {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  }

  const gate = await actor();
  if (!gate.user) return gate.error;
  const user = gate.user;

  if (key === "GET health") {
    await tickUser(user.id);
    const brokers = await prisma.brokerConnection.findMany({ where: { userId: user.id } });
    const live = brokers.find((broker) => broker.broker !== "paper" && broker.status === "connected");
    const sources = [...runtimeState.sources];
    return NextResponse.json({
      api: "ok",
      marketData: {
        status: sources.includes("binance-public") && sources.includes("simulated") ? "mixed" : sources.includes("binance-public") ? "binance-public" : "simulated",
        detail: sources.includes("binance-public")
          ? "Crypto may use Binance public klines. FX, metals, and equities use the simulated tape unless a vendor is added."
          : "Simulated tape. No market-data vendor is configured for this session.",
      },
      stream: { status: "polling", detail: "The terminal polls HTTPS about every 4 seconds. A websocket server is not running." },
      strategyEngine: {
        status: runtimeState.lastEngineError ? "error" : runtimeState.lastEngineAt ? "ok" : "idle",
        lastRunAt: runtimeState.lastEngineAt,
        detail: runtimeState.lastEngineError || (runtimeState.lastEngineAt ? "Last evaluation completed." : "The engine has not run yet in this process."),
      },
      broker: live
        ? { status: "connected", detail: `${live.broker} is connected in ${live.environment}.` }
        : { status: "paper", detail: "Paper desk only. No live broker is connected." },
    });
  }
  if (key === "GET dashboard") {
    const symbol = req.nextUrl.searchParams.get("symbol") || user.prefs.defaultSymbol;
    const timeframe = req.nextUrl.searchParams.get("timeframe") || user.prefs.chartTimeframe;
    return NextResponse.json(await dashboardPayload(user, symbol, timeframe));
  }
  if (key === "GET calendar") {
    return NextResponse.json({
      configured: false,
      events: [],
      message: process.env.CALENDAR_PROVIDER
        ? `CALENDAR_PROVIDER is set to ${process.env.CALENDAR_PROVIDER}, but no adapter for it is implemented. No events are shown.`
        : "No economic calendar provider is configured. Strategies are not pausing around news.",
    });
  }
  if (key === "GET notifications") {
    const alerts = await prisma.alert.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 });
    return NextResponse.json({ alerts });
  }
  if (key === "POST notifications/read") {
    await prisma.alert.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }
  if (key === "POST watchlist") {
    const input = z.object({ symbol: z.string() }).safeParse(await body(req));
    if (!input.success || !isInstrument(input.data.symbol)) return fail("Unknown symbol.");
    const count = await prisma.watchItem.count({ where: { userId: user.id } });
    await prisma.watchItem.upsert({
      where: { userId_symbol: { userId: user.id, symbol: input.data.symbol } },
      create: { userId: user.id, symbol: input.data.symbol, sort: count },
      update: {},
    });
    return NextResponse.json({ ok: true });
  }
  if (key === "DELETE watchlist") {
    const symbol = req.nextUrl.searchParams.get("symbol") || "";
    await prisma.watchItem.deleteMany({ where: { userId: user.id, symbol } });
    return NextResponse.json({ ok: true });
  }
  if (key === "GET strategies") {
    const rows = await prisma.strategyConfig.findMany({ where: { userId: user.id } });
    const signals = await prisma.signal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 40 });
    const tests = await prisma.backtestRun.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
    return NextResponse.json({
      strategies: STRATEGIES.map((strategy) => {
        const row = rows.find((item) => item.strategyId === strategy.id);
        return {
          id: strategy.id,
          name: strategy.name,
          summary: strategy.summary,
          disclaimer: strategy.disclaimer,
          enabled: row?.enabled ?? false,
          symbols: parseJson<string[]>(row?.symbols ?? "[]", []),
          timeframe: row?.timeframe ?? "5m",
          params: { ...strategy.defaults, ...parseJson(row?.params ?? "{}", {}) },
          alerts: row?.alerts ?? false,
          paperAuto: row?.paperAuto ?? false,
          liveAuto: row?.liveAuto ?? false,
          recent: signals.filter((signal) => signal.strategyId === strategy.id).slice(0, 4).map(serializeSignal),
          backtest: tests.find((test) => test.strategyId === strategy.id) ? parseJson(tests.find((test) => test.strategyId === strategy.id)!.results, {}) : null,
        };
      }),
    });
  }
  if (key === "PATCH strategies") {
    const input = z.object({
      strategyId: z.string(),
      enabled: z.boolean().optional(),
      symbols: z.array(z.string()).optional(),
      timeframe: z.string().optional(),
      params: z.record(z.unknown()).optional(),
      alerts: z.boolean().optional(),
      paperAuto: z.boolean().optional(),
      liveAuto: z.boolean().optional(),
      confirmation: z.string().optional(),
    }).safeParse(await body(req));
    if (!input.success || !getStrategy(input.data.strategyId)) return fail("Unknown strategy.");
    if (input.data.alerts && !planAllows(user.plan, "alerts")) return fail("Realtime alerts require the Trader plan.", 403);
    if (input.data.paperAuto && !planAllows(user.plan, "paperAuto")) return fail("Paper automation requires the Trader plan.", 403);
    if (input.data.liveAuto) {
      if (!planAllows(user.plan, "liveAuto")) return fail("Live automation requires the Pro plan.", 403);
      if (input.data.confirmation !== "ENABLE LIVE") return fail("Type ENABLE LIVE to arm live automation. It was not turned on.");
      await prisma.user.update({ where: { id: user.id }, data: { liveArmed: true } });
    }
    const symbols = input.data.symbols?.filter(isInstrument);
    await prisma.strategyConfig.update({
      where: { userId_strategyId: { userId: user.id, strategyId: input.data.strategyId } },
      data: {
        enabled: input.data.enabled,
        symbols: symbols ? JSON.stringify(symbols) : undefined,
        timeframe: input.data.timeframe,
        params: input.data.params ? JSON.stringify(input.data.params) : undefined,
        alerts: input.data.alerts,
        paperAuto: input.data.paperAuto,
        liveAuto: input.data.liveAuto,
      },
    });
    await prisma.auditLog.create({ data: { userId: user.id, action: "strategy_changed", detail: `${input.data.strategyId} settings updated.` } });
    return NextResponse.json({ ok: true });
  }
  if (key === "GET signals") {
    const strategy = req.nextUrl.searchParams.get("strategy") || "";
    const symbol = req.nextUrl.searchParams.get("symbol") || "";
    const side = req.nextUrl.searchParams.get("side") || "";
    const status = req.nextUrl.searchParams.get("status") || "";
    const rows = await prisma.signal.findMany({
      where: {
        userId: user.id,
        ...(strategy ? { strategyId: strategy } : {}),
        ...(symbol ? { symbol } : {}),
        ...(side ? { side } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const visible = rows.filter((signal) => planAllows(user.plan, "realtimeSignals") || Date.now() - signal.createdAt.getTime() >= 15 * 60 * 1000);
    return NextResponse.json({ signals: visible.map(serializeSignal), delayed: !planAllows(user.plan, "realtimeSignals") });
  }
  if (method === "GET" && path[0] === "signals" && path[1]) {
    const signal = await prisma.signal.findFirst({ where: { id: path[1], userId: user.id } });
    if (!signal) return fail("Signal not found.", 404);
    if (!planAllows(user.plan, "realtimeSignals") && Date.now() - signal.createdAt.getTime() < 15 * 60 * 1000) {
      return fail("This signal is still inside the Free plan delay.", 403);
    }
    return NextResponse.json({ signal: serializeSignal(signal) });
  }
  if (key === "POST orders") {
    const input = z.object({
      symbol: z.string(),
      side: z.enum(["buy", "sell"]),
      type: z.enum(["market", "limit", "stop"]),
      qty: z.number().positive(),
      limitPrice: z.number().positive().nullable().optional(),
      stopPrice: z.number().positive().nullable().optional(),
      stopLoss: z.number().positive().nullable().optional(),
      takeProfit: z.number().positive().nullable().optional(),
    }).safeParse(await body(req));
    if (!input.success) return fail("Check the order ticket. Quantity and prices must be positive numbers.");
    const result = await placeOrderForUser(user, input.data);
    if (!result.ok) return fail(result.error, 422);
    return NextResponse.json(result);
  }
  if (method === "POST" && path[0] === "orders" && path[2] === "cancel") {
    const order = await prisma.order.findFirst({ where: { id: path[1], userId: user.id } });
    if (!order) return fail("Order not found.", 404);
    if (order.mode === "live") return fail("Cancelling a live broker order is not available until that adapter confirms it. This order was not changed.", 422);
    const result = await cancelPaperOrder(user.id, order.id);
    if (!result.ok) return fail(result.error, 422);
    return NextResponse.json(result);
  }
  if (key === "GET positions" || key === "GET orders" || key === "GET history") {
    await tickUser(user.id);
    const ledger = await loadLedger(user.id);
    if (key === "GET positions") return NextResponse.json({ positions: ledger.positions, mode: user.executionMode });
    if (key === "GET orders") return NextResponse.json({ orders: ledger.orders });
    const stats = performanceStats(ledger.startBalance, ledger.trades, user.timezone);
    return NextResponse.json({ trades: ledger.trades, stats, mode: "paper" });
  }
  if (method === "POST" && path[0] === "positions" && path[1] === "close-all") {
    if (user.executionMode === "live") return fail("Close-all in live mode is disabled. Close live positions from the broker after a sync. No request was sent.", 422);
    const result = await closeAllPaper(user.id);
    if (!result.ok) return fail(result.error, 422);
    return NextResponse.json(result);
  }
  if (method === "POST" && path[0] === "positions" && path[2] === "close") {
    if (user.executionMode === "live") return fail("This terminal does not close a live position unless a connected adapter accepts it. Switch to paper or sync the broker. Nothing was closed.", 422);
    const input = z.object({ qty: z.number().positive().nullable().optional() }).safeParse(await body(req));
    const result = await closePaperPosition(user.id, path[1], input.success ? input.data.qty ?? null : null);
    if (!result.ok) return fail(result.error, 422);
    return NextResponse.json(result);
  }
  if (method === "PATCH" && path[0] === "positions" && path[1]) {
    const input = z.object({ stop: z.number().positive().nullable().optional(), target: z.number().positive().nullable().optional() }).safeParse(await body(req));
    if (!input.success) return fail("Stop and target must be positive numbers.");
    const result = await moveProtection(user.id, path[1], { stop: input.data.stop, target: input.data.target });
    if (!result.ok) return fail(result.error, 422);
    return NextResponse.json(result);
  }
  if (key === "GET analytics") {
    const result = await analyticsFor(user);
    if (!result.ok) return fail(result.error, result.status);
    return NextResponse.json(result);
  }
  if (key === "GET backtest") {
    if (!planAllows(user.plan, "backtest")) return fail("Backtesting requires the Trader plan.", 403);
    const runs = await prisma.backtestRun.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
    return NextResponse.json({
      runs: runs.map((run) => ({ ...run, results: parseJson(run.results, {}), equity: parseJson(run.equity, []), createdAt: run.createdAt.toISOString() })),
    });
  }
  if (key === "POST backtest") {
    const input = z.object({
      strategyId: z.string(),
      symbol: z.string(),
      timeframe: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      starting: z.number().positive(),
    }).safeParse(await body(req));
    if (!input.success) return fail("Strategy, symbol, dates, and starting balance are required.");
    const result = await runUserBacktest(user, input.data);
    if (!result.ok) return fail(result.error, result.status ?? 422);
    return NextResponse.json(result);
  }
  if (key === "GET brokers") return NextResponse.json({ brokers: await listBrokers(user.id), catalog: true });
  if (key === "POST brokers/connect") {
    const input = z.object({ broker: z.string(), values: z.record(z.string()).optional() }).safeParse(await body(req));
    if (!input.success) return fail("Broker id is required.");
    const result = await connectBroker(user, input.data.broker, input.data.values ?? {});
    if (!result.ok) return fail(result.error, 422);
    return NextResponse.json(result);
  }
  if (method === "POST" && path[0] === "brokers" && path[2] === "disconnect") {
    const result = await disconnectBroker(user.id, path[1]);
    if (!result.ok) return fail(result.error, 422);
    return NextResponse.json(result);
  }
  if (method === "POST" && path[0] === "brokers" && path[2] === "sync") {
    const result = await syncBroker(user.id, path[1]);
    if (!result.ok) return fail(result.error, 422);
    return NextResponse.json(result);
  }
  if (key === "GET automation") {
    const rows = await prisma.strategyConfig.findMany({ where: { userId: user.id } });
    return NextResponse.json({
      liveArmed: user.liveArmed,
      mode: user.executionMode,
      strategies: rows.map((row) => ({ strategyId: row.strategyId, name: getStrategy(row.strategyId)?.name ?? row.strategyId, alerts: row.alerts, paperAuto: row.paperAuto, liveAuto: row.liveAuto, enabled: row.enabled })),
    });
  }
  if (key === "POST automation/stop") {
    await prisma.user.update({ where: { id: user.id }, data: { liveArmed: false, executionMode: "paper" } });
    await prisma.strategyConfig.updateMany({ where: { userId: user.id }, data: { paperAuto: false, liveAuto: false } });
    await prisma.auditLog.create({ data: { userId: user.id, action: "automation_stopped", detail: "All paper and live automation was stopped. Mode is paper." } });
    return NextResponse.json({ ok: true });
  }
  if (key === "POST automation/arm") {
    const input = z.object({ confirmation: z.string() }).safeParse(await body(req));
    if (!input.success || input.data.confirmation !== "ENABLE LIVE") return fail("Type ENABLE LIVE to arm live routing. Nothing changed.");
    if (!planAllows(user.plan, "liveAuto")) return fail("Live automation requires the Pro plan.", 403);
    await prisma.user.update({ where: { id: user.id }, data: { liveArmed: true } });
    await prisma.auditLog.create({ data: { userId: user.id, action: "live_armed", detail: "Live routing was armed. Orders are still not sent until a strategy has live auto enabled and a broker is connected." } });
    return NextResponse.json({ ok: true });
  }
  if (key === "POST mode") {
    const input = z.object({ mode: z.enum(["paper", "live"]), confirmation: z.string().optional() }).safeParse(await body(req));
    if (!input.success) return fail("Mode must be paper or live.");
    if (input.data.mode === "live") {
      if (input.data.confirmation !== "ENABLE LIVE") return fail("Type ENABLE LIVE to leave paper mode. The mode was not changed.");
      if (!user.liveArmed) return fail("Arm live routing on the automation page first. The mode was not changed.");
      const connected = await prisma.brokerConnection.findFirst({ where: { userId: user.id, status: "connected", broker: { not: "paper" } } });
      if (!connected) return fail("No live broker is connected. The terminal stayed on paper. Nothing was routed.");
      await prisma.user.update({ where: { id: user.id }, data: { executionMode: "live" } });
      await prisma.auditLog.create({ data: { userId: user.id, action: "mode_live", detail: `Execution mode set to live via ${connected.broker}.` } });
      return NextResponse.json({ ok: true, mode: "live" });
    }
    await prisma.user.update({ where: { id: user.id }, data: { executionMode: "paper" } });
    await prisma.auditLog.create({ data: { userId: user.id, action: "mode_paper", detail: "Execution mode set to paper." } });
    return NextResponse.json({ ok: true, mode: "paper" });
  }
  if (key === "PATCH settings") {
    const input = z.object({
      name: z.string().min(2).max(80).optional(),
      timezone: z.string().min(3).max(80).optional(),
      defaultSymbol: z.string().optional(),
      chartTimeframe: z.string().optional(),
      showEma: z.boolean().optional(),
      showVolume: z.boolean().optional(),
      showSessions: z.boolean().optional(),
      showSignals: z.boolean().optional(),
      browserAlerts: z.boolean().optional(),
      emailAlerts: z.boolean().optional(),
      webhookUrl: z.string().optional(),
      clearWebhook: z.boolean().optional(),
      notifySignal: z.boolean().optional(),
      notifyEntry: z.boolean().optional(),
      notifyExit: z.boolean().optional(),
      notifyStop: z.boolean().optional(),
      notifyTarget: z.boolean().optional(),
      notifyBroker: z.boolean().optional(),
      notifyRisk: z.boolean().optional(),
    }).safeParse(await body(req));
    if (!input.success) return fail("Check the settings fields.");
    if (input.data.webhookUrl && !planAllows(user.plan, "webhooks")) return fail("Webhooks require the Pro plan.", 403);
    if (input.data.defaultSymbol && !isInstrument(input.data.defaultSymbol)) return fail("Unknown default symbol.");
    await prisma.user.update({
      where: { id: user.id },
      data: { name: input.data.name, timezone: input.data.timezone },
    });
    await prisma.preference.update({
      where: { userId: user.id },
      data: {
        defaultSymbol: input.data.defaultSymbol,
        chartTimeframe: input.data.chartTimeframe,
        showEma: input.data.showEma,
        showVolume: input.data.showVolume,
        showSessions: input.data.showSessions,
        showSignals: input.data.showSignals,
        browserAlerts: input.data.browserAlerts,
        emailAlerts: input.data.emailAlerts,
        webhookUrl: input.data.clearWebhook ? "" : input.data.webhookUrl,
        notifySignal: input.data.notifySignal,
        notifyEntry: input.data.notifyEntry,
        notifyExit: input.data.notifyExit,
        notifyStop: input.data.notifyStop,
        notifyTarget: input.data.notifyTarget,
        notifyBroker: input.data.notifyBroker,
        notifyRisk: input.data.notifyRisk,
      },
    });
    return NextResponse.json({ ok: true, email: process.env.SMTP_URL ? "configured" : "not_configured" });
  }
  if (key === "PATCH risk") {
    const input = z.object({
      riskPerTradePct: z.number().min(0.05).max(5),
      maxPositionNotional: z.number().positive(),
      maxDailyLoss: z.number().positive(),
      maxOpenPositions: z.number().int().min(1).max(20),
      maxSymbolNotional: z.number().positive(),
      maxConsecutiveLosses: z.number().int().min(1).max(20),
      killSwitch: z.boolean(),
      commissionBps: z.number().min(0).max(50),
      slippagePips: z.number().min(0).max(20),
    }).safeParse(await body(req));
    if (!input.success) return fail("Risk values are out of range.");
    await prisma.riskSettings.update({ where: { userId: user.id }, data: input.data });
    await prisma.auditLog.create({ data: { userId: user.id, action: "risk_changed", detail: input.data.killSwitch ? "Risk settings saved. Kill switch is on." : "Risk settings saved." } });
    return NextResponse.json({ ok: true });
  }
  if (key === "GET audit") {
    const rows = await prisma.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({ audits: rows });
  }
  if (key === "POST subscription") {
    const input = z.object({ plan: z.enum(["free", "trader", "pro"]) }).safeParse(await body(req));
    if (!input.success) return fail("Unknown plan.");
    if (process.env.DEMO_MODE === "true") {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { plan: input.data.plan, source: "demo", note: "Simulated plan change. Stripe was not charged." },
      });
      await prisma.auditLog.create({ data: { userId: user.id, action: "plan_changed", detail: `Simulated change to ${input.data.plan}.` } });
      return NextResponse.json({ ok: true, simulated: true, plan: input.data.plan });
    }
    const price = input.data.plan === "trader" ? process.env.STRIPE_PRICE_TRADER : input.data.plan === "pro" ? process.env.STRIPE_PRICE_PRO : "";
    if (!process.env.STRIPE_SECRET_KEY || !price) return fail("Stripe is not configured. The plan was not changed.", 501);
    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      success_url: `${req.nextUrl.origin}/settings?billing=success`,
      cancel_url: `${req.nextUrl.origin}/pricing?billing=cancel`,
      client_reference_id: user.id,
    });
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!response.ok) return fail("Stripe did not create a checkout session. The plan was not changed.", 502);
    const session = (await response.json()) as { url?: string };
    return NextResponse.json({ ok: true, url: session.url });
  }
  if (key === "GET plans") return NextResponse.json({ plans: Object.values(PLANS), instruments: INSTRUMENT_LIST.map((item) => item.symbol) });
  return fail("Not found.", 404);
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  try {
    return await dispatch("GET", req, ctx.params.path);
  } catch (error) {
    console.error(error);
    return fail("The request failed.", 500);
  }
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  try {
    return await dispatch("POST", req, ctx.params.path);
  } catch (error) {
    console.error(error);
    return fail("The request failed.", 500);
  }
}
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  try {
    return await dispatch("PATCH", req, ctx.params.path);
  } catch (error) {
    console.error(error);
    return fail("The request failed.", 500);
  }
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  try {
    return await dispatch("DELETE", req, ctx.params.path);
  } catch (error) {
    console.error(error);
    return fail("The request failed.", 500);
  }
}

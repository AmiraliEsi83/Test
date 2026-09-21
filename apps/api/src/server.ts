import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { z } from "zod";
import { prisma } from "./db.js";
import {
  audit,
  clearSessionCookie,
  currentUser,
  hashPassword,
  requirePlan,
  requireUser,
  setSessionCookie,
  signSession,
  verifyPassword,
} from "./auth.js";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto.js";
import {
  closePaper,
  defaultAutomation,
  getBook,
  getDesk,
  getForceLondon,
  marketStatus,
  placePaperOrder,
  setForceLondon,
  startRuntime,
  subscribeSse,
} from "./runtime.js";
import {
  BROKER_CATALOG,
  createBrokerAdapter,
  DEFAULT_RISK,
  DEFAULT_STRATEGY_CONFIGS,
  generateHistory,
  overlappingSessions,
  runBacktest,
  SESSION_DEFS,
  sessionStatus,
  STRATEGIES,
  analyticsFromTrades,
} from "@harsi/engine";
import {
  DEFAULT_WATCHLIST,
  INSTRUMENTS,
  INSTRUMENT_LIST,
  PLANS,
  formatPrice,
  hasPlan,
  pnlUsd,
  type PlanId,
  type StrategyId,
} from "@harsi/shared";
import { createHash, randomBytes } from "node:crypto";

const PORT = Number(process.env.PORT || 4000);
const DEMO = process.env.DEMO_MODE === "true";
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:3000";

async function ensureUserDefaults(userId: string) {
  await prisma.paperAccount.upsert({
    where: { userId },
    create: { userId, cash: 100000 },
    update: {},
  });
  await prisma.riskSettings.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_RISK },
    update: {},
  });
  await prisma.automationSettings.upsert({
    where: { userId },
    create: { userId, json: JSON.stringify(defaultAutomation()) },
    update: {},
  });
  const count = await prisma.watchlistItem.count({ where: { userId } });
  if (!count) {
    await prisma.watchlistItem.createMany({
      data: DEFAULT_WATCHLIST.map((symbol, sort) => ({ userId, symbol, sort })),
    });
  }
  for (const id of Object.keys(STRATEGIES) as StrategyId[]) {
    await prisma.strategyConfig.upsert({
      where: { userId_strategyId: { userId, strategyId: id } },
      create: {
        userId,
        strategyId: id,
        enabled: true,
        config: JSON.stringify(DEFAULT_STRATEGY_CONFIGS[id]),
      },
      update: {},
    });
  }
  const prefs = ["new_signal", "entry", "exit", "stop_reached", "target_reached", "broker_disconnected", "risk_limit_reached"];
  for (const event of prefs) {
    await prisma.alertPreference.upsert({
      where: { userId_event: { userId, event } },
      create: { userId, event, browser: true },
      update: {},
    });
  }
  await prisma.brokerConnection.upsert({
    where: { id: `${userId}-paper` },
    create: {
      id: `${userId}-paper`,
      userId,
      type: "paper",
      name: "HARSI Paper Desk",
      status: "connected",
      environment: "paper",
      accountId: "PAPER-8801",
      lastSync: new Date(),
    },
    update: {},
  });
}

function publicUser(user: { id: string; name: string; email: string; plan: string; timezone: string; defaultSymbol: string; demo: boolean; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    timezone: user.timezone,
    defaultSymbol: user.defaultSymbol,
    demo: user.demo,
    createdAt: user.createdAt,
    planMeta: PLANS[user.plan as PlanId] || PLANS.free,
  };
}

export async function buildServer() {
  const app = Fastify({ logger: false });
  await app.register(cors, {
    origin: [WEB_ORIGIN, "http://127.0.0.1:3000"],
    credentials: true,
  });
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    if (!body) return done(null, {});
    try {
      done(null, JSON.parse(String(body)));
    } catch (err) {
      done(err as Error, undefined);
    }
  });
  app.setErrorHandler((err, req, reply) => {
    const status = (err as { statusCode?: number }).statusCode || 400;
    reply.code(status >= 400 ? status : 400).send({ error: (err as Error).message || "Request failed" });
  });

  app.get("/api/health", async () => ({ ok: true, ...marketStatus() }));

  app.get("/api/meta", async () => ({
    demoMode: DEMO,
    demoAccounts: DEMO
      ? [
          { email: "trader@harsi.ai", password: "harsi123", plan: "trader", label: "DEMO" },
          { email: "pro@harsi.ai", password: "harsi123", plan: "pro", label: "DEMO" },
        ]
      : [],
    plans: PLANS,
    instruments: INSTRUMENT_LIST,
    strategies: Object.values(STRATEGIES).map((s) => ({
      id: s.id,
      name: s.name,
      badge: s.badge,
      summary: s.summary,
      rules: s.rules,
    })),
    brokers: BROKER_CATALOG,
    disclaimer:
      "HARSI outputs are research and trading signals, not financial advice and not a guarantee of profit. Paper fills are simulated. Live brokers stay NOT CONNECTED until valid server-side credentials succeed.",
  }));

  app.get("/api/sessions/clock", async () => {
    const now = new Date();
    return {
      now: now.toISOString(),
      sessions: SESSION_DEFS.map((d) => sessionStatus(d, now)),
      overlapping: overlappingSessions(now).map((s) => s.key),
    };
  });

  app.post("/api/auth/signup", async (req, reply) => {
    const body = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
      })
      .parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (exists) return reply.code(409).send({ error: "An account with that email already exists." });
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: body.email.toLowerCase(),
        passwordHash: await hashPassword(body.password),
        plan: "free",
      },
    });
    await ensureUserDefaults(user.id);
    await audit(user.id, "signup", "account created");
    const token = await signSession({ sub: user.id, email: user.email, plan: user.plan });
    setSessionCookie(reply, token);
    return { user: publicUser(user) };
  });

  app.post("/api/auth/login", async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: "Email or password is incorrect." });
    }
    await ensureUserDefaults(user.id);
    await audit(user.id, "login", "password login");
    const token = await signSession({ sub: user.id, email: user.email, plan: user.plan });
    setSessionCookie(reply, token);
    return { user: publicUser(user) };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    const user = await currentUser(req);
    if (user) await audit(user.id, "logout", "session cleared");
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.post("/api/auth/forgot", async (req, reply) => {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) return { ok: true };
    const token = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 1000 * 60 * 30) },
    });
    await audit(user.id, "password_reset_requested", "token issued");
    return {
      ok: true,
      demoToken: DEMO ? token : undefined,
      note: DEMO
        ? "DEMO_MODE: reset token returned in the API response instead of email."
        : "If that account exists, a reset email would be sent when SMTP_URL is configured.",
    };
  });

  app.post("/api/auth/reset", async (req, reply) => {
    const body = z.object({ token: z.string(), password: z.string().min(8) }).parse(req.body);
    const tokenHash = createHash("sha256").update(body.token).digest("hex");
    const row = await prisma.passwordReset.findFirst({
      where: { tokenHash, used: false, expiresAt: { gt: new Date() } },
    });
    if (!row) return reply.code(400).send({ error: "Invalid or expired token" });
    await prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(body.password) },
    });
    await prisma.passwordReset.update({ where: { id: row.id }, data: { used: true } });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    return { user: publicUser(user) };
  });

  app.post("/api/billing/subscribe", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = z.object({ plan: z.enum(["free", "trader", "pro"]) }).parse(req.body);
    if (process.env.STRIPE_SECRET_KEY && body.plan !== "free") {
      return {
        simulated: false,
        checkout: "stripe",
        note: "Stripe is configured. Create a Checkout Session with the server price IDs.",
      };
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data: { plan: body.plan } });
    await audit(user.id, "subscription_changed", `SIMULATED checkout → ${body.plan}`);
    const token = await signSession({ sub: updated.id, email: updated.email, plan: updated.plan });
    setSessionCookie(reply, token);
    return {
      user: publicUser(updated),
      simulated: true,
      label: "SIMULATED",
      note: "No Stripe keys are configured. Plan changed in DEMO/test mode only.",
    };
  });

  app.get("/api/dashboard", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const desk = await getDesk(user.id);
    const account = await desk.getAccount();
    const prices: Record<string, number> = {};
    for (const id of DEFAULT_WATCHLIST) prices[id] = getBook(id).lastPrice;
    const open = await prisma.position.findMany({ where: { userId: user.id, status: "open" } });
    const marked = open.map((p) => {
      const px = prices[p.symbol] ?? p.entry;
      return { ...p, mark: px, pnl: pnlUsd(p.symbol, p.side as "buy" | "sell", p.entry, px, p.lots) };
    });
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const today = await prisma.trade.aggregate({
      where: { userId: user.id, closedAt: { gte: startOfDay } },
      _sum: { pnl: true },
    });
    const realized = await prisma.trade.aggregate({ where: { userId: user.id }, _sum: { pnl: true } });
    const unreal = marked.reduce((s, p) => s + p.pnl, 0);
    const equity = account.cash + unreal;
    const peak = Math.max(100000, equity);
    return {
      mode: "paper",
      modeLabel: "PAPER",
      account: { ...account, environment: "paper" },
      equity,
      cash: account.cash,
      buyingPower: account.buyingPower,
      unrealizedPnl: unreal,
      realizedPnl: realized._sum.pnl || 0,
      todayPnl: today._sum.pnl || 0,
      totalReturn: (equity - 100000) / 100000,
      openRisk: marked.reduce((s, p) => s + Math.abs(p.lots), 0),
      drawdown: (peak - equity) / peak,
      positions: marked,
      prices,
      feeds: Object.fromEntries(DEFAULT_WATCHLIST.map((s) => [s, getBook(s).feed])),
      session: overlappingSessions(),
      status: marketStatus(),
    };
  });

  app.get("/api/market/:symbol", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const symbol = String((req.params as { symbol: string }).symbol).toUpperCase();
    if (!INSTRUMENTS[symbol]) return reply.code(404).send({ error: "Unknown instrument" });
    const book = getBook(symbol);
    const tf = String((req.query as { tf?: string }).tf || "1m");
    return {
      symbol,
      label: INSTRUMENTS[symbol].label,
      feed: book.feed,
      lastPrice: book.lastPrice,
      formatted: formatPrice(symbol, book.lastPrice),
      candles: book.candles,
      asian: book.asian,
      timeframe: tf,
    };
  });

  app.get("/api/stream", async (req, reply) => {
    const user = await currentUser(req);
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": WEB_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
    });
    reply.raw.write(`event: hello\ndata: ${JSON.stringify({ ok: true, user: user?.id || null })}\n\n`);
    const unsub = subscribeSse((chunk) => reply.raw.write(chunk));
    req.raw.on("close", unsub);
  });

  app.get("/api/watchlist", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const items = await prisma.watchlistItem.findMany({ where: { userId: user.id }, orderBy: { sort: "asc" } });
    return {
      items: items.map((i) => ({
        ...i,
        label: INSTRUMENTS[i.symbol]?.label || i.symbol,
        price: getBook(i.symbol).lastPrice,
        feed: getBook(i.symbol).feed,
      })),
    };
  });

  app.post("/api/watchlist", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = z.object({ symbol: z.string() }).parse(req.body);
    const symbol = body.symbol.toUpperCase();
    if (!INSTRUMENTS[symbol]) return reply.code(400).send({ error: "Unknown instrument" });
    await prisma.watchlistItem.upsert({
      where: { userId_symbol: { userId: user.id, symbol } },
      create: { userId: user.id, symbol },
      update: {},
    });
    return { ok: true };
  });

  app.delete("/api/watchlist/:symbol", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const symbol = String((req.params as { symbol: string }).symbol).toUpperCase();
    await prisma.watchlistItem.deleteMany({ where: { userId: user.id, symbol } });
    return { ok: true };
  });

  app.get("/api/strategies", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const rows = await prisma.strategyConfig.findMany({ where: { userId: user.id } });
    const recent = await prisma.signal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return {
      strategies: Object.values(STRATEGIES).map((s) => {
        const row = rows.find((r) => r.strategyId === s.id);
        return {
          ...s,
          defaultConfig: DEFAULT_STRATEGY_CONFIGS[s.id],
          enabled: row?.enabled ?? true,
          config: row ? JSON.parse(row.config) : DEFAULT_STRATEGY_CONFIGS[s.id],
          recent: recent.filter((x) => x.strategyId === s.id).slice(0, 5),
        };
      }),
    };
  });

  app.patch("/api/strategies/:id", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const id = String((req.params as { id: string }).id) as StrategyId;
    if (!STRATEGIES[id]) return reply.code(404).send({ error: "Unknown strategy" });
    const body = z.object({ enabled: z.boolean().optional(), config: z.record(z.any()).optional() }).parse(req.body);
    const existing = await prisma.strategyConfig.findUnique({
      where: { userId_strategyId: { userId: user.id, strategyId: id } },
    });
    const config = { ...(existing ? JSON.parse(existing.config) : DEFAULT_STRATEGY_CONFIGS[id]), ...(body.config || {}) };
    const row = await prisma.strategyConfig.upsert({
      where: { userId_strategyId: { userId: user.id, strategyId: id } },
      create: { userId: user.id, strategyId: id, enabled: body.enabled ?? true, config: JSON.stringify(config) },
      update: {
        enabled: body.enabled ?? existing?.enabled ?? true,
        config: JSON.stringify(config),
      },
    });
    await audit(user.id, "strategy_changed", `${id} enabled=${row.enabled}`);
    return { ok: true, enabled: row.enabled, config };
  });

  app.get("/api/signals", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const q = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = { userId: user.id };
    if (q.strategy) where.strategyId = q.strategy;
    if (q.symbol) where.symbol = q.symbol;
    if (q.side) where.side = q.side;
    if (q.status) where.status = q.status;
    const signals = await prisma.signal.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
    const delayed = !hasPlan(user.plan as PlanId, "trader");
    return {
      delayed,
      signals: signals.map((s) => ({
        ...s,
        conditions: JSON.parse(s.conditions),
        currentPrice: getBook(s.symbol).lastPrice,
        createdAt: delayed ? new Date(s.createdAt.getTime() - 15 * 60 * 1000) : s.createdAt,
      })),
    };
  });

  app.get("/api/signals/:id", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const id = String((req.params as { id: string }).id);
    const signal = await prisma.signal.findFirst({ where: { id, userId: user.id } });
    if (!signal) return reply.code(404).send({ error: "Not found" });
    return { ...signal, conditions: JSON.parse(signal.conditions), currentPrice: getBook(signal.symbol).lastPrice };
  });

  app.get("/api/alerts", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const alerts = await prisma.alert.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 80 });
    const prefs = await prisma.alertPreference.findMany({ where: { userId: user.id } });
    return { alerts, prefs };
  });

  app.post("/api/alerts/read", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    await prisma.alert.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return { ok: true };
  });

  app.put("/api/alerts/prefs", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = z
      .array(z.object({ event: z.string(), browser: z.boolean(), email: z.boolean(), webhook: z.boolean() }))
      .parse(req.body);
    for (const p of body) {
      await prisma.alertPreference.upsert({
        where: { userId_event: { userId: user.id, event: p.event } },
        create: { userId: user.id, ...p },
        update: { browser: p.browser, email: p.email, webhook: p.webhook },
      });
    }
    return { ok: true };
  });

  app.get("/api/orders", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200 });
    return { orders };
  });

  app.post("/api/orders", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = z
      .object({
        symbol: z.string(),
        side: z.enum(["buy", "sell"]),
        type: z.enum(["market", "limit", "stop"]),
        lots: z.number().positive(),
        price: z.number().optional(),
        stop: z.number().optional(),
        target: z.number().optional(),
        strategyId: z.string().optional(),
        mode: z.enum(["paper", "live"]).default("paper"),
      })
      .parse(req.body);
    if (body.mode === "live") {
      if (!hasPlan(user.plan as PlanId, "pro")) {
        return reply.code(403).send({ error: "Live execution requires Pro." });
      }
      const live = await prisma.brokerConnection.findFirst({
        where: { userId: user.id, status: "connected", type: { not: "paper" } },
      });
      if (!live) return reply.code(400).send({ error: "NOT CONNECTED: no live broker is configured." });
      return reply.code(400).send({
        error: "Live execution refused: adapter did not confirm a fill. HARSI never fakes live fills.",
      });
    }
    const risk = await prisma.riskSettings.findUnique({ where: { userId: user.id } });
    const desk = await getDesk(user.id);
    const { evaluateRisk } = await import("@harsi/engine");
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = await prisma.trade.aggregate({
      where: { userId: user.id, closedAt: { gte: startOfDay } },
      _sum: { pnl: true },
    });
    const decision = evaluateRisk(
      { symbol: body.symbol, side: body.side, lots: body.lots, type: body.type, mode: "paper" },
      risk || DEFAULT_RISK,
      {
        equity: desk.cash + desk.unrealized(),
        cash: desk.cash,
        realizedPnlToday: today._sum.pnl || 0,
        openPositions: desk.positions.map((p) => ({ symbol: p.symbol, lots: p.lots })),
        consecutiveLosses: 0,
        killSwitchActive: risk?.killSwitchActive || false,
      }
    );
    if (!decision.allowed) {
      await audit(user.id, "risk_blocked", decision.reason || "blocked");
      return reply.code(400).send({ error: decision.reason, blocked: true });
    }
    const order = await placePaperOrder(user.id, { ...body, lots: decision.sizedLots });
    return { order, label: "PAPER" };
  });

  app.post("/api/orders/:id/cancel", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const id = String((req.params as { id: string }).id);
    const desk = await getDesk(user.id);
    await desk.cancelOrder(id);
    await prisma.order.updateMany({ where: { id, userId: user.id }, data: { status: "cancelled" } });
    await audit(user.id, "order_cancelled", id);
    return { ok: true };
  });

  app.get("/api/positions", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const rows = await prisma.position.findMany({ where: { userId: user.id, status: "open" } });
    return {
      positions: rows.map((p) => {
        const px = getBook(p.symbol).lastPrice;
        return { ...p, mark: px, pnl: pnlUsd(p.symbol, p.side as "buy" | "sell", p.entry, px, p.lots), modeLabel: p.mode === "paper" ? "PAPER" : "LIVE" };
      }),
    };
  });

  app.post("/api/positions/:id/close", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const id = String((req.params as { id: string }).id);
    const body = z.object({ lots: z.number().optional() }).parse(req.body || {});
    await closePaper(user.id, id, body.lots);
    return { ok: true, label: "PAPER" };
  });

  app.patch("/api/positions/:id", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const id = String((req.params as { id: string }).id);
    const body = z.object({ stop: z.number().nullable().optional(), target: z.number().nullable().optional() }).parse(req.body);
    const desk = await getDesk(user.id);
    await desk.modifyPosition(id, body);
    await prisma.position.updateMany({ where: { id, userId: user.id }, data: { stop: body.stop ?? undefined, target: body.target ?? undefined } });
    return { ok: true };
  });

  app.get("/api/history", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const q = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = { userId: user.id };
    if (q.symbol) where.symbol = q.symbol;
    if (q.mode) where.mode = q.mode;
    if (q.strategy) where.strategyId = q.strategy;
    const trades = await prisma.trade.findMany({ where, orderBy: { closedAt: "desc" }, take: 300 });
    return { trades };
  });

  app.get("/api/analytics", async (req, reply) => {
    const user = await requirePlan(req, reply, "trader");
    if (!user) return;
    const trades = await prisma.trade.findMany({ where: { userId: user.id }, orderBy: { closedAt: "asc" } });
    const paper = trades.filter((t) => t.mode === "paper");
    const live = trades.filter((t) => t.mode === "live");
    let eq = 100000;
    const curve = paper.map((t) => {
      eq += t.pnl;
      return { t: t.closedAt.getTime(), v: eq };
    });
    return {
      source: "PAPER unless noted",
      paper: analyticsFromTrades(
        paper.map((t) => ({
          pnl: t.pnl,
          side: t.side as "buy" | "sell",
          symbol: t.symbol,
          strategy: t.strategyId,
          openedAt: t.openedAt.getTime(),
          closedAt: t.closedAt.getTime(),
          mode: t.mode,
        })),
        curve
      ),
      live: analyticsFromTrades(
        live.map((t) => ({
          pnl: t.pnl,
          side: t.side as "buy" | "sell",
          symbol: t.symbol,
          strategy: t.strategyId,
          openedAt: t.openedAt.getTime(),
          closedAt: t.closedAt.getTime(),
          mode: t.mode,
        }))
      ),
      equity: curve,
    };
  });

  app.post("/api/backtest", async (req, reply) => {
    const user = await requirePlan(req, reply, "trader");
    if (!user) return;
    const body = z
      .object({
        strategyId: z.enum(["london-harsi", "pulse-confluence", "breakout-trend"]),
        symbol: z.string(),
        timeframe: z.string().default("5m"),
        start: z.string(),
        end: z.string(),
        startingBalance: z.number().default(100000),
        lots: z.number().default(0.1),
      })
      .parse(req.body);
    const hist = generateHistory(body.symbol, 900, new Date(body.end).getTime());
    const result = runBacktest(hist.candles, {
      strategyId: body.strategyId,
      symbol: body.symbol,
      timeframe: body.timeframe,
      start: new Date(body.start).getTime(),
      end: new Date(body.end).getTime(),
      startingBalance: body.startingBalance,
      lots: body.lots,
    });
    const saved = await prisma.backtestRun.create({
      data: {
        userId: user.id,
        strategyId: body.strategyId,
        symbol: body.symbol,
        timeframe: body.timeframe,
        params: JSON.stringify(body),
        result: JSON.stringify(result),
      },
    });
    return { id: saved.id, ...result, feed: "SIMULATED", note: "Backtest uses simulated candles and bar-close evaluation to avoid look-ahead." };
  });

  app.get("/api/backtests", async (req, reply) => {
    const user = await requirePlan(req, reply, "trader");
    if (!user) return;
    const runs = await prisma.backtestRun.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
    return { runs: runs.map((r) => ({ ...r, params: JSON.parse(r.params), result: JSON.parse(r.result) })) };
  });

  app.get("/api/brokers", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const rows = await prisma.brokerConnection.findMany({ where: { userId: user.id } });
    return {
      catalog: BROKER_CATALOG,
      connections: rows.map((r) => ({
        ...r,
        secretEnc: undefined,
        secretMasked: r.secretEnc ? maskSecret("configured-secret") : "",
      })),
    };
  });

  app.post("/api/brokers", async (req, reply) => {
    const user = await requirePlan(req, reply, "pro");
    if (!user) return;
    const body = z.object({ type: z.string(), credentials: z.record(z.string()) }).parse(req.body);
    const spec = BROKER_CATALOG.find((b) => b.type === body.type);
    if (!spec) return reply.code(400).send({ error: "Unknown broker" });
    if (!spec.implemented) {
      const row = await prisma.brokerConnection.create({
        data: {
          userId: user.id,
          type: body.type,
          name: spec.name,
          status: "not_configured",
          environment: "not_configured",
          error: `${spec.name} is a placeholder on this server. NOT CONNECTED.`,
        },
      });
      return { connection: row, status: "NOT CONNECTED" };
    }
    const adapter = createBrokerAdapter(body.type, body.credentials);
    try {
      await adapter.connect();
      const account = await adapter.getAccount();
      const row = await prisma.brokerConnection.create({
        data: {
          userId: user.id,
          type: body.type,
          name: spec.name,
          status: "connected",
          environment: account.environment,
          accountId: account.id,
          lastSync: new Date(),
          secretEnc: encryptSecret(JSON.stringify(body.credentials)),
          error: null,
        },
      });
      await audit(user.id, "broker_connected", spec.name);
      return { connection: { ...row, secretEnc: undefined }, account };
    } catch (e) {
      const row = await prisma.brokerConnection.create({
        data: {
          userId: user.id,
          type: body.type,
          name: spec.name,
          status: "not_configured",
          environment: "not_configured",
          error: String(e),
        },
      });
      return reply.code(400).send({ error: String(e), status: "NOT CONNECTED", connection: row });
    }
  });

  app.delete("/api/brokers/:id", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const id = String((req.params as { id: string }).id);
    const row = await prisma.brokerConnection.findFirst({ where: { id, userId: user.id } });
    if (!row) return reply.code(404).send({ error: "Not found" });
    if (row.type === "paper") return reply.code(400).send({ error: "Paper desk cannot be removed." });
    await prisma.brokerConnection.delete({ where: { id } });
    return { ok: true };
  });

  app.get("/api/automation", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const row = await prisma.automationSettings.findUnique({ where: { userId: user.id } });
    return { automation: row ? JSON.parse(row.json) : defaultAutomation(), liveLocked: !hasPlan(user.plan as PlanId, "pro") };
  });

  app.put("/api/automation", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = z.record(z.object({ alerts: z.boolean(), paper: z.boolean(), live: z.boolean() })).parse(req.body);
    for (const [k, v] of Object.entries(body)) {
      if (v.live) {
        if (!hasPlan(user.plan as PlanId, "pro")) {
          return reply.code(403).send({ error: "Live automation requires Pro." });
        }
        const confirm = (req.headers["x-harsi-live-confirm"] || "") as string;
        if (confirm !== "ENABLE_LIVE_AUTOMATION") {
          return reply.code(400).send({
            error: "Live automation needs explicit confirmation header X-Harsi-Live-Confirm: ENABLE_LIVE_AUTOMATION",
          });
        }
      }
      if (v.paper && !hasPlan(user.plan as PlanId, "trader")) {
        return reply.code(403).send({ error: "Paper auto-execute requires Trader." });
      }
      void k;
    }
    await prisma.automationSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, json: JSON.stringify(body) },
      update: { json: JSON.stringify(body) },
    });
    await audit(user.id, "automation_enabled", JSON.stringify(body));
    return { ok: true };
  });

  app.post("/api/automation/stop", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const stopped = defaultAutomation();
    for (const k of Object.keys(stopped) as (keyof typeof stopped)[]) {
      stopped[k] = { alerts: true, paper: false, live: false };
    }
    await prisma.automationSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, json: JSON.stringify(stopped) },
      update: { json: JSON.stringify(stopped) },
    });
    await prisma.riskSettings.updateMany({ where: { userId: user.id }, data: { killSwitchActive: true } });
    await audit(user.id, "automation_stopped", "STOP ALL AUTOMATION");
    return { ok: true, automation: stopped };
  });

  app.get("/api/risk", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const row = await prisma.riskSettings.findUnique({ where: { userId: user.id } });
    return { risk: row || DEFAULT_RISK };
  });

  app.put("/api/risk", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = z
      .object({
        riskPerTradePct: z.number(),
        maxPositionLots: z.number(),
        maxDailyLoss: z.number(),
        maxOpenPositions: z.number(),
        maxExposureByAsset: z.number(),
        stopAfterConsecutiveLosses: z.number(),
        dailyKillSwitch: z.boolean(),
        killSwitchActive: z.boolean().optional(),
      })
      .parse(req.body);
    const row = await prisma.riskSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...body },
      update: body,
    });
    return { risk: row };
  });

  app.get("/api/settings", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    return {
      profile: publicUser(user),
      chartPrefs: JSON.parse(user.chartPrefs || "{}"),
      forceLondonWindow: getForceLondon(user.id),
    };
  });

  app.put("/api/settings", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = z
      .object({
        name: z.string().optional(),
        timezone: z.string().optional(),
        defaultSymbol: z.string().optional(),
        chartPrefs: z.record(z.any()).optional(),
        forceLondonWindow: z.boolean().optional(),
      })
      .parse(req.body);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name ?? user.name,
        timezone: body.timezone ?? user.timezone,
        defaultSymbol: body.defaultSymbol ?? user.defaultSymbol,
        chartPrefs: body.chartPrefs ? JSON.stringify(body.chartPrefs) : user.chartPrefs,
      },
    });
    if (body.forceLondonWindow != null) setForceLondon(user.id, body.forceLondonWindow);
    return { profile: publicUser(updated) };
  });

  app.get("/api/activity", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const logs = await prisma.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
    return { logs };
  });

  app.get("/api/status", async () => marketStatus());

  app.get("/api/calendar", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    if (!process.env.FINNHUB_API_KEY) {
      return {
        configured: false,
        events: [],
        note: "Economic calendar provider is not configured. Events are not fabricated.",
      };
    }
    const from = new Date().toISOString().slice(0, 10);
    const to = from;
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
    );
    if (!res.ok) return { configured: true, events: [], error: `provider ${res.status}` };
    const data = await res.json();
    return { configured: true, events: data.economicCalendar || data };
  });

  return app;
}

async function main() {
  await startRuntime();
  const app = await buildServer();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`HARSI API http://localhost:${PORT}`);
}

if (!process.env.VITEST) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

void decryptSecret;

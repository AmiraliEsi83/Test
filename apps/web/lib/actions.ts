import { zonedParts, formatMoney, getInstrument, isInstrument, londonDayKey, parseJson, planAllows, overlappingSessions, sessionStates, timeframeMinutes, TIMEFRAMES, type PlanId, type Side } from "@harsi/shared";
import { closedCandles, resample } from "@harsi/market-data";
import { getStrategy, mergeParams, STRATEGIES, type Check } from "@harsi/strategies";
import {
  accountSummary,
  assessRisk,
  cancelOrder,
  closePositionQty,
  consecutiveLosses,
  notionalUsd,
  onQuote,
  performanceStats,
  riskUsd,
  runBacktest,
  sizeForRisk,
  submitOrder,
  updateProtection,
  type Ledger,
} from "@harsi/trading-engine";
import { BROKER_CATALOG, createAlpacaAdapter, createIbkrAdapter, createMt5Adapter, createOandaAdapter, type BrokerCredentials } from "@harsi/broker-adapters";
import { prisma } from "./prisma";
import { decryptJson, encryptJson } from "./crypto";
import { costsFor, loadLedger, locked, saveLedger } from "./ledger";
import { loadSeries, quoteFor, runtimeState, type MarketSource } from "./market";
import type { PublicUser } from "./auth";

function dayKey(timeZone: string, time = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(time));
}

function realizedToday(ledger: Ledger, timeZone: string) {
  const today = dayKey(timeZone);
  return ledger.trades.reduce((sum, trade) => {
    return dayKey(timeZone, trade.closedAt) === today ? sum + trade.pnl - trade.commission : sum;
  }, 0);
}

async function audit(userId: string, action: string, detail: string) {
  await prisma.auditLog.create({ data: { userId, action, detail } });
}

async function notify(userId: string, kind: string, title: string, body: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { prefs: true, subscription: true } });
  if (!user?.prefs) return;
  const enabled: Record<string, boolean> = {
    signal: user.prefs.notifySignal,
    entry: user.prefs.notifyEntry,
    exit: user.prefs.notifyExit,
    stop: user.prefs.notifyStop,
    target: user.prefs.notifyTarget,
    broker: user.prefs.notifyBroker,
    risk: user.prefs.notifyRisk,
  };
  if (enabled[kind] === false) return;
  await prisma.alert.create({ data: { userId, kind, title, body } });
  if (user.prefs.webhookUrl && planAllows(user.subscription?.plan || "free", "webhooks")) {
    try {
      await fetch(user.prefs.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, body }),
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      await audit(userId, "webhook_failed", "A webhook notification could not be delivered.");
    }
  }
}

async function quotesFor(symbols: string[]) {
  const quotes: Record<string, ReturnType<typeof quoteFor>> = {};
  const sources = new Map<string, MarketSource>();
  for (const symbol of symbols) {
    const series = await loadSeries(symbol, "1m");
    quotes[symbol] = quoteFor(symbol, series.candles);
    sources.set(symbol, series.source);
  }
  return { quotes, sources };
}

export async function markPaper(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { risk: true, watchItems: true } });
  if (!user?.risk) return;
  const symbols = user.watchItems.map((item) => item.symbol);
  await locked(userId, async () => {
    const ledger = await loadLedger(userId);
    const known = new Set(ledger.trades.map((trade) => trade.id));
    const { quotes } = await quotesFor(symbols.length ? symbols : ["EURUSD"]);
    for (const symbol of Object.keys(quotes)) {
      onQuote(ledger, symbol, quotes[symbol], costsFor(symbol, user.risk!), Date.now());
    }
    await saveLedger(userId, ledger);
    for (const trade of ledger.trades) {
      if (known.has(trade.id)) continue;
      const net = trade.pnl - trade.commission;
      const kind = trade.reason === "stop" ? "stop" : trade.reason === "target" ? "target" : "exit";
      await notify(userId, kind, `${kind === "exit" ? "Position closed" : kind === "stop" ? "Stop reached" : "Target reached"} · ${trade.symbol}`, `${trade.side.toUpperCase()} ${trade.qty} closed at ${trade.exit}. Net ${formatMoney(net)}. Paper fill on the simulated or public quote in use.`);
      if (trade.strategyId) {
        const signal = await prisma.signal.findFirst({
          where: { userId, strategyId: trade.strategyId, symbol: trade.symbol, status: "open" },
          orderBy: { createdAt: "desc" },
        });
        if (signal) {
          await prisma.signal.update({
            where: { id: signal.id },
            data: { status: "closed", result: net >= 0 ? "win" : "loss", resultPnl: net, closedAt: new Date(trade.closedAt) },
          });
        }
      }
    }
  });
}

const lastTick = new Map<string, number>();

export async function tickUser(userId: string) {
  if (Date.now() - (lastTick.get(userId) ?? 0) < 4000) return;
  lastTick.set(userId, Date.now());
  try {
    await markPaper(userId);
    await runStrategies(userId);
    runtimeState.lastEngineAt = Date.now();
    runtimeState.lastEngineError = null;
  } catch (error) {
    runtimeState.lastEngineError = error instanceof Error ? error.message : "Strategy engine failed";
  }
}

async function runStrategies(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { strategies: true, subscription: true, risk: true },
  });
  if (!user?.risk || !user.subscription) return;
  for (const config of user.strategies) {
    if (!config.enabled) continue;
    const strategy = getStrategy(config.strategyId);
    if (!strategy) continue;
    const symbols = parseJson<string[]>(config.symbols, ["EURUSD"]).filter(isInstrument);
    const params = mergeParams(strategy, parseJson(config.params, {}));
    for (const symbol of symbols) {
      const base = await loadSeries(symbol, "1m");
      const minutes = timeframeMinutes(config.timeframe);
      const view = resample(base.candles, minutes);
      const closed = closedCandles(view, Date.now(), minutes * 60);
      const higher = resample(base.candles, minutes * 4);
      const closedHigher = closedCandles(higher, Date.now(), minutes * 4 * 60);
      const prior = await prisma.signal.findMany({
        where: { userId, strategyId: strategy.id, symbol },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const cooldown = Number(params.cooldownMinutes ?? 30) * 60000;
      const day = londonDayKey(new Date());
      const fired = {
        buy: prior.some((signal) => signal.side === "buy" && (strategy.id === "pulse-confluence" ? Date.now() - signal.createdAt.getTime() < cooldown : signal.dedupeKey.includes(day))),
        sell: prior.some((signal) => signal.side === "sell" && (strategy.id === "pulse-confluence" ? Date.now() - signal.createdAt.getTime() < cooldown : signal.dedupeKey.includes(day))),
      };
      const signalsToday = prior.filter((signal) => signal.dedupeKey.includes(day)).length;
      const evaluated = strategy.evaluate({
        symbol,
        timeframe: config.timeframe,
        candles: closed,
        higherCandles: closedHigher,
        now: new Date(),
        params,
        fired,
        signalsToday,
      });
      if (!evaluated.signal) continue;
      try {
        await prisma.signal.create({
          data: {
            userId,
            strategyId: strategy.id,
            symbol,
            timeframe: config.timeframe,
            side: evaluated.signal.side,
            entry: evaluated.signal.entry,
            stop: evaluated.signal.stop,
            target: evaluated.signal.target,
            priceAt: evaluated.signal.entry,
            dedupeKey: `${userId}:${evaluated.signal.dedupeKey}`,
            checks: JSON.stringify(evaluated.signal.checks),
            reasons: JSON.stringify(evaluated.signal.reasons),
            indicators: JSON.stringify(evaluated.signal.indicators),
            marketData: base.source,
          },
        });
      } catch (error) {
        if (typeof error === "object" && error && "code" in error && error.code === "P2002") continue;
        throw error;
      }
      await audit(userId, "signal", `${strategy.name} ${evaluated.signal.side.toUpperCase()} ${symbol}. Market data: ${base.source}.`);
      if (config.alerts && planAllows(user.subscription.plan, "alerts")) {
        await notify(userId, "signal", `${strategy.name} ${evaluated.signal.side.toUpperCase()} ${symbol}`, evaluated.signal.reasons[0] || "Strategy conditions passed.");
      }
      if (config.paperAuto) {
        if (!planAllows(user.subscription.plan, "paperAuto")) {
          await audit(userId, "risk_block", "Paper automation is not included on the current plan. No paper order was sent.");
        } else {
          const inst = getInstrument(symbol);
          const ledger = await loadLedger(userId);
          const quote = quoteFor(symbol, base.candles);
          const summary = accountSummary(ledger, { [symbol]: quote });
          const qty = sizeForRisk(inst, evaluated.signal.side, quote.mid, evaluated.signal.side === "buy" ? quote.mid - Math.abs(evaluated.signal.entry - evaluated.signal.stop) : quote.mid + Math.abs(evaluated.signal.entry - evaluated.signal.stop), summary.equity * (user.risk.riskPerTradePct / 100));
          await placePaperOrder(userId, {
            symbol,
            side: evaluated.signal.side,
            type: "market",
            qty,
            stopLoss: evaluated.signal.stop,
            takeProfit: evaluated.signal.target,
            strategyId: strategy.id,
            requireStop: true,
          });
        }
      }
      if (config.liveAuto) {
        if (!planAllows(user.subscription.plan, "liveAuto") || !user.liveArmed) {
          await audit(userId, "live_blocked", "Live automation is not armed. No live order was sent.");
        } else {
            const sent = await sendLiveOrder(userId, {
            symbol,
            side: evaluated.signal.side,
            type: "market",
            qty: 0,
            entry: evaluated.signal.entry,
            stopLoss: evaluated.signal.stop,
            takeProfit: evaluated.signal.target,
            strategyId: strategy.id,
            requireStop: true,
            autoSize: true,
          });
          await audit(userId, sent.ok ? "live_order" : "live_blocked", sent.ok ? "Live order request returned from the broker adapter." : sent.error);
        }
      }
    }
  }
}

export interface OrderInput {
  symbol: string;
  side: Side;
  type: "market" | "limit" | "stop";
  qty: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  strategyId?: string | null;
  requireStop?: boolean;
  autoSize?: boolean;
  entry?: number | null;
}

export async function placePaperOrder(userId: string, input: OrderInput) {
  if (!isInstrument(input.symbol)) return { ok: false as const, error: "Unknown symbol." };
  if (!(input.qty > 0)) return { ok: false as const, error: "Quantity must be greater than zero." };
  return locked(userId, async () => {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { risk: true } });
    if (!user?.risk) return { ok: false as const, error: "Risk settings are missing." };
    const ledger = await loadLedger(userId);
    const series = await loadSeries(input.symbol, "1m");
    const quote = quoteFor(input.symbol, series.candles);
    const inst = getInstrument(input.symbol);
    const reference = input.type === "limit" && input.limitPrice ? input.limitPrice : input.type === "stop" && input.stopPrice ? input.stopPrice : quote.mid;
    const summary = accountSummary(ledger, { [input.symbol]: quote });
    const hasStop = input.stopLoss != null && input.stopLoss > 0;
    const decision = assessRisk({
      settings: {
        riskPerTradePct: user.risk.riskPerTradePct,
        maxPositionNotional: user.risk.maxPositionNotional,
        maxDailyLoss: user.risk.maxDailyLoss,
        maxOpenPositions: user.risk.maxOpenPositions,
        maxSymbolNotional: user.risk.maxSymbolNotional,
        maxConsecutiveLosses: user.risk.maxConsecutiveLosses,
        killSwitch: user.risk.killSwitch,
      },
      equity: summary.equity,
      openPositions: ledger.positions.filter((position) => position.status === "open").map((position) => ({
        symbol: position.symbol,
        notional: notionalUsd(getInstrument(position.symbol), position.entry, position.qty),
      })),
      realizedNetToday: realizedToday(ledger, user.timezone),
      consecutiveLosses: consecutiveLosses(ledger.trades),
      requireStop: input.requireStop,
      order: {
        symbol: input.symbol,
        notional: notionalUsd(inst, reference, input.qty),
        riskAmount: hasStop ? riskUsd(inst, input.side, reference, input.stopLoss!, input.qty) : null,
        hasStop,
      },
    });
    if (!decision.ok) {
      await audit(userId, "risk_block", decision.message);
      if (input.requireStop) await notify(userId, "risk", "Risk manager blocked an order", decision.message);
      return { ok: false as const, error: decision.message, code: decision.code };
    }
    const submitted = submitOrder(
      ledger,
      { ...input, now: Date.now() },
      quote,
      costsFor(input.symbol, user.risk)
    );
    if (!submitted.error) onQuote(ledger, input.symbol, quote, costsFor(input.symbol, user.risk), Date.now());
    await saveLedger(userId, ledger);
    await audit(userId, "order_submitted", `${input.side.toUpperCase()} ${input.qty} ${input.symbol} ${input.type}. ${submitted.error ? submitted.error : submitted.order.status}. Market data: ${series.source}.`);
    if (submitted.order.status === "filled") {
      await notify(userId, "entry", `Paper entry ${input.symbol}`, `${input.side.toUpperCase()} ${input.qty} filled at ${submitted.order.avgPrice}. This is a paper fill.`);
    }
    if (submitted.error) return { ok: false as const, error: submitted.error };
    return { ok: true as const, order: submitted.order, marketData: series.source };
  });
}

export async function placeOrderForUser(user: PublicUser, input: OrderInput) {
  if (user.executionMode === "live") return sendLiveOrder(user.id, input);
  return placePaperOrder(user.id, input);
}

async function brokerAdapter(userId: string) {
  const connection = await prisma.brokerConnection.findFirst({
    where: { userId, status: "connected", broker: { not: "paper" } },
  });
  if (!connection) return { ok: false as const, error: "No live broker is connected. The order was not sent." };
  const creds = decryptJson<BrokerCredentials>(connection.secretBlob);
  if (!creds && connection.broker !== "ibkr") return { ok: false as const, error: "Stored broker credentials could not be read. The order was not sent." };
  const adapter =
    connection.broker === "oanda"
      ? createOandaAdapter(creds)
      : connection.broker === "alpaca"
        ? createAlpacaAdapter(creds)
        : connection.broker === "ibkr"
          ? createIbkrAdapter(creds)
          : connection.broker === "mt5"
            ? createMt5Adapter()
            : null;
  if (!adapter) return { ok: false as const, error: "That broker has no adapter. The order was not sent." };
  return { ok: true as const, adapter, connection };
}

export async function sendLiveOrder(userId: string, input: OrderInput) {
  const ready = await brokerAdapter(userId);
  if (!ready.ok) {
    await audit(userId, "live_blocked", ready.error);
    return ready;
  }
  const snapshot = parseJson<{ account?: { balance?: number | null } }>(ready.connection.snapshot, {});
  const balance = snapshot.account?.balance;
  if (balance == null || !Number.isFinite(balance)) {
    const error = "The broker balance is unknown. Sync the account before sending a live order. Nothing was sent.";
    await audit(userId, "live_blocked", error);
    return { ok: false as const, error };
  }
  const risk = await prisma.riskSettings.findUnique({ where: { userId } });
  const inst = getInstrument(input.symbol);
  let entry = input.entry && input.entry > 0 ? input.entry : input.limitPrice || input.stopPrice || 0;
  if (!(entry > 0)) {
    const series = await loadSeries(input.symbol, "1m");
    entry = quoteFor(input.symbol, series.candles).mid;
  }
  let qty = input.qty;
  if (input.autoSize) {
    if (!(entry > 0) || input.stopLoss == null) {
      const error = "Live automation needs an entry and a stop. No order was sent.";
      await audit(userId, "live_blocked", error);
      return { ok: false as const, error };
    }
    qty = sizeForRisk(inst, input.side, entry, input.stopLoss, balance * ((risk?.riskPerTradePct ?? 0.5) / 100));
    if (!(qty > 0)) {
      const error = "Live size rounded to zero under the risk limit. No order was sent.";
      await audit(userId, "live_blocked", error);
      return { ok: false as const, error };
    }
  }
  if (!(qty > 0) || !(entry > 0)) {
    const error = "Live order is missing a quantity or a reference price. Nothing was sent.";
    await audit(userId, "live_blocked", error);
    return { ok: false as const, error };
  }
  const decision = assessRisk({
    settings: {
      riskPerTradePct: risk?.riskPerTradePct ?? 0.5,
      maxPositionNotional: risk?.maxPositionNotional ?? 200000,
      maxDailyLoss: risk?.maxDailyLoss ?? 1500,
      maxOpenPositions: risk?.maxOpenPositions ?? 5,
      maxSymbolNotional: risk?.maxSymbolNotional ?? 150000,
      maxConsecutiveLosses: risk?.maxConsecutiveLosses ?? 4,
      killSwitch: risk?.killSwitch ?? false,
    },
    equity: balance,
    openPositions: [],
    realizedNetToday: 0,
    consecutiveLosses: 0,
    requireStop: Boolean(input.requireStop),
    order: {
      symbol: input.symbol,
      notional: notionalUsd(inst, entry, qty),
      riskAmount: input.stopLoss ? riskUsd(inst, input.side, entry, input.stopLoss, qty) : null,
      hasStop: input.stopLoss != null,
    },
  });
  if (!decision.ok) {
    await audit(userId, "risk_block", decision.message);
    return { ok: false as const, error: decision.message };
  }
  const orderInput = { ...input, qty };
  const result = await ready.adapter.placeOrder(orderInput);
  const id = `live_${Date.now()}`;
  await prisma.order.create({
    data: {
      id,
      userId,
      mode: "live",
      broker: ready.connection.broker,
      symbol: input.symbol,
      side: input.side,
      type: input.type,
      qty,
      limitPrice: input.limitPrice ?? null,
      stopPrice: input.stopPrice ?? null,
      stopLoss: input.stopLoss ?? null,
      takeProfit: input.takeProfit ?? null,
      status: result.ok ? result.data.status : "rejected",
      filledQty: result.ok && result.data.status === "filled" ? qty : 0,
      avgPrice: result.ok ? result.data.price : null,
      strategyId: input.strategyId ?? null,
      rejectReason: result.ok ? "" : result.message,
    },
  });
  if (!result.ok) {
    await audit(userId, "live_rejected", result.message);
    return { ok: false as const, error: result.message };
  }
  await audit(userId, "live_order", `${ready.connection.broker} accepted ${input.side} ${input.symbol}. Status: ${result.data.status}.`);
  return { ok: true as const, order: result.data, marketData: "broker" as const };
}

export async function closePaperPosition(userId: string, positionId: string, qty: number | null) {
  return locked(userId, async () => {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { risk: true } });
    if (!user?.risk) return { ok: false as const, error: "Risk settings are missing." };
    const ledger = await loadLedger(userId);
    const position = ledger.positions.find((item) => item.id === positionId && item.status === "open");
    if (!position) return { ok: false as const, error: "Open paper position not found." };
    const series = await loadSeries(position.symbol, "1m");
    const quote = quoteFor(position.symbol, series.candles);
    const slip = user.risk.slippagePips * getInstrument(position.symbol).pip;
    const fill = position.side === "buy" ? quote.bid - slip : quote.ask + slip;
    const closed = closePositionQty(ledger, positionId, qty, fill, costsFor(position.symbol, user.risk), Date.now(), qty ? "partial" : "manual");
    if (!closed.ok) return closed;
    await saveLedger(userId, ledger);
    const net = closed.trade.pnl - closed.trade.commission;
    await audit(userId, "position_closed", `${position.symbol} paper close. Net ${formatMoney(net)}.`);
    await notify(userId, "exit", `Paper close ${position.symbol}`, `Closed ${closed.trade.qty} at ${closed.trade.exit}. Net ${formatMoney(net)}.`);
    return { ok: true as const, trade: closed.trade, marketData: series.source };
  });
}

export async function moveProtection(userId: string, positionId: string, patch: { stop?: number | null; target?: number | null }) {
  return locked(userId, async () => {
    const ledger = await loadLedger(userId);
    const updated = updateProtection(ledger, positionId, patch);
    if (!updated.ok) return updated;
    await saveLedger(userId, ledger);
    await audit(userId, "protection_moved", `Updated stop or target on ${positionId}.`);
    return { ok: true as const };
  });
}

export async function cancelPaperOrder(userId: string, orderId: string) {
  return locked(userId, async () => {
    const ledger = await loadLedger(userId);
    const result = cancelOrder(ledger, orderId);
    if (!result.ok) return result;
    await saveLedger(userId, ledger);
    await audit(userId, "order_cancelled", `Cancelled paper order ${orderId}.`);
    return { ok: true as const };
  });
}

export async function closeAllPaper(userId: string) {
  const ledger = await loadLedger(userId);
  const open = ledger.positions.filter((position) => position.status === "open");
  for (const position of open) {
    const result = await closePaperPosition(userId, position.id, null);
    if (!result.ok) return result;
  }
  await audit(userId, "close_all", `Closed ${open.length} paper position(s).`);
  return { ok: true as const, closed: open.length };
}

function serializeSignal(signal: {
  id: string;
  strategyId: string;
  symbol: string;
  timeframe: string;
  side: string;
  status: string;
  entry: number;
  stop: number;
  target: number;
  priceAt: number;
  checks: string;
  reasons: string;
  indicators: string;
  marketData: string;
  result: string;
  resultPnl: number | null;
  createdAt: Date;
  closedAt: Date | null;
}) {
  const reward = Math.abs(signal.target - signal.entry);
  const risk = Math.abs(signal.entry - signal.stop);
  return {
    ...signal,
    createdAt: signal.createdAt.toISOString(),
    closedAt: signal.closedAt?.toISOString() ?? null,
    checks: parseJson<Check[]>(signal.checks, []),
    reasons: parseJson<string[]>(signal.reasons, []),
    indicators: parseJson<Record<string, number>>(signal.indicators, {}),
    riskReward: risk > 0 ? reward / risk : null,
    marketData: signal.marketData,
  };
}

export async function dashboardPayload(user: PublicUser, symbol: string, timeframe: string) {
  await tickUser(user.id);
  const chosen = isInstrument(symbol) ? symbol : user.prefs.defaultSymbol;
  const tf = TIMEFRAMES.some((item) => item.id === timeframe) ? timeframe : user.prefs.chartTimeframe;
  const [watch, ledger, signals, strategies, brokers] = await Promise.all([
    prisma.watchItem.findMany({ where: { userId: user.id }, orderBy: { sort: "asc" } }),
    loadLedger(user.id),
    prisma.signal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.strategyConfig.findMany({ where: { userId: user.id } }),
    prisma.brokerConnection.findMany({ where: { userId: user.id } }),
  ]);
  const symbols = watch.map((item) => item.symbol);
  const { quotes, sources } = await quotesFor(symbols.length ? symbols : [chosen]);
  const summary = accountSummary(ledger, quotes);
  const base = await loadSeries(chosen, "1m");
  const minutes = timeframeMinutes(tf);
  const candles = resample(base.candles, minutes).slice(-320);
  const closed = closedCandles(candles, Date.now(), minutes * 60);
  const higher = closedCandles(resample(base.candles, minutes * 4), Date.now(), minutes * 4 * 60);
  const evaluations = strategies.map((config) => {
    const strategy = getStrategy(config.strategyId);
    if (!strategy) return null;
    const params = mergeParams(strategy, parseJson(config.params, {}));
    const cooldown = Number(params.cooldownMinutes ?? 30) * 60000;
    const day = londonDayKey(new Date());
    const mine = signals.filter((signal) => signal.strategyId === strategy.id && signal.symbol === chosen);
    const result = strategy.evaluate({
      symbol: chosen,
      timeframe: tf,
      candles: closed,
      higherCandles: higher,
      now: new Date(),
      params,
      signalsToday: mine.filter((signal) => signal.dedupeKey.includes(day)).length,
      fired: {
        buy: mine.some((signal) => signal.side === "buy" && (strategy.id === "pulse-confluence" ? Date.now() - signal.createdAt.getTime() < cooldown : signal.dedupeKey.includes(day))),
        sell: mine.some((signal) => signal.side === "sell" && (strategy.id === "pulse-confluence" ? Date.now() - signal.createdAt.getTime() < cooldown : signal.dedupeKey.includes(day))),
      },
    });
    return { strategyId: strategy.id, name: strategy.name, enabled: config.enabled, checks: result.checks, snapshot: result.snapshot, signal: result.signal };
  }).filter(Boolean);
  const today = dayKey(user.timezone);
  const todayPnl = ledger.trades.reduce((sum, trade) => (dayKey(user.timezone, trade.closedAt) === today ? sum + trade.pnl - trade.commission : sum), 0);
  const stats = performanceStats(ledger.startBalance, ledger.trades, user.timezone);
  const openPositions = ledger.positions.filter((position) => position.status === "open").map((position) => {
    const quote = quotes[position.symbol] ?? quoteFor(position.symbol, candles);
    const mark = position.side === "buy" ? quote.bid : quote.ask;
    const pnl = position.side === "buy" ? (mark - position.entry) * position.qty : (position.entry - mark) * position.qty;
    return { ...position, mark, unrealized: getInstrument(position.symbol).quote === "JPY" ? pnl / (mark || position.entry) : pnl };
  });
  return {
    symbol: chosen,
    timeframe: tf,
    marketData: base.source,
    account: { ...summary, todayRealized: todayPnl, totalReturnPct: ledger.startBalance ? ((summary.equity - ledger.startBalance) / ledger.startBalance) * 100 : 0, maxDrawdown: stats.maxDrawdown },
    watch: symbols.map((item) => ({ symbol: item, quote: quotes[item] ?? null, source: sources.get(item) ?? "simulated" })),
    candles,
    evaluations,
    positions: openPositions,
    orders: ledger.orders.slice(-40).reverse(),
    signals: signals.map(serializeSignal).filter((signal) => user.plan !== "free" || Date.now() - new Date(signal.createdAt).getTime() >= 15 * 60 * 1000),
    sessions: sessionStates(new Date()),
    overlap: overlappingSessions(new Date()),
    clock: zonedParts(new Date(), user.timezone),
    london: zonedParts(new Date(), "Europe/London"),
    brokers: brokers.map(publicBroker),
    mode: user.executionMode,
  };
}

function publicBroker(broker: { id: string; broker: string; environment: string; status: string; accountLabel: string; lastSyncAt: Date | null; lastError: string; snapshot: string }) {
  return {
    id: broker.id,
    broker: broker.broker,
    environment: broker.environment,
    status: broker.status,
    accountLabel: broker.accountLabel,
    lastSyncAt: broker.lastSyncAt?.toISOString() ?? null,
    lastError: broker.lastError,
    snapshot: parseJson(broker.snapshot, null),
  };
}

export async function listBrokers(userId: string) {
  const rows = await prisma.brokerConnection.findMany({ where: { userId } });
  return BROKER_CATALOG.map((item) => {
    const row = rows.find((broker) => broker.broker === item.id);
    return {
      ...item,
      status: row?.status ?? (item.id === "paper" ? "not_configured" : "not_configured"),
      environment: row?.environment ?? "unknown",
      accountLabel: row?.accountLabel ?? "",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastError: row?.lastError ?? (item.kind === "placeholder" ? "Not connected. A desktop bridge is required." : ""),
      connectionId: row?.id ?? null,
      snapshot: row ? parseJson(row.snapshot, null) : null,
    };
  });
}

export async function connectBroker(user: PublicUser, broker: string, values: BrokerCredentials) {
  if (broker === "paper") {
    await prisma.brokerConnection.upsert({
      where: { userId_broker: { userId: user.id, broker: "paper" } },
      create: { userId: user.id, broker: "paper", environment: "paper", status: "connected", accountLabel: "Paper desk" },
      update: { status: "connected" },
    });
    await audit(user.id, "broker_connected", "Paper desk connected.");
    return { ok: true as const, status: "connected" };
  }
  if (!planAllows(user.plan, "brokers")) return { ok: false as const, error: "Broker connections require the Pro plan. Nothing was stored." };
  if (broker === "mt5") {
    await prisma.brokerConnection.upsert({
      where: { userId_broker: { userId: user.id, broker } },
      create: { userId: user.id, broker, status: "not_configured", environment: "unknown", lastError: "MetaTrader 5 needs a desktop bridge. Not connected." },
      update: { status: "not_configured", lastError: "MetaTrader 5 needs a desktop bridge. Not connected.", secretBlob: "" },
    });
    return { ok: false as const, error: "MetaTrader 5 is not connected. This server cannot open an MT5 session." };
  }
  const encrypted = encryptJson(values);
  if (!encrypted.ok) return { ok: false as const, error: encrypted.message };
  const adapter = broker === "oanda" ? createOandaAdapter(values) : broker === "alpaca" ? createAlpacaAdapter(values) : broker === "ibkr" ? createIbkrAdapter(values) : null;
  if (!adapter) return { ok: false as const, error: "Unknown broker. Nothing was stored." };
  const connected = await adapter.connect();
  const status = connected.ok ? "connected" : connected.code === "not_configured" ? "not_configured" : "error";
  await prisma.brokerConnection.upsert({
    where: { userId_broker: { userId: user.id, broker } },
    create: {
      userId: user.id,
      broker,
      environment: connected.ok ? connected.data.environment : values.environment || "unknown",
      status,
      accountLabel: connected.ok ? connected.data.account.id : "",
      lastError: connected.ok ? "" : connected.message,
      lastSyncAt: connected.ok ? new Date() : null,
      secretBlob: encrypted.blob,
      snapshot: connected.ok ? JSON.stringify({ account: connected.data.account }) : "",
    },
    update: {
      environment: connected.ok ? connected.data.environment : values.environment || "unknown",
      status,
      accountLabel: connected.ok ? connected.data.account.id : "",
      lastError: connected.ok ? "" : connected.message,
      lastSyncAt: connected.ok ? new Date() : null,
      secretBlob: encrypted.blob,
      snapshot: connected.ok ? JSON.stringify({ account: connected.data.account }) : "",
    },
  });
  await audit(user.id, connected.ok ? "broker_connected" : "broker_failed", connected.ok ? `${broker} connected in ${connected.data.environment}.` : connected.message);
  if (!connected.ok) return { ok: false as const, error: connected.message };
  return { ok: true as const, status: "connected" };
}

export async function disconnectBroker(userId: string, broker: string) {
  if (broker === "paper") return { ok: false as const, error: "The paper desk stays available." };
  await prisma.brokerConnection.updateMany({
    where: { userId, broker },
    data: { status: "disconnected", secretBlob: "", snapshot: "", lastError: "Disconnected. Stored credentials were deleted." },
  });
  await audit(userId, "broker_disconnected", `${broker} disconnected and stored credentials were deleted.`);
  return { ok: true as const };
}

export async function syncBroker(userId: string, broker: string) {
  const ready = await brokerAdapter(userId);
  if (!ready.ok || ready.connection.broker !== broker) return { ok: false as const, error: ready.ok ? "That broker is not the connected one." : ready.error };
  const [account, positions, orders] = await Promise.all([ready.adapter.getAccount(), ready.adapter.getPositions(), ready.adapter.getOrders()]);
  if (!account.ok) {
    await prisma.brokerConnection.update({ where: { id: ready.connection.id }, data: { status: "error", lastError: account.message, lastSyncAt: new Date() } });
    return { ok: false as const, error: account.message };
  }
  const snapshot = {
    account: account.data,
    positions: positions.ok ? positions.data : [],
    orders: orders.ok ? orders.data : [],
    positionError: positions.ok ? "" : positions.message,
    orderError: orders.ok ? "" : orders.message,
  };
  await prisma.brokerConnection.update({
    where: { id: ready.connection.id },
    data: { status: "connected", lastSyncAt: new Date(), lastError: "", accountLabel: account.data.id, snapshot: JSON.stringify(snapshot) },
  });
  return { ok: true as const, snapshot };
}

export async function analyticsFor(user: PublicUser) {
  if (!planAllows(user.plan, "analytics")) {
    return { ok: false as const, error: "Analytics require the Trader plan. No statistics were calculated for this request.", status: 403 };
  }
  const ledger = await loadLedger(user.id);
  const stats = performanceStats(ledger.startBalance, ledger.trades, user.timezone);
  return { ok: true as const, source: "paper" as const, stats, startBalance: ledger.startBalance };
}

export async function runUserBacktest(user: PublicUser, input: { strategyId: string; symbol: string; timeframe: string; startDate: string; endDate: string; starting: number }) {
  if (!planAllows(user.plan, "backtest")) return { ok: false as const, error: "Backtesting requires the Trader plan.", status: 403 };
  const strategy = getStrategy(input.strategyId);
  if (!strategy || !isInstrument(input.symbol)) return { ok: false as const, error: "Choose a known strategy and symbol." };
  const start = new Date(input.startDate).getTime();
  const end = new Date(input.endDate).getTime();
  if (!(end > start)) return { ok: false as const, error: "The end date must be after the start date." };
  const days = (end - start) / 86400000;
  if (days > 120) return { ok: false as const, error: "This build runs backtests up to 120 days so the simulated tape stays bounded." };
  const { getSimulatedCandles } = await import("@harsi/market-data");
  const minutes = timeframeMinutes(input.timeframe);
  const base = getSimulatedCandles(input.symbol, end, Math.ceil(days) + 3).filter((candle) => candle.time * 1000 >= start && candle.time * 1000 <= end);
  const candles = resample(base, minutes);
  const higher = resample(base, minutes * 4);
  const config = await prisma.strategyConfig.findUnique({ where: { userId_strategyId: { userId: user.id, strategyId: strategy.id } } });
  const params = mergeParams(strategy, parseJson(config?.params ?? "{}", {}));
  let day = "";
  let buy = false;
  let sell = false;
  let lastBuy = 0;
  let lastSell = 0;
  const cooldown = Number(params.cooldownMinutes ?? 30) * 60000;
  const riskRow = await prisma.riskSettings.findUnique({ where: { userId: user.id } });
  const result = runBacktest({
    symbol: input.symbol,
    candles,
    higherCandles: higher,
    starting: input.starting,
    warmup: Math.min(60, Math.floor(candles.length / 5)),
    risk: riskRow
      ? {
          riskPerTradePct: riskRow.riskPerTradePct,
          maxPositionNotional: riskRow.maxPositionNotional,
          maxDailyLoss: riskRow.maxDailyLoss,
          maxOpenPositions: riskRow.maxOpenPositions,
          maxSymbolNotional: riskRow.maxSymbolNotional,
          maxConsecutiveLosses: riskRow.maxConsecutiveLosses,
          killSwitch: false,
        }
      : undefined,
    costs: { commissionBps: riskRow?.commissionBps ?? 0.8, slippagePips: riskRow?.slippagePips ?? 0.2, spreadPips: getInstrument(input.symbol).spreadPips },
    evaluate: ({ candles: window, higher: higherWindow, bar }) => {
      const now = new Date(bar.time * 1000);
      const key = londonDayKey(now);
      if (key !== day) {
        day = key;
        buy = false;
        sell = false;
      }
      const evaluated = strategy.evaluate({
        symbol: input.symbol,
        timeframe: input.timeframe,
        candles: window,
        higherCandles: higherWindow,
        now,
        params,
        signalsToday: Number(buy) + Number(sell),
        fired: {
          buy: strategy.id === "pulse-confluence" ? now.getTime() - lastBuy < cooldown : buy,
          sell: strategy.id === "pulse-confluence" ? now.getTime() - lastSell < cooldown : sell,
        },
      });
      if (!evaluated.signal) return null;
      if (evaluated.signal.side === "buy") {
        buy = true;
        lastBuy = now.getTime();
      } else {
        sell = true;
        lastSell = now.getTime();
      }
      return { time: bar.time, side: evaluated.signal.side, entry: evaluated.signal.entry, stop: evaluated.signal.stop, target: evaluated.signal.target };
    },
  });
  const saved = await prisma.backtestRun.create({
    data: {
      userId: user.id,
      strategyId: strategy.id,
      symbol: input.symbol,
      timeframe: input.timeframe,
      startDate: input.startDate,
      endDate: input.endDate,
      starting: input.starting,
      params: JSON.stringify(params),
      results: JSON.stringify({ ...result.stats, equity: undefined, note: "SIMULATED market data. Closed bars only. Stops are assumed to fill before targets when both are touched in one bar." }),
      trades: JSON.stringify(result.ledger.trades.slice(0, 300)),
      equity: JSON.stringify(result.stats.equity.filter((_, index) => index % Math.ceil(result.stats.equity.length / 180) === 0)),
    },
  });
  await audit(user.id, "backtest", `Saved ${strategy.name} backtest on ${input.symbol}.`);
  return { ok: true as const, id: saved.id, stats: result.stats, trades: result.ledger.trades.slice(0, 300), marketData: "simulated" as const };
}

export { serializeSignal, publicBroker };

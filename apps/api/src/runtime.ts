import {
  DEFAULT_STRATEGY_CONFIGS,
  generateHistory,
  getSessionState,
  isHarsiWindow,
  nextTick,
  PaperBroker,
  PublicCryptoMarketData,
  SimulatedMarketData,
  STRATEGIES,
  upsertCandle,
  evaluateRisk,
  DEFAULT_RISK,
  type Candle,
} from "@harsi/engine";
import { INSTRUMENTS, DEFAULT_WATCHLIST, hasPlan, type PlanId, type StrategyId } from "@harsi/shared";
import { prisma } from "./db.js";
import { audit } from "./auth.js";

type Book = {
  candles: Candle[];
  asian: { high: number; low: number };
  lastPrice: number;
  feed: string;
};

const books = new Map<string, Book>();
const paperDesks = new Map<string, PaperBroker>();
const sseClients = new Set<(data: string) => void>();
const fired = new Map<string, Record<string, boolean | number>>();
let started = false;
let lastTick = 0;
let lastError: string | null = null;
const forceLondonByUser = new Map<string, boolean>();

export function marketStatus() {
  const age = lastTick ? Date.now() - lastTick : null;
  return {
    api: "ok",
    marketData: age != null && age < 8000 ? "ok" : lastTick ? "stale" : "starting",
    websocket: sseClients.size > 0 ? "ok" : "idle",
    strategyEngine: started ? "ok" : "stopped",
    lastTick,
    lastError,
    sseClients: sseClients.size,
  };
}

export function subscribeSse(fn: (data: string) => void) {
  sseClients.add(fn);
  return () => sseClients.delete(fn);
}

function broadcast(event: string, payload: unknown) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const fn of sseClients) fn(data);
}

export function getBook(symbol: string): Book {
  let book = books.get(symbol);
  if (!book) {
    const hist = generateHistory(symbol);
    book = { candles: hist.candles, asian: hist.asian, lastPrice: hist.lastPrice, feed: hist.feed };
    books.set(symbol, book);
  }
  return book;
}

export async function hydratePublicFeeds() {
  const crypto = new PublicCryptoMarketData();
  for (const id of Object.keys(INSTRUMENTS)) {
    const inst = INSTRUMENTS[id];
    if (inst.publicFeed === "binance") {
      try {
        const data = await crypto.candles(id);
        books.set(id, { candles: data.candles, asian: data.asian, lastPrice: data.lastPrice, feed: data.feed });
      } catch (e) {
        lastError = String(e);
        getBook(id);
      }
    } else {
      getBook(id);
    }
  }
}

export async function getDesk(userId: string): Promise<PaperBroker> {
  let desk = paperDesks.get(userId);
  if (desk) {
    for (const [sym, book] of books) desk.setPrice(sym, book.lastPrice);
    return desk;
  }
  const acct = await prisma.paperAccount.upsert({
    where: { userId },
    create: { userId, cash: 100000, realized: 0 },
    update: {},
  });
  desk = new PaperBroker(acct.cash);
  const positions = await prisma.position.findMany({ where: { userId, status: "open", mode: "paper" } });
  desk.positions = positions.map((p) => ({
    id: p.id,
    symbol: p.symbol,
    side: p.side as "buy" | "sell",
    lots: p.lots,
    entry: p.entry,
    stop: p.stop,
    target: p.target,
    openedAt: p.openedAt.getTime(),
  }));
  const pending = await prisma.order.findMany({ where: { userId, status: "pending", mode: "paper" } });
  desk.orders = pending.map((o) => ({
    id: o.id,
    symbol: o.symbol,
    side: o.side as "buy" | "sell",
    type: o.type as "market" | "limit" | "stop",
    lots: o.lots,
    price: o.price,
    status: "pending",
    createdAt: o.createdAt.getTime(),
  }));
  for (const [sym, book] of books) desk.setPrice(sym, book.lastPrice);
  paperDesks.set(userId, desk);
  return desk;
}

async function persistDesk(userId: string, desk: PaperBroker) {
  await prisma.paperAccount.upsert({
    where: { userId },
    create: { userId, cash: desk.cash, realized: 0 },
    update: { cash: desk.cash },
  });
}

export async function syncOpenPositions(userId: string, desk: PaperBroker) {
  const open = await prisma.position.findMany({ where: { userId, status: "open", mode: "paper" } });
  const ids = new Set(desk.positions.map((p) => p.id));
  for (const row of open) {
    if (!ids.has(row.id)) {
      await prisma.position.update({ where: { id: row.id }, data: { status: "closed" } });
    }
  }
}

function dayKey(userId: string, strategy: string) {
  const d = new Date();
  return `${userId}:${strategy}:${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

export async function evaluateUser(userId: string, plan: PlanId, symbol: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { strategies: true, automation: true, risk: true },
  });
  if (!user) return;
  const book = getBook(symbol);
  const desk = await getDesk(userId);
  desk.setPrice(symbol, book.lastPrice);
  const session = getSessionState(new Date(), forceLondonByUser.get(userId) || false);
  const auto = user.automation ? JSON.parse(user.automation.json) : defaultAutomation();
  const risk = user.risk
    ? {
        riskPerTradePct: user.risk.riskPerTradePct,
        maxPositionLots: user.risk.maxPositionLots,
        maxDailyLoss: user.risk.maxDailyLoss,
        maxOpenPositions: user.risk.maxOpenPositions,
        maxExposureByAsset: user.risk.maxExposureByAsset,
        stopAfterConsecutiveLosses: user.risk.stopAfterConsecutiveLosses,
        dailyKillSwitch: user.risk.dailyKillSwitch,
      }
    : DEFAULT_RISK;

  const closedTrades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { closedAt: "desc" },
    take: 12,
  });
  let consec = 0;
  for (const t of closedTrades) {
    if (t.pnl < 0) consec += 1;
    else break;
  }
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = await prisma.trade.aggregate({
    where: { userId, closedAt: { gte: startOfDay } },
    _sum: { pnl: true },
  });

  for (const strategyId of Object.keys(STRATEGIES) as StrategyId[]) {
    const row = user.strategies.find((s) => s.strategyId === strategyId);
    const config = {
      ...DEFAULT_STRATEGY_CONFIGS[strategyId],
      ...(row ? JSON.parse(row.config) : {}),
      enabled: row ? row.enabled : true,
    };
    const symbols = (config.symbols as string[]) || [symbol];
    if (!symbols.includes(symbol)) continue;
    if (config.enabled === false) continue;

    const fireKey = dayKey(userId, strategyId);
    const state = fired.get(fireKey) || { buy: false, sell: false, pulse: 0 };
    const evaled = STRATEGIES[strategyId].evaluate({
      symbol,
      timeframe: String(config.timeframe || "1m"),
      price: book.lastPrice,
      candles: book.candles,
      htfCandles: book.candles,
      asian: book.asian,
      now: new Date(),
      inHarsiWindow: session.inHarsiWindow,
      fired: state,
      config,
    });

    if (!evaled.signal) {
      fired.set(fireKey, state);
      continue;
    }
    if (evaled.signal.side === "buy") state.buy = true;
    if (evaled.signal.side === "sell") state.sell = true;
    if (strategyId !== "london-harsi") state.pulse = Date.now();
    fired.set(fireKey, state);

    const realtime = hasPlan(plan, "trader");
    const sig = await prisma.signal.create({
      data: {
        userId,
        strategyId,
        symbol,
        timeframe: evaled.signal.timeframe,
        side: evaled.signal.side,
        status: realtime ? "active" : "active",
        entry: evaled.signal.entry,
        stop: evaled.signal.stop,
        target: evaled.signal.target,
        slPips: evaled.signal.slPips,
        tpPips: evaled.signal.tpPips,
        riskReward: evaled.signal.riskReward,
        price: book.lastPrice,
        reason: evaled.signal.reason,
        conditions: JSON.stringify(evaled.signal.conditions),
      },
    });

    const allowAlert = hasPlan(plan, "trader");
    await prisma.alert.create({
      data: {
        userId,
        type: "new_signal",
        title: allowAlert
          ? `${strategyId} ${evaled.signal.side.toUpperCase()} · ${symbol}`
          : "Subscriber alert",
        message: allowAlert
          ? evaled.signal.reason
          : "Upgrade to Trader for realtime strategy alerts.",
        symbol,
        side: evaled.signal.side,
        strategyId,
        signalId: sig.id,
        locked: !allowAlert,
      },
    });
    broadcast("alert", { userId, strategyId, symbol, side: evaled.signal.side });

    const autoCfg = auto[strategyId] || { alerts: true, paper: false, live: false };
    if (autoCfg.paper && hasPlan(plan, "trader")) {
      const decision = evaluateRisk(
        { symbol, side: evaled.signal.side, lots: 0.1, type: "market", mode: "paper" },
        risk,
        {
          equity: desk.cash + desk.unrealized(),
          cash: desk.cash,
          realizedPnlToday: today._sum.pnl || 0,
          openPositions: desk.positions.map((p) => ({ symbol: p.symbol, lots: p.lots })),
          consecutiveLosses: consec,
          killSwitchActive: user.risk?.killSwitchActive || false,
        }
      );
      if (!decision.allowed) {
        await prisma.auditLog.create({
          data: { userId, action: "risk_blocked", detail: decision.reason || "blocked" },
        });
        await prisma.alert.create({
          data: {
            userId,
            type: "risk_limit_reached",
            title: "Risk manager blocked order",
            message: decision.reason || "blocked",
            symbol,
          },
        });
      } else {
        await placePaperOrder(userId, {
          symbol,
          side: evaled.signal.side,
          type: "market",
          lots: decision.sizedLots,
          stop: evaled.signal.stop,
          target: evaled.signal.target,
          strategyId,
        });
      }
    }
  }

  const stopped = desk.checkStops();
  for (const c of stopped) {
    await finalizeClose(userId, c.id, c.reason, c.exit, c.pnl);
  }
  desk.matchPending();
  await persistDesk(userId, desk);
}

export async function placePaperOrder(
  userId: string,
  req: {
    symbol: string;
    side: "buy" | "sell";
    type: "market" | "limit" | "stop";
    lots: number;
    price?: number;
    stop?: number;
    target?: number;
    strategyId?: string;
    note?: string;
  }
) {
  const desk = await getDesk(userId);
  const order = await desk.placeOrder(req);
  await prisma.order.create({
    data: {
      id: order.id,
      userId,
      brokerId: "paper",
      mode: "paper",
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      lots: order.lots,
      price: order.price,
      stop: req.stop,
      target: req.target,
      status: order.status,
      filledLots: order.filledLots || 0,
      averagePrice: order.averagePrice,
      strategyId: req.strategyId,
      reason: req.note || order.reason,
    },
  });
  if (order.status === "filled") {
    const pos = desk.positions[0];
    if (pos) {
      await prisma.position.create({
        data: {
          id: pos.id,
          userId,
          brokerId: "paper",
          mode: "paper",
          symbol: pos.symbol,
          side: pos.side,
          lots: pos.lots,
          entry: pos.entry,
          stop: pos.stop,
          target: pos.target,
          strategyId: req.strategyId,
          status: "open",
        },
      });
    }
    await prisma.alert.create({
      data: {
        userId,
        type: "entry",
        title: `PAPER ${order.side.toUpperCase()} ${order.symbol}`,
        message: `Filled ${order.averagePrice} · ${order.lots} lots`,
        symbol: order.symbol,
        side: order.side,
        strategyId: req.strategyId,
      },
    });
    await audit(userId, "order_submitted", `${order.side} ${order.symbol} ${order.lots} PAPER`);
  }
  await persistDesk(userId, desk);
  return order;
}

export async function closePaper(userId: string, positionId: string, lots?: number, reason = "Manual close") {
  const desk = await getDesk(userId);
  const pos = desk.positions.find((p) => p.id === positionId);
  if (!pos) throw new Error("Position not found");
  const px = desk.prices[pos.symbol] ?? pos.entry;
  await desk.closePosition(positionId, lots);
  const row = await prisma.position.findUnique({ where: { id: positionId } });
  if (row && (!lots || lots >= row.lots)) {
    await prisma.position.update({ where: { id: positionId }, data: { status: "closed" } });
  } else if (row && lots) {
    await prisma.position.update({ where: { id: positionId }, data: { lots: row.lots - lots } });
  }
  const lastOrder = desk.orders[0];
  const pnlGuess = (desk.cash);
  await finalizeClose(userId, positionId, reason, lastOrder?.averagePrice || px, 0, pos, lastOrder?.averagePrice || px);
  await persistDesk(userId, desk);
  return { ok: true };
}

async function finalizeClose(
  userId: string,
  positionId: string,
  reason: string,
  exit: number,
  pnl: number,
  pos?: { symbol: string; side: "buy" | "sell"; lots: number; entry: number; openedAt: number; strategyId?: string },
  exitPx?: number
) {
  const row = await prisma.position.findUnique({ where: { id: positionId } });
  const symbol = pos?.symbol || row?.symbol;
  if (!symbol) return;
  const side = (pos?.side || row?.side) as "buy" | "sell";
  const lots = pos?.lots || row?.lots || 0;
  const entry = pos?.entry || row?.entry || 0;
  const openedAt = pos?.openedAt || row?.openedAt.getTime() || Date.now();
  const { pnlUsd } = await import("@harsi/shared");
  const computed = pnlUsd(symbol, side, entry, exitPx || exit, lots);
  await prisma.trade.create({
    data: {
      userId,
      brokerId: "paper",
      mode: "paper",
      symbol,
      side,
      lots,
      entry,
      exit: exitPx || exit,
      pnl: computed,
      strategyId: row?.strategyId,
      durationMs: Date.now() - openedAt,
      openedAt: new Date(openedAt),
    },
  });
  if (row) await prisma.position.update({ where: { id: positionId }, data: { status: "closed" } }).catch(() => null);
  await prisma.alert.create({
    data: {
      userId,
      type: reason.toLowerCase().includes("stop") ? "stop_reached" : reason.toLowerCase().includes("target") ? "target_reached" : "exit",
      title: `PAPER close ${symbol}`,
      message: `${reason}. P&L ${computed.toFixed(2)}`,
      symbol,
      side,
    },
  });
  await audit(userId, "position_closed", `${symbol} ${reason} pnl=${computed.toFixed(2)}`);
}

export function defaultAutomation() {
  return {
    "london-harsi": { alerts: true, paper: false, live: false },
    "pulse-confluence": { alerts: true, paper: false, live: false },
    "breakout-trend": { alerts: true, paper: false, live: false },
  };
}

export function setForceLondon(userId: string, value: boolean) {
  forceLondonByUser.set(userId, value);
}

export function getForceLondon(userId: string) {
  return forceLondonByUser.get(userId) || false;
}

export async function tickAll() {
  lastTick = Date.now();
  for (const symbol of DEFAULT_WATCHLIST) {
    const inst = INSTRUMENTS[symbol];
    const book = getBook(symbol);
    if (inst.publicFeed === "binance") {
      continue;
    }
    const tick = nextTick(symbol, book.lastPrice, book.asian, false);
    book.lastPrice = tick.price;
    book.candles = upsertCandle(book.candles, tick.price, Math.floor(Date.now() / 1000));
    books.set(symbol, book);
  }
  const prices: Record<string, number> = {};
  const feeds: Record<string, string> = {};
  for (const [s, b] of books) {
    prices[s] = b.lastPrice;
    feeds[s] = b.feed;
  }
  broadcast("tick", { prices, feeds, t: Date.now(), session: getSessionState(new Date()) });

  const users = await prisma.user.findMany({ select: { id: true, plan: true, defaultSymbol: true } }).catch(() => []);
  for (const u of users) {
    try {
      const desk = await getDesk(u.id);
      for (const [s, p] of Object.entries(prices)) desk.setPrice(s, p);
      const stopped = desk.checkStops();
      for (const c of stopped) await finalizeClose(u.id, c.id, c.reason, c.exit, c.pnl);
      desk.matchPending();
      await evaluateUser(u.id, u.plan as PlanId, u.defaultSymbol || "EURUSD");
    } catch (e) {
      lastError = String(e);
    }
  }
}

let timer: NodeJS.Timeout | null = null;

export async function startRuntime() {
  if (started) return;
  started = true;
  await hydratePublicFeeds();
  timer = setInterval(() => {
    void tickAll();
  }, 1200);
  void tickAll();
}

export function stopRuntime() {
  started = false;
  if (timer) clearInterval(timer);
}

void SimulatedMarketData;

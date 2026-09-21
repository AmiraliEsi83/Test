import {
  getInstrument,
  pnlUsd as sharedPnl,
  roundTo,
  type Candle,
  type InstrumentSpec,
  type Side,
} from "@harsi/shared";

export function pnlUsd(inst: InstrumentSpec, side: Side, entry: number, exit: number, qty: number): number {
  return sharedPnl(inst, side, entry, exit, qty);
}

export function notionalUsd(inst: InstrumentSpec, price: number, qty: number): number {
  if (inst.quote === "JPY") return Math.abs(qty);
  return Math.abs(price * qty);
}

export function riskUsd(inst: InstrumentSpec, side: Side, entry: number, stop: number, qty: number): number {
  return Math.abs(pnlUsd(inst, side, entry, stop, qty));
}

export function sizeForRisk(inst: InstrumentSpec, side: Side, entry: number, stop: number, riskAmount: number): number {
  const distance = roundTo(Math.abs(entry - stop), inst.digits);
  const perUnit = inst.quote === "JPY" ? riskUsd(inst, side, entry, stop, 1) : distance;
  if (!(perUnit > 0) || !(riskAmount > 0)) return 0;
  const raw = riskAmount / perUnit;
  const stepped = Math.floor(raw / inst.qtyStep + 1e-8) * inst.qtyStep;
  return roundTo(Math.max(0, stepped), 8);
}

export function quoteFromMid(mid: number, pip: number, spreadPips: number) {
  const half = (spreadPips * pip) / 2;
  return { bid: mid - half, ask: mid + half, mid };
}

export interface Quote {
  bid: number;
  ask: number;
  mid: number;
}

export interface RiskSettings {
  riskPerTradePct: number;
  maxPositionNotional: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  maxSymbolNotional: number;
  maxConsecutiveLosses: number;
  killSwitch: boolean;
}

export const DEFAULT_RISK: RiskSettings = {
  riskPerTradePct: 0.5,
  maxPositionNotional: 200000,
  maxDailyLoss: 1500,
  maxOpenPositions: 5,
  maxSymbolNotional: 150000,
  maxConsecutiveLosses: 4,
  killSwitch: false,
};

export interface RiskOrder {
  symbol: string;
  notional: number;
  riskAmount: number | null;
  hasStop: boolean;
}

export function assessRisk(input: {
  settings: RiskSettings;
  equity: number;
  openPositions: { symbol: string; notional: number }[];
  realizedNetToday: number;
  consecutiveLosses: number;
  order: RiskOrder;
  requireStop?: boolean;
}): { ok: true } | { ok: false; code: string; message: string } {
  const settings = input.settings;
  if (settings.killSwitch) {
    return { ok: false, code: "kill_switch", message: "The daily kill switch is on. The order was not sent." };
  }
  if (input.realizedNetToday <= -Math.abs(settings.maxDailyLoss)) {
    return { ok: false, code: "daily_loss", message: "Max daily loss has been reached. The order was not sent." };
  }
  if (input.consecutiveLosses >= settings.maxConsecutiveLosses) {
    return {
      ok: false,
      code: "loss_streak",
      message: `Blocked after ${input.consecutiveLosses} consecutive losing trades.`,
    };
  }
  if (input.openPositions.length >= settings.maxOpenPositions) {
    return { ok: false, code: "max_positions", message: "The maximum number of open positions has been reached." };
  }
  if (input.order.notional > settings.maxPositionNotional) {
    return { ok: false, code: "max_position", message: "The order is larger than the maximum position size." };
  }
  const exposure = input.openPositions
    .filter((position) => position.symbol === input.order.symbol)
    .reduce((sum, position) => sum + position.notional, 0);
  if (exposure + input.order.notional > settings.maxSymbolNotional) {
    return { ok: false, code: "symbol_exposure", message: "The order exceeds the exposure limit for this symbol." };
  }
  if (input.requireStop && !input.order.hasStop) {
    return { ok: false, code: "stop_required", message: "Automated orders need a stop. This one was not sent." };
  }
  if (input.order.hasStop && input.order.riskAmount != null) {
    const budget = input.equity * (settings.riskPerTradePct / 100);
    if (input.order.riskAmount > budget * 1.05) {
      return {
        ok: false,
        code: "risk_per_trade",
        message: "Stop distance puts this order above the risk-per-trade limit.",
      };
    }
  }
  return { ok: true };
}

export function consecutiveLosses(trades: { pnl: number; commission: number }[]): number {
  let count = 0;
  for (let i = trades.length - 1; i >= 0; i -= 1) {
    const net = trades[i].pnl - trades[i].commission;
    if (net < -0.005) count += 1;
    else if (net > 0.005) break;
  }
  return count;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: Side;
  qty: number;
  entry: number;
  stop: number | null;
  target: number | null;
  strategyId: string | null;
  status: "open" | "closed";
  realizedPnl: number;
  commission: number;
  margin: number;
  openedAt: number;
  closedAt: number | null;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: Side;
  type: "market" | "limit" | "stop";
  qty: number;
  limitPrice: number | null;
  stopPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  status: "pending" | "filled" | "cancelled" | "rejected";
  filledQty: number;
  avgPrice: number | null;
  strategyId: string | null;
  positionId: string | null;
  rejectReason: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaperTrade {
  id: string;
  positionId: string;
  symbol: string;
  side: Side;
  qty: number;
  entry: number;
  exit: number;
  pnl: number;
  commission: number;
  spreadCost: number;
  slippageCost: number;
  strategyId: string | null;
  openedAt: number;
  closedAt: number;
  reason: string;
  rMultiple: number | null;
}

export interface Ledger {
  cash: number;
  startBalance: number;
  positions: PaperPosition[];
  orders: PaperOrder[];
  trades: PaperTrade[];
  seq: number;
}

export interface CostModel {
  commissionBps: number;
  slippagePips: number;
  spreadPips: number;
}

export function createLedger(start = 100000): Ledger {
  return { cash: start, startBalance: start, positions: [], orders: [], trades: [], seq: 1 };
}

function nextId(ledger: Ledger, prefix: string): string {
  const id = `${prefix}_${ledger.seq}`;
  ledger.seq += 1;
  return id;
}

export function commissionUsd(inst: InstrumentSpec, price: number, qty: number, bps: number): number {
  return notionalUsd(inst, price, qty) * (bps / 10000);
}

export function marginUsd(inst: InstrumentSpec, price: number, qty: number): number {
  return notionalUsd(inst, price, qty) / inst.leverage;
}

function moveValue(inst: InstrumentSpec, price: number, qty: number, move: number): number {
  return Math.abs(pnlUsd(inst, "buy", price, price + move, qty));
}

export interface OrderRequest {
  symbol: string;
  side: Side;
  type: "market" | "limit" | "stop";
  qty: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  strategyId?: string | null;
  now?: number;
}

export interface SubmitResult {
  order: PaperOrder;
  error?: string;
}

export function submitOrder(ledger: Ledger, request: OrderRequest, quote: Quote, costs: CostModel): SubmitResult {
  const now = request.now ?? Date.now();
  const inst = getInstrument(request.symbol);
  const order: PaperOrder = {
    id: nextId(ledger, "ord"),
    symbol: request.symbol,
    side: request.side,
    type: request.type,
    qty: request.qty,
    limitPrice: request.limitPrice ?? null,
    stopPrice: request.stopPrice ?? null,
    stopLoss: request.stopLoss ?? null,
    takeProfit: request.takeProfit ?? null,
    status: "pending",
    filledQty: 0,
    avgPrice: null,
    strategyId: request.strategyId ?? null,
    positionId: null,
    rejectReason: "",
    createdAt: now,
    updatedAt: now,
  };
  ledger.orders.push(order);
  if (!(request.qty > 0)) return reject(order, "Quantity must be greater than zero.");
  if (request.type === "limit" && !(request.limitPrice && request.limitPrice > 0)) {
    return reject(order, "A limit order needs a limit price.");
  }
  if (request.type === "stop" && !(request.stopPrice && request.stopPrice > 0)) {
    return reject(order, "A stop order needs a stop price.");
  }
  if (request.type === "market") {
    const filled = fillOpen(ledger, order, marketFill(request.side, quote, costs, inst), costs, now);
    if (!filled.ok) return reject(order, filled.error);
  }
  return { order };
}

function reject(order: PaperOrder, message: string): SubmitResult {
  order.status = "rejected";
  order.rejectReason = message;
  order.updatedAt = Date.now();
  return { order, error: message };
}

function marketFill(side: Side, quote: Quote, costs: CostModel, inst: InstrumentSpec): number {
  const slip = costs.slippagePips * inst.pip;
  return side === "buy" ? quote.ask + slip : quote.bid - slip;
}

function fillOpen(
  ledger: Ledger,
  order: PaperOrder,
  price: number,
  costs: CostModel,
  now: number
): { ok: true } | { ok: false; error: string } {
  const inst = getInstrument(order.symbol);
  const fill = roundTo(price, inst.digits);
  const commission = commissionUsd(inst, fill, order.qty, costs.commissionBps);
  const margin = marginUsd(inst, fill, order.qty);
  if (ledger.cash < margin + commission) {
    return { ok: false, error: "Not enough free cash for margin and commission. The order was not filled." };
  }
  ledger.cash = roundTo(ledger.cash - margin - commission, 2);
  const position: PaperPosition = {
    id: nextId(ledger, "pos"),
    symbol: order.symbol,
    side: order.side,
    qty: order.qty,
    entry: fill,
    stop: order.stopLoss,
    target: order.takeProfit,
    strategyId: order.strategyId,
    status: "open",
    realizedPnl: 0,
    commission,
    margin,
    openedAt: now,
    closedAt: null,
  };
  ledger.positions.push(position);
  order.status = "filled";
  order.filledQty = order.qty;
  order.avgPrice = fill;
  order.positionId = position.id;
  order.updatedAt = now;
  return { ok: true };
}

export function cancelOrder(ledger: Ledger, orderId: string, now = Date.now()): { ok: true } | { ok: false; error: string } {
  const order = ledger.orders.find((item) => item.id === orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "pending") return { ok: false, error: "Only a pending order can be cancelled." };
  order.status = "cancelled";
  order.updatedAt = now;
  return { ok: true };
}

export function updateProtection(
  ledger: Ledger,
  positionId: string,
  patch: { stop?: number | null; target?: number | null }
): { ok: true } | { ok: false; error: string } {
  const position = ledger.positions.find((item) => item.id === positionId && item.status === "open");
  if (!position) return { ok: false, error: "Open position not found." };
  if (patch.stop !== undefined) position.stop = patch.stop;
  if (patch.target !== undefined) position.target = patch.target;
  return { ok: true };
}

export function closePositionQty(
  ledger: Ledger,
  positionId: string,
  qty: number | null,
  fill: number,
  costs: CostModel,
  now: number,
  reason: string
): { ok: true; trade: PaperTrade } | { ok: false; error: string } {
  const position = ledger.positions.find((item) => item.id === positionId && item.status === "open");
  if (!position) return { ok: false, error: "Open position not found." };
  const inst = getInstrument(position.symbol);
  const closeQty = qty == null ? position.qty : qty;
  if (!(closeQty > 0) || closeQty - position.qty > 1e-8) {
    return { ok: false, error: "Close quantity is larger than the open position." };
  }
  const price = roundTo(fill, inst.digits);
  const closeCommission = commissionUsd(inst, price, closeQty, costs.commissionBps);
  const share = closeQty / position.qty;
  const openCommission = position.commission * share;
  const marginRelease = position.margin * share;
  const gross = pnlUsd(inst, position.side, position.entry, price, closeQty);
  position.qty = roundTo(position.qty - closeQty, 8);
  position.commission -= openCommission;
  position.margin -= marginRelease;
  position.realizedPnl = roundTo(position.realizedPnl + gross, 2);
  ledger.cash = roundTo(ledger.cash + marginRelease + gross - closeCommission, 2);
  const initialRisk = position.stop == null ? null : riskUsd(inst, position.side, position.entry, position.stop, closeQty);
  const trade: PaperTrade = {
    id: nextId(ledger, "trd"),
    positionId: position.id,
    symbol: position.symbol,
    side: position.side,
    qty: closeQty,
    entry: position.entry,
    exit: price,
    pnl: roundTo(gross, 2),
    commission: roundTo(openCommission + closeCommission, 4),
    spreadCost: roundTo(moveValue(inst, price, closeQty, costs.spreadPips * inst.pip), 4),
    slippageCost: roundTo(moveValue(inst, price, closeQty, costs.slippagePips * inst.pip), 4),
    strategyId: position.strategyId,
    openedAt: position.openedAt,
    closedAt: now,
    reason,
    rMultiple: initialRisk && initialRisk > 0 ? roundTo(gross / initialRisk, 3) : null,
  };
  ledger.trades.push(trade);
  if (position.qty <= inst.qtyStep / 10) {
    position.qty = 0;
    position.status = "closed";
    position.closedAt = now;
    position.margin = 0;
  }
  return { ok: true, trade };
}

export function exitOnQuote(
  position: PaperPosition,
  quote: Quote,
  inst: InstrumentSpec,
  slippagePips: number
): { price: number; reason: "stop" | "target" } | null {
  const slip = slippagePips * inst.pip;
  if (position.side === "buy") {
    if (position.stop != null && quote.bid <= position.stop) {
      return { price: Math.min(position.stop, quote.bid) - slip, reason: "stop" };
    }
    if (position.target != null && quote.bid >= position.target) {
      return { price: position.target, reason: "target" };
    }
  } else {
    if (position.stop != null && quote.ask >= position.stop) {
      return { price: Math.max(position.stop, quote.ask) + slip, reason: "stop" };
    }
    if (position.target != null && quote.ask <= position.target) {
      return { price: position.target, reason: "target" };
    }
  }
  return null;
}

export function exitOnBar(
  position: PaperPosition,
  bar: Candle,
  inst: InstrumentSpec,
  slippagePips: number
): { price: number; reason: "stop" | "target" } | null {
  const slip = slippagePips * inst.pip;
  if (position.side === "buy") {
    if (position.stop != null && bar.low <= position.stop) {
      const raw = bar.open < position.stop ? bar.open : position.stop;
      return { price: raw - slip, reason: "stop" };
    }
    if (position.target != null && bar.high >= position.target) {
      const raw = bar.open > position.target ? bar.open : position.target;
      return { price: raw, reason: "target" };
    }
  } else {
    if (position.stop != null && bar.high >= position.stop) {
      const raw = bar.open > position.stop ? bar.open : position.stop;
      return { price: raw + slip, reason: "stop" };
    }
    if (position.target != null && bar.low <= position.target) {
      const raw = bar.open < position.target ? bar.open : position.target;
      return { price: raw, reason: "target" };
    }
  }
  return null;
}

function limitTriggered(order: PaperOrder, quote: Quote): number | null {
  if (order.type === "limit" && order.side === "buy" && order.limitPrice != null && quote.ask <= order.limitPrice) {
    return quote.ask;
  }
  if (order.type === "limit" && order.side === "sell" && order.limitPrice != null && quote.bid >= order.limitPrice) {
    return quote.bid;
  }
  if (order.type === "stop" && order.side === "buy" && order.stopPrice != null && quote.ask >= order.stopPrice) {
    return Math.max(quote.ask, order.stopPrice);
  }
  if (order.type === "stop" && order.side === "sell" && order.stopPrice != null && quote.bid <= order.stopPrice) {
    return Math.min(quote.bid, order.stopPrice);
  }
  return null;
}

export function onQuote(ledger: Ledger, symbol: string, quote: Quote, costs: CostModel, now = Date.now()): Ledger {
  for (const position of [...ledger.positions]) {
    if (position.status !== "open" || position.symbol !== symbol) continue;
    const inst = getInstrument(symbol);
    const exit = exitOnQuote(position, quote, inst, costs.slippagePips);
    if (exit) closePositionQty(ledger, position.id, null, exit.price, costs, now, exit.reason);
  }
  for (const order of [...ledger.orders]) {
    if (order.status !== "pending" || order.symbol !== symbol) continue;
    const price = limitTriggered(order, quote);
    if (price == null) continue;
    const filled = fillOpen(ledger, order, price, { ...costs, slippagePips: order.type === "limit" ? 0 : costs.slippagePips }, now);
    if (!filled.ok) reject(order, filled.error);
  }
  return ledger;
}

export function accountSummary(ledger: Ledger, quotes: Record<string, Quote>) {
  let unrealized = 0;
  let margin = 0;
  let openRisk = 0;
  for (const position of ledger.positions) {
    if (position.status !== "open") continue;
    margin += position.margin;
    const inst = getInstrument(position.symbol);
    const quote = quotes[position.symbol];
    if (quote) {
      const mark = position.side === "buy" ? quote.bid : quote.ask;
      unrealized += pnlUsd(inst, position.side, position.entry, mark, position.qty);
      openRisk += position.stop == null ? notionalUsd(inst, mark, position.qty) : riskUsd(inst, position.side, position.entry, position.stop, position.qty);
    }
  }
  const realized = ledger.trades.reduce((sum, trade) => sum + (trade.pnl - trade.commission), 0);
  const equity = ledger.cash + margin + unrealized;
  return {
    cash: roundTo(ledger.cash, 2),
    equity: roundTo(equity, 2),
    buyingPower: roundTo(ledger.cash, 2),
    unrealized: roundTo(unrealized, 2),
    realized: roundTo(realized, 2),
    margin: roundTo(margin, 2),
    openRisk: roundTo(openRisk, 2),
    startBalance: ledger.startBalance,
  };
}

export interface ClosedTradeLike {
  pnl: number;
  commission: number;
  closedAt: number;
  side: Side;
  symbol: string;
  strategyId: string | null;
  rMultiple?: number | null;
}

export interface PerformanceStats {
  trades: number;
  netPnl: number;
  winRate: number | null;
  averageWinner: number | null;
  averageLoser: number | null;
  profitFactor: number | null;
  maxDrawdown: number;
  maxDrawdownPct: number | null;
  averageR: number | null;
  tradesPerDay: number | null;
  equity: { time: number; equity: number }[];
  byStrategy: Record<string, number>;
  bySymbol: Record<string, number>;
  byWeekday: Record<string, number>;
  longNet: number;
  shortNet: number;
}

export function performanceStats(start: number, trades: ClosedTradeLike[], timeZone = "Europe/London"): PerformanceStats {
  const ordered = [...trades].sort((a, b) => a.closedAt - b.closedAt);
  let equity = start;
  let peak = start;
  let maxDrawdown = 0;
  let maxPct = 0;
  const curve = [{ time: ordered[0] ? ordered[0].closedAt : Date.now(), equity: start }];
  let grossWin = 0;
  let grossLoss = 0;
  let wins = 0;
  let losses = 0;
  let winSum = 0;
  let lossSum = 0;
  let rSum = 0;
  let rCount = 0;
  const byStrategy: Record<string, number> = {};
  const bySymbol: Record<string, number> = {};
  const byWeekday: Record<string, number> = {};
  let longNet = 0;
  let shortNet = 0;
  const days = new Set<string>();
  for (const trade of ordered) {
    const net = trade.pnl - trade.commission;
    equity += net;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    if (peak > 0) maxPct = Math.max(maxPct, (peak - equity) / peak);
    curve.push({ time: trade.closedAt, equity: roundTo(equity, 2) });
    if (net > 0.005) {
      wins += 1;
      winSum += net;
      grossWin += net;
    } else if (net < -0.005) {
      losses += 1;
      lossSum += net;
      grossLoss += net;
    }
    if (trade.rMultiple != null && Number.isFinite(trade.rMultiple)) {
      rSum += trade.rMultiple;
      rCount += 1;
    }
    const key = trade.strategyId || "manual";
    byStrategy[key] = (byStrategy[key] ?? 0) + net;
    bySymbol[trade.symbol] = (bySymbol[trade.symbol] ?? 0) + net;
    const weekday = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" }).format(new Date(trade.closedAt));
    byWeekday[weekday] = (byWeekday[weekday] ?? 0) + net;
    if (trade.side === "buy") longNet += net;
    else shortNet += net;
    days.add(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(trade.closedAt)));
  }
  return {
    trades: ordered.length,
    netPnl: roundTo(equity - start, 2),
    winRate: wins + losses ? wins / (wins + losses) : null,
    averageWinner: wins ? winSum / wins : null,
    averageLoser: losses ? lossSum / losses : null,
    profitFactor: grossLoss < 0 ? grossWin / Math.abs(grossLoss) : wins ? null : 0,
    maxDrawdown: roundTo(maxDrawdown, 2),
    maxDrawdownPct: peak > 0 ? maxPct : null,
    averageR: rCount ? rSum / rCount : null,
    tradesPerDay: days.size ? ordered.length / days.size : null,
    equity: curve,
    byStrategy,
    bySymbol,
    byWeekday,
    longNet: roundTo(longNet, 2),
    shortNet: roundTo(shortNet, 2),
  };
}

export interface BacktestSignal {
  time: number;
  side: Side;
  entry: number;
  stop: number;
  target: number;
}

export interface BacktestEvaluate {
  (input: { candles: Candle[]; higher: Candle[]; index: number; bar: Candle }): BacktestSignal | null;
}

export function runBacktest(input: {
  candles: Candle[];
  higherCandles?: Candle[];
  symbol: string;
  evaluate: BacktestEvaluate;
  starting?: number;
  risk?: RiskSettings;
  costs?: CostModel;
  warmup?: number;
}) {
  const inst = getInstrument(input.symbol);
  const risk = input.risk ?? DEFAULT_RISK;
  const costs: CostModel = input.costs ?? {
    commissionBps: 0.8,
    slippagePips: 0.2,
    spreadPips: inst.spreadPips,
  };
  const ledger = createLedger(input.starting ?? 100000);
  const signals: BacktestSignal[] = [];
  const blocked: { time: number; message: string }[] = [];
  const warmup = input.warmup ?? 60;
  const higherAll = input.higherCandles ?? [];
  for (let i = warmup; i < input.candles.length - 1; i += 1) {
    const bar = input.candles[i];
    const next = input.candles[i + 1];
    for (const position of [...ledger.positions]) {
      if (position.status !== "open" || position.symbol !== input.symbol) continue;
      if (position.openedAt > bar.time * 1000) continue;
      const exit = exitOnBar(position, bar, inst, costs.slippagePips);
      if (exit) closePositionQty(ledger, position.id, null, exit.price, costs, bar.time * 1000, exit.reason);
    }
    const higher = higherAll.filter((candle) => candle.time <= bar.time);
    const idea = input.evaluate({
      candles: input.candles.slice(0, i + 1),
      higher,
      index: i,
      bar,
    });
    if (!idea) continue;
    signals.push(idea);
    if (ledger.positions.some((position) => position.status === "open" && position.symbol === input.symbol)) continue;
    const summary = accountSummary(ledger, {});
    const stopDistance = Math.abs(idea.entry - idea.stop);
    const projectedStop = idea.side === "buy" ? next.open - stopDistance : next.open + stopDistance;
    let qty = sizeForRisk(
      inst,
      idea.side,
      next.open,
      projectedStop,
      summary.equity * (risk.riskPerTradePct / 100)
    );
    const unitNotional = notionalUsd(inst, next.open, 1);
    if (unitNotional > 0) {
      const cap = Math.floor(Math.min(risk.maxPositionNotional, risk.maxSymbolNotional) / unitNotional / inst.qtyStep) * inst.qtyStep;
      qty = Math.min(qty, roundTo(cap, 8));
    }
    const stop = projectedStop;
    const targetDistance = Math.abs(idea.target - idea.entry);
    const target = idea.side === "buy" ? next.open + targetDistance : next.open - targetDistance;
    const quote = quoteFromMid(next.open, inst.pip, costs.spreadPips);
    const notional = notionalUsd(inst, next.open, qty);
    const decision = assessRisk({
      settings: risk,
      equity: summary.equity,
      openPositions: ledger.positions
        .filter((position) => position.status === "open")
        .map((position) => ({ symbol: position.symbol, notional: position.margin * inst.leverage })),
      realizedNetToday: 0,
      consecutiveLosses: consecutiveLosses(ledger.trades),
      requireStop: true,
      order: { symbol: input.symbol, notional, riskAmount: riskUsd(inst, idea.side, next.open, stop, qty), hasStop: true },
    });
    if (!decision.ok) {
      blocked.push({ time: next.time, message: decision.message });
      continue;
    }
    if (!(qty > 0)) continue;
    submitOrder(
      ledger,
      {
        symbol: input.symbol,
        side: idea.side,
        type: "market",
        qty,
        stopLoss: stop,
        takeProfit: target,
        strategyId: "backtest",
        now: next.time * 1000,
      },
      quote,
      costs
    );
  }
  const stats = performanceStats(ledger.startBalance, ledger.trades);
  return { ledger, signals, blocked, stats };
}

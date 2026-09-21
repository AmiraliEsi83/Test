export const APP_NAME = "HARSI";
export const APP_TAGLINE = "Session terminal for research signals and paper execution";

export type PlanId = "free" | "trader" | "pro";
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop";
export type OrderStatus =
  | "open"
  | "pending"
  | "filled"
  | "cancelled"
  | "rejected"
  | "partial";
export type PositionStatus = "open" | "closed";
export type SignalStatus = "active" | "triggered" | "expired" | "closed" | "blocked";
export type TradingMode = "paper" | "live";
export type InstrumentKind = "fx" | "metal" | "crypto" | "index";
export type StrategyId = "london-harsi" | "pulse-confluence" | "breakout-trend";
export type BrokerType = "paper" | "oanda" | "alpaca" | "ibkr" | "mt5";
export type AlertChannel = "browser" | "email" | "webhook";
export type AlertEvent =
  | "new_signal"
  | "entry"
  | "exit"
  | "stop_reached"
  | "target_reached"
  | "broker_disconnected"
  | "risk_limit_reached";

export interface Instrument {
  id: string;
  label: string;
  pip: number;
  digits: number;
  base: number;
  vol: number;
  kind: InstrumentKind;
  lotSize: number;
  tv?: string;
  binance?: string;
  sessionPair?: boolean;
  publicFeed?: "binance" | "none";
}

export const INSTRUMENTS: Record<string, Instrument> = {
  EURUSD: {
    id: "EURUSD",
    label: "EUR/USD",
    pip: 0.0001,
    digits: 5,
    base: 1.08462,
    vol: 0.00009,
    kind: "fx",
    lotSize: 100000,
    tv: "FX:EURUSD",
    sessionPair: true,
  },
  GBPUSD: {
    id: "GBPUSD",
    label: "GBP/USD",
    pip: 0.0001,
    digits: 5,
    base: 1.27148,
    vol: 0.00012,
    kind: "fx",
    lotSize: 100000,
    tv: "FX:GBPUSD",
    sessionPair: true,
  },
  USDJPY: {
    id: "USDJPY",
    label: "USD/JPY",
    pip: 0.01,
    digits: 3,
    base: 149.842,
    vol: 0.014,
    kind: "fx",
    lotSize: 100000,
    tv: "FX:USDJPY",
    sessionPair: true,
  },
  XAUUSD: {
    id: "XAUUSD",
    label: "XAU/USD",
    pip: 0.1,
    digits: 2,
    base: 2518.6,
    vol: 0.42,
    kind: "metal",
    lotSize: 100,
    tv: "OANDA:XAUUSD",
    sessionPair: true,
  },
  BTCUSD: {
    id: "BTCUSD",
    label: "BTC/USD",
    pip: 1,
    digits: 2,
    base: 64120,
    vol: 48,
    kind: "crypto",
    lotSize: 1,
    tv: "BINANCE:BTCUSDT",
    publicFeed: "binance",
    binance: "btcusdt",
  },
  ETHUSD: {
    id: "ETHUSD",
    label: "ETH/USD",
    pip: 0.1,
    digits: 2,
    base: 3428.4,
    vol: 2.8,
    kind: "crypto",
    lotSize: 1,
    tv: "BINANCE:ETHUSDT",
    publicFeed: "binance",
    binance: "ethusdt",
  },
  SPY: {
    id: "SPY",
    label: "SPY",
    pip: 0.01,
    digits: 2,
    base: 562.4,
    vol: 0.18,
    kind: "index",
    lotSize: 1,
    tv: "AMEX:SPY",
  },
  QQQ: {
    id: "QQQ",
    label: "QQQ",
    pip: 0.01,
    digits: 2,
    base: 489.2,
    vol: 0.22,
    kind: "index",
    lotSize: 1,
    tv: "NASDAQ:QQQ",
  },
};

export const INSTRUMENT_LIST = Object.values(INSTRUMENTS);
export const DEFAULT_WATCHLIST = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "ETHUSD", "SPY", "QQQ"];
export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  realtimeSignals: boolean;
  alerts: boolean;
  analytics: boolean;
  backtest: boolean;
  paperAuto: boolean;
  liveAuto: boolean;
  brokers: number;
  allStrategies: boolean;
  webhooks: boolean;
  featured?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "Chart, watchlist, delayed signals, paper trading.",
    features: [
      "Live-looking chart & watchlist",
      "Paper desk ($100k virtual)",
      "Delayed / basic signals",
      "Positions, orders, history",
    ],
    realtimeSignals: false,
    alerts: false,
    analytics: false,
    backtest: false,
    paperAuto: false,
    liveAuto: false,
    brokers: 0,
    allStrategies: false,
    webhooks: false,
  },
  trader: {
    id: "trader",
    name: "Trader",
    price: 49,
    tagline: "Realtime strategy alerts, analytics, backtests, paper automation.",
    features: [
      "Realtime HARSI, Pulse, and Breakout alerts",
      "Advanced analytics",
      "Backtesting",
      "Paper auto-execute",
      "Configurable risk & alerts",
    ],
    realtimeSignals: true,
    alerts: true,
    analytics: true,
    backtest: true,
    paperAuto: true,
    liveAuto: false,
    brokers: 0,
    allStrategies: true,
    webhooks: false,
    featured: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 129,
    tagline: "Broker adapters, live automation, webhooks — with explicit confirmation.",
    features: [
      "Everything in Trader",
      "Server-side broker connections",
      "Live auto-execute (explicit confirm)",
      "Webhook / Telegram architecture",
      "Priority audit log",
    ],
    realtimeSignals: true,
    alerts: true,
    analytics: true,
    backtest: true,
    paperAuto: true,
    liveAuto: true,
    brokers: 6,
    allStrategies: true,
    webhooks: true,
  },
};

export function formatPrice(symbol: string, price: number | null | undefined): string {
  const inst = INSTRUMENTS[symbol];
  if (!inst || price == null || Number.isNaN(price)) return "—";
  return Number(price).toFixed(inst.digits);
}

export function toPips(symbol: string, delta: number): number {
  const inst = INSTRUMENTS[symbol];
  if (!inst) return 0;
  return delta / inst.pip;
}

export function fromPips(symbol: string, pips: number): number {
  const inst = INSTRUMENTS[symbol];
  if (!inst) return 0;
  return pips * inst.pip;
}

export function pnlUsd(
  symbol: string,
  side: Side,
  entry: number,
  current: number,
  lots: number
): number {
  const inst = INSTRUMENTS[symbol];
  if (!inst) return 0;
  const dir = side === "buy" ? 1 : -1;
  const move = (current - entry) * dir;
  if (inst.kind === "crypto" || inst.kind === "index") return move * lots;
  if (inst.kind === "metal") return (move / inst.pip) * lots;
  return (move / inst.pip) * lots * 10;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export function planRank(id: PlanId): number {
  return id === "pro" ? 3 : id === "trader" ? 2 : 1;
}

export function hasPlan(current: PlanId, required: PlanId): boolean {
  return planRank(current) >= planRank(required);
}

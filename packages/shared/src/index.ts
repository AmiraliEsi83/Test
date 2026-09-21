export type Side = "buy" | "sell";
export type InstrumentKind = "fx" | "metal" | "crypto" | "equity";
export type QuoteCcy = "USD" | "JPY";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface InstrumentSpec {
  symbol: string;
  label: string;
  pip: number;
  digits: number;
  base: number;
  vol: number;
  kind: InstrumentKind;
  quote: QuoteCcy;
  contractSize: number;
  spreadPips: number;
  leverage: number;
  qtyStep: number;
  binance?: string;
}

export const INSTRUMENTS: Record<string, InstrumentSpec> = {
  EURUSD: {
    symbol: "EURUSD",
    label: "EUR/USD",
    pip: 0.0001,
    digits: 5,
    base: 1.0862,
    vol: 0.00008,
    kind: "fx",
    quote: "USD",
    contractSize: 100000,
    spreadPips: 0.8,
    leverage: 30,
    qtyStep: 1000,
  },
  GBPUSD: {
    symbol: "GBPUSD",
    label: "GBP/USD",
    pip: 0.0001,
    digits: 5,
    base: 1.2684,
    vol: 0.00011,
    kind: "fx",
    quote: "USD",
    contractSize: 100000,
    spreadPips: 1.1,
    leverage: 30,
    qtyStep: 1000,
  },
  USDJPY: {
    symbol: "USDJPY",
    label: "USD/JPY",
    pip: 0.01,
    digits: 3,
    base: 149.42,
    vol: 0.012,
    kind: "fx",
    quote: "JPY",
    contractSize: 100000,
    spreadPips: 0.9,
    leverage: 30,
    qtyStep: 1000,
  },
  XAUUSD: {
    symbol: "XAUUSD",
    label: "XAU/USD",
    pip: 0.1,
    digits: 2,
    base: 2654,
    vol: 0.35,
    kind: "metal",
    quote: "USD",
    contractSize: 1,
    spreadPips: 2.5,
    leverage: 20,
    qtyStep: 0.01,
  },
  BTCUSD: {
    symbol: "BTCUSD",
    label: "BTC/USD",
    pip: 1,
    digits: 2,
    base: 64250,
    vol: 42,
    kind: "crypto",
    quote: "USD",
    contractSize: 1,
    spreadPips: 8,
    leverage: 2,
    qtyStep: 0.001,
    binance: "BTCUSDT",
  },
  ETHUSD: {
    symbol: "ETHUSD",
    label: "ETH/USD",
    pip: 0.1,
    digits: 2,
    base: 2480,
    vol: 2.4,
    kind: "crypto",
    quote: "USD",
    contractSize: 1,
    spreadPips: 1.5,
    leverage: 2,
    qtyStep: 0.01,
    binance: "ETHUSDT",
  },
  SPY: {
    symbol: "SPY",
    label: "SPY",
    pip: 0.01,
    digits: 2,
    base: 562.4,
    vol: 0.22,
    kind: "equity",
    quote: "USD",
    contractSize: 1,
    spreadPips: 1,
    leverage: 2,
    qtyStep: 1,
  },
  QQQ: {
    symbol: "QQQ",
    label: "QQQ",
    pip: 0.01,
    digits: 2,
    base: 488.2,
    vol: 0.28,
    kind: "equity",
    quote: "USD",
    contractSize: 1,
    spreadPips: 1,
    leverage: 2,
    qtyStep: 1,
  },
};

export const INSTRUMENT_LIST = Object.values(INSTRUMENTS);

export function getInstrument(symbol: string): InstrumentSpec {
  const inst = INSTRUMENTS[symbol];
  if (!inst) throw new Error(`Unknown instrument ${symbol}`);
  return inst;
}

export function isInstrument(symbol: string): boolean {
  return Boolean(INSTRUMENTS[symbol]);
}

export function formatPrice(symbol: string, price: number | null | undefined): string {
  if (price == null || Number.isNaN(price)) return "—";
  const digits = INSTRUMENTS[symbol]?.digits ?? 2;
  return price.toFixed(digits);
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatQty(symbol: string, qty: number): string {
  const step = INSTRUMENTS[symbol]?.qtyStep ?? 1;
  const digits = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
  return qty.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function roundPrice(symbol: string, price: number): number {
  return roundTo(price, INSTRUMENTS[symbol]?.digits ?? 5);
}

export function pnlUsd(inst: InstrumentSpec, side: Side, entry: number, exit: number, qty: number): number {
  const direction = side === "buy" ? 1 : -1;
  const raw = direction * (exit - entry) * qty;
  if (inst.quote === "JPY") {
    const price = exit || entry;
    return price ? raw / price : 0;
  }
  return raw;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

function zoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = zoneFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    });
    zoneFormatters.set(timeZone, fmt);
  }
  return fmt;
}

export function zonedParts(date = new Date(), timeZone = "Europe/London"): ZonedParts {
  const parts = Object.fromEntries(zoneFormatter(timeZone).formatToParts(date).map((p) => [p.type, p.value]));
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: String(parts.weekday).slice(0, 3),
  };
}

export function londonMinutes(date = new Date()): number {
  const p = zonedParts(date, "Europe/London");
  return p.hour * 60 + p.minute + p.second / 60;
}

export function londonDayKey(date = new Date()): string {
  const p = zonedParts(date, "Europe/London");
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function isWeekend(date = new Date(), timeZone = "Europe/London"): boolean {
  const day = zonedParts(date, timeZone).weekday;
  return day === "Sat" || day === "Sun";
}

export interface SessionDef {
  id: "sydney" | "tokyo" | "london" | "newyork";
  label: string;
  open: number;
  close: number;
  wraps: boolean;
}

export const SESSIONS: SessionDef[] = [
  { id: "sydney", label: "Sydney", open: 22 * 60, close: 7 * 60, wraps: true },
  { id: "tokyo", label: "Tokyo", open: 0, close: 9 * 60, wraps: false },
  { id: "london", label: "London", open: 8 * 60, close: 16 * 60 + 30, wraps: false },
  { id: "newyork", label: "New York", open: 13 * 60, close: 22 * 60, wraps: false },
];

function minutesUntil(from: number, to: number): number {
  const delta = to - from;
  return delta >= 0 ? delta : delta + 1440;
}

export interface SessionState {
  id: SessionDef["id"];
  label: string;
  open: boolean;
  weekend: boolean;
  minutesToChange: number;
  change: "open" | "close";
  labelCountdown: string;
}

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, "0");
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes * 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function sessionStates(date = new Date()): SessionState[] {
  const weekend = isWeekend(date);
  const mins = londonMinutes(date);
  return SESSIONS.map((session) => {
    if (weekend) {
      return {
        id: session.id,
        label: session.label,
        open: false,
        weekend: true,
        minutesToChange: 0,
        change: "open" as const,
        labelCountdown: "Weekend",
      };
    }
    const open = session.wraps
      ? mins >= session.open || mins < session.close
      : mins >= session.open && mins < session.close;
    const target = open ? session.close : session.open;
    const minutesToChange = minutesUntil(mins, target);
    return {
      id: session.id,
      label: session.label,
      open,
      weekend: false,
      minutesToChange,
      change: open ? "close" : "open",
      labelCountdown: formatDuration(minutesToChange),
    };
  });
}

export function overlappingSessions(date = new Date()): string[] {
  return sessionStates(date)
    .filter((s) => s.open)
    .map((s) => s.label);
}

export const HARSI_WINDOW = { start: 7 * 60 + 45, end: 8 * 60 + 5 };

export function inHarsiWindow(date = new Date(), start = HARSI_WINDOW.start, end = HARSI_WINDOW.end): boolean {
  if (isWeekend(date)) return false;
  const mins = londonMinutes(date);
  return mins >= start && mins < end;
}

export function nextHarsiWindow(date = new Date(), start = HARSI_WINDOW.start): Date {
  for (let i = 0; i < 8; i += 1) {
    const probe = new Date(date.getTime() + i * 86400000);
    const parts = zonedParts(probe, "Europe/London");
    if (parts.weekday === "Sat" || parts.weekday === "Sun") continue;
    const nowMin = i === 0 ? londonMinutes(date) : -1;
    if (i === 0 && nowMin < start) {
      return new Date(date.getTime() + (start - nowMin) * 60000);
    }
    if (i > 0) {
      const probeMin = londonMinutes(probe);
      return new Date(probe.getTime() + (start - probeMin) * 60000);
    }
  }
  return new Date(date.getTime() + 86400000);
}

export interface AsianRange {
  high: number;
  low: number;
  mid: number;
  bars: number;
}

export function asianRangeFromCandles(candles: Candle[], now: Date): AsianRange | null {
  const day = londonDayKey(now);
  let high = -Infinity;
  let low = Infinity;
  let bars = 0;
  for (const candle of candles) {
    const parts = zonedParts(new Date(candle.time * 1000), "Europe/London");
    const key = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    const mins = parts.hour * 60 + parts.minute;
    if (key === day && mins < HARSI_WINDOW.start) {
      high = Math.max(high, candle.high);
      low = Math.min(low, candle.low);
      bars += 1;
    }
  }
  if (bars < 10 || !Number.isFinite(high) || high <= low) return null;
  return { high, low, mid: (high + low) / 2, bars };
}

export type PlanId = "free" | "trader" | "pro";

export interface PlanSpec {
  id: PlanId;
  name: string;
  priceMonthly: number;
  blurb: string;
  features: string[];
  realtimeSignals: boolean;
  alerts: boolean;
  analytics: boolean;
  backtest: boolean;
  paperAuto: boolean;
  brokers: boolean;
  liveAuto: boolean;
  webhooks: boolean;
}

export const PLANS: Record<PlanId, PlanSpec> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    blurb: "Chart, watchlist, delayed research signals, and manual paper trading.",
    features: [
      "Simulated and public market chart",
      "Watchlist",
      "Signals delayed 15 minutes",
      "Manual paper orders",
    ],
    realtimeSignals: false,
    alerts: false,
    analytics: false,
    backtest: false,
    paperAuto: false,
    brokers: false,
    liveAuto: false,
    webhooks: false,
  },
  trader: {
    id: "trader",
    name: "Trader",
    priceMonthly: 49,
    blurb: "Realtime strategy alerts, analytics, backtests, and paper automation.",
    features: [
      "Realtime research signals",
      "Browser and email alert slots",
      "Analytics and saved backtests",
      "Paper auto-execution",
    ],
    realtimeSignals: true,
    alerts: true,
    analytics: true,
    backtest: true,
    paperAuto: true,
    brokers: false,
    liveAuto: false,
    webhooks: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 129,
    blurb: "Broker adapters, live automation, and webhooks. Live routing still requires your own credentials.",
    features: [
      "Everything in Trader",
      "Broker connection vault",
      "Live automation arming",
      "Webhook delivery",
    ],
    realtimeSignals: true,
    alerts: true,
    analytics: true,
    backtest: true,
    paperAuto: true,
    brokers: true,
    liveAuto: true,
    webhooks: true,
  },
};

export type PlanFeature = keyof Pick<
  PlanSpec,
  "realtimeSignals" | "alerts" | "analytics" | "backtest" | "paperAuto" | "brokers" | "liveAuto" | "webhooks"
>;

export function planAllows(plan: string, feature: PlanFeature): boolean {
  const spec = PLANS[plan as PlanId] ?? PLANS.free;
  return Boolean(spec[feature]);
}

export const SIGNAL_DELAY_MS = 15 * 60 * 1000;

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const TIMEFRAMES = [
  { id: "1m", label: "1m", minutes: 1 },
  { id: "5m", label: "5m", minutes: 5 },
  { id: "15m", label: "15m", minutes: 15 },
  { id: "1h", label: "1h", minutes: 60 },
  { id: "4h", label: "4h", minutes: 240 },
] as const;

export type TimeframeId = (typeof TIMEFRAMES)[number]["id"];

export function timeframeMinutes(id: string): number {
  return TIMEFRAMES.find((tf) => tf.id === id)?.minutes ?? 5;
}

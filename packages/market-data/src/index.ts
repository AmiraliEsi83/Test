import {
  Candle,
  getInstrument,
  timeframeMinutes,
  zonedParts,
  type InstrumentSpec,
} from "@harsi/shared";

export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(Number.NaN);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += values[i];
  out[period - 1] = sum / period;
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i += 1) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

export function rsi(values: number[], period = 14): number[] {
  const out = new Array<number>(values.length).fill(Number.NaN);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    const g = delta > 0 ? delta : 0;
    const l = delta < 0 ? -delta : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const line = values.map((_, i) =>
    Number.isFinite(fastEma[i]) && Number.isFinite(slowEma[i]) ? fastEma[i] - slowEma[i] : Number.NaN
  );
  const first = line.findIndex((value) => Number.isFinite(value));
  const sig = new Array<number>(line.length).fill(Number.NaN);
  if (first >= 0) {
    const subset = line.slice(first).map((value) => value);
    const signalEma = ema(subset, signal);
    for (let i = 0; i < signalEma.length; i += 1) sig[first + i] = signalEma[i];
  }
  const hist = line.map((value, i) =>
    Number.isFinite(value) && Number.isFinite(sig[i]) ? value - sig[i] : Number.NaN
  );
  return { line, signal: sig, hist };
}

export function atr(candles: Candle[], period = 14): number[] {
  const out = new Array<number>(candles.length).fill(Number.NaN);
  if (!candles.length) return out;
  const trs = candles.map((candle, i) => {
    if (i === 0) return candle.high - candle.low;
    const prev = candles[i - 1].close;
    return Math.max(candle.high - candle.low, Math.abs(candle.high - prev), Math.abs(candle.low - prev));
  });
  if (trs.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += trs[i];
  out[period - 1] = sum / period;
  for (let i = period; i < trs.length; i += 1) {
    out[i] = (out[i - 1] * (period - 1) + trs[i]) / period;
  }
  return out;
}

export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(Number.NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function resample(candles: Candle[], minutes: number): Candle[] {
  if (minutes <= 1) return candles.map((candle) => ({ ...candle }));
  const bucket = minutes * 60;
  const out: Candle[] = [];
  let current: Candle | null = null;
  let key = -1;
  for (const candle of candles) {
    const nextKey = Math.floor(candle.time / bucket) * bucket;
    if (!current || nextKey !== key) {
      if (current) out.push(current);
      current = { ...candle, time: nextKey };
      key = nextKey;
    } else {
      current.high = Math.max(current.high, candle.high);
      current.low = Math.min(current.low, candle.low);
      current.close = candle.close;
      current.volume += candle.volume;
    }
  }
  if (current) out.push(current);
  return out;
}

export function closedCandles(candles: Candle[], now = Date.now(), bucketSec = 60): Candle[] {
  if (candles.length < 2) return candles.map((candle) => ({ ...candle }));
  const last = candles[candles.length - 1];
  if (now / 1000 < last.time + bucketSec) return candles.slice(0, -1).map((candle) => ({ ...candle }));
  return candles.map((candle) => ({ ...candle }));
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tapeCache = new Map<string, { builtAt: number; candles: Candle[] }>();

export function buildSimulatedTape(symbol: string, now = Date.now(), days = 40): Candle[] {
  const inst = getInstrument(symbol);
  const rng = mulberry32(hashString(`${symbol}:harsi-v1`));
  const end = Math.floor(now / 60000) * 60000;
  const start = end - days * 86400000;
  const candles: Candle[] = [];
  let price = inst.base;
  for (let t = start; t <= end; t += 60000) {
    const parts = zonedParts(new Date(t), "Europe/London");
    const mins = parts.hour * 60 + parts.minute;
    let energy = 0.55;
    if (mins >= 8 * 60 && mins < 16 * 60 + 30) energy = 1.25;
    if (mins >= 13 * 60 && mins < 17 * 60) energy = 1.55;
    if (parts.weekday === "Sat" || parts.weekday === "Sun") energy = 0.12;
    const shock = (rng() - 0.485) * inst.vol * energy;
    const drift = (inst.base - price) * 0.0012;
    const open = price;
    const close = Math.max(inst.pip, open + shock + drift);
    const wick = rng() * inst.vol * energy * 0.7;
    candles.push({
      time: Math.floor(t / 1000),
      open,
      high: Math.max(open, close) + wick,
      low: Math.max(inst.pip / 10, Math.min(open, close) - wick * 0.85),
      close,
      volume: Math.round(80 + rng() * 1100 * energy),
    });
    price = close;
  }
  return candles;
}

function withLiveWobble(candles: Candle[], inst: InstrumentSpec, now: number): Candle[] {
  if (!candles.length) return candles;
  const copy = candles.map((candle) => ({ ...candle }));
  const last = { ...copy[copy.length - 1] };
  const wobble = Math.sin(now / 3200) * inst.vol * 0.28;
  const price = Math.max(inst.pip, last.close + wobble);
  last.close = price;
  last.high = Math.max(last.high, price);
  last.low = Math.min(last.low, price);
  copy[copy.length - 1] = last;
  return copy;
}

export function getSimulatedCandles(symbol: string, now = Date.now(), days = 40): Candle[] {
  const cached = tapeCache.get(symbol);
  const fresh = cached && now - cached.builtAt < 30_000 ? cached.candles : buildSimulatedTape(symbol, now, days);
  if (!cached || now - cached.builtAt >= 30_000) tapeCache.set(symbol, { builtAt: now, candles: fresh });
  return withLiveWobble(fresh, getInstrument(symbol), now);
}

export function clearTapeCache(): void {
  tapeCache.clear();
}

export function swingLevels(candles: Candle[]): { support: number[]; resistance: number[] } {
  const lookback = 4;
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i += 1) {
    let pivotHigh = true;
    let pivotLow = true;
    for (let j = i - lookback; j <= i + lookback; j += 1) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) pivotHigh = false;
      if (candles[j].low <= candles[i].low) pivotLow = false;
    }
    if (pivotHigh) highs.push(candles[i].high);
    if (pivotLow) lows.push(candles[i].low);
  }
  const last = candles[candles.length - 1]?.close ?? 0;
  return {
    resistance: cluster(highs.filter((level) => level > last)).slice(-2),
    support: cluster(lows.filter((level) => level < last)).slice(-2),
  };
}

function cluster(levels: number[]): number[] {
  const sorted = [...levels].sort((a, b) => a - b);
  const out: number[] = [];
  for (const level of sorted) {
    const prev = out[out.length - 1];
    if (prev != null && Math.abs(level - prev) / Math.abs(prev) < 0.0008) out[out.length - 1] = (prev + level) / 2;
    else out.push(level);
  }
  return out;
}

export interface IndicatorPack {
  ema9: number[];
  ema21: number[];
  ema50: number[];
  rsi: number[];
  macd: { line: number[]; signal: number[]; hist: number[] };
  atr: number[];
}

export function packIndicators(candles: Candle[]): IndicatorPack {
  const closes = candles.map((candle) => candle.close);
  return {
    ema9: ema(closes, 9),
    ema21: ema(closes, 21),
    ema50: ema(closes, 50),
    rsi: rsi(closes, 14),
    macd: macd(closes),
    atr: atr(candles, 14),
  };
}

export function seriesForTimeframe(symbol: string, timeframe: string, now = Date.now(), days = 40): Candle[] {
  const base = getSimulatedCandles(symbol, now, days);
  return resample(base, timeframeMinutes(timeframe));
}

const BINANCE_INTERVAL: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
};

export async function fetchBinanceKlines(binanceSymbol: string, timeframe: string): Promise<Candle[]> {
  const interval = BINANCE_INTERVAL[timeframe] ?? "5m";
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=${interval}&limit=1000`;
  const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error(`Binance klines ${response.status}`);
  const rows = (await response.json()) as unknown[];
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const item = row as [number, string, string, string, string, string];
    return {
      time: Math.floor(item[0] / 1000),
      open: Number(item[1]),
      high: Number(item[2]),
      low: Number(item[3]),
      close: Number(item[4]),
      volume: Number(item[5]),
    };
  });
}

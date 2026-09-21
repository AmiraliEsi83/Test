import { INSTRUMENTS } from "@harsi/shared";
import type { Candle } from "./indicators.js";
import { getSessionState } from "./sessions.js";

function mulberry32(a: number) {
  return function rng() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSymbol(symbol: string) {
  return symbol.split("").reduce((s, c) => s + c.charCodeAt(0) * 13, 42);
}

export function generateHistory(symbol: string, bars = 480, now = Date.now(), stepMs = 60_000) {
  const inst = INSTRUMENTS[symbol];
  if (!inst) throw new Error(`Unknown instrument ${symbol}`);
  const rng = mulberry32(hashSymbol(symbol) + Math.floor(now / 86400000));
  let price = inst.base * (0.997 + rng() * 0.006);
  const candles: Candle[] = [];
  let asian = { high: -Infinity, low: Infinity, set: false };

  for (let i = bars; i >= 1; i -= 1) {
    const time = Math.floor((now - i * stepMs) / 1000);
    const date = new Date(time * 1000);
    const session = getSessionState(date, false);
    const shock = (rng() - 0.5) * inst.vol * session.volatility * 2.2;
    const drift = (inst.base - price) * 0.002;
    const open = price;
    price = Math.max(inst.pip, price + shock + drift);
    const high = Math.max(open, price) + rng() * inst.vol * 0.6;
    const low = Math.min(open, price) - rng() * inst.vol * 0.6;
    const close = price;
    const volume = Math.round(80 + rng() * 420 * session.volatility);
    candles.push({ time, open, high, low, close, volume });
    if (session.key === "asia" || session.key === "london-prep") {
      asian.high = Math.max(asian.high, high);
      asian.low = Math.min(asian.low, low);
      asian.set = true;
    }
  }

  if (!asian.set || !Number.isFinite(asian.high)) {
    const slice = candles.slice(-120);
    asian = {
      high: Math.max(...slice.map((c) => c.high)),
      low: Math.min(...slice.map((c) => c.low)),
      set: true,
    };
  }

  const last = candles[candles.length - 1];
  const mid = (asian.high + asian.low) / 2;
  const target = mid - 22 * inst.pip;
  last.close = last.close * 0.35 + target * 0.65;
  last.low = Math.min(last.low, last.close);
  last.high = Math.max(last.high, last.close);
  last.open = candles[candles.length - 2]?.close || last.close;

  return {
    candles,
    asian,
    lastPrice: last.close,
    lastTime: last.time,
    feed: "SIMULATED" as const,
  };
}

export function nextTick(symbol: string, lastPrice: number, asian: { high: number; low: number } | null, forceLondonWindow: boolean) {
  const inst = INSTRUMENTS[symbol];
  const session = getSessionState(new Date(), forceLondonWindow);
  const noise = (Math.random() - 0.5) * inst.vol * session.volatility * 1.6;
  let mean = 0;
  if (asian && forceLondonWindow) {
    const mid = (asian.high + asian.low) / 2;
    const dist = lastPrice - mid;
    const buyBand = mid - 22 * inst.pip;
    const sellBand = mid + 22 * inst.pip;
    if (Math.abs(dist) < 12 * inst.pip) {
      mean = ((Math.random() > 0.5 ? buyBand : sellBand) - lastPrice) * 0.08;
    } else {
      mean = (mid - lastPrice) * 0.01;
    }
  } else if (asian) {
    const mid = (asian.high + asian.low) / 2;
    mean = (mid - lastPrice) * 0.008;
  }
  const price = Math.max(inst.pip, lastPrice + noise + mean);
  return { price, session };
}

export function upsertCandle(candles: Candle[], price: number, tsSec: number, volume = 12, bucketSec = 60): Candle[] {
  const last = candles[candles.length - 1];
  const bucket = Math.floor(tsSec / bucketSec) * bucketSec;
  if (last && last.time === bucket) {
    const updated = {
      ...last,
      high: Math.max(last.high, price),
      low: Math.min(last.low, price),
      close: price,
      volume: last.volume + volume,
    };
    return [...candles.slice(0, -1), updated];
  }
  return [
    ...candles,
    {
      time: bucket,
      open: last ? last.close : price,
      high: price,
      low: price,
      close: price,
      volume,
    },
  ].slice(-800);
}

export async function fetchBinanceKlines(binanceSymbol: string, interval = "1m", limit = 400): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines ${res.status}`);
  const rows = (await res.json()) as [number, string, string, string, string, string][];
  return rows.map((r) => ({
    time: Math.floor(r[0] / 1000),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }));
}

export interface MarketDataProvider {
  name: string;
  label: "SIMULATED" | "PUBLIC FEED" | "BROKER FEED";
  candles(symbol: string, bars?: number): Promise<{ candles: Candle[]; asian: { high: number; low: number }; lastPrice: number; feed: string }>;
}

export class SimulatedMarketData implements MarketDataProvider {
  name = "simulated";
  label = "SIMULATED" as const;
  async candles(symbol: string, bars = 480) {
    return generateHistory(symbol, bars);
  }
}

export class PublicCryptoMarketData implements MarketDataProvider {
  name = "binance-public";
  label = "PUBLIC FEED" as const;
  async candles(symbol: string, bars = 400) {
    const inst = INSTRUMENTS[symbol];
    if (!inst?.binance) {
      return { ...generateHistory(symbol, bars), feed: "SIMULATED" };
    }
    try {
      const candles = await fetchBinanceKlines(inst.binance, "1m", bars);
      const slice = candles.slice(-120);
      const asian = {
        high: Math.max(...slice.map((c) => c.high)),
        low: Math.min(...slice.map((c) => c.low)),
      };
      return { candles, asian, lastPrice: candles[candles.length - 1].close, feed: "PUBLIC FEED" };
    } catch {
      return { ...generateHistory(symbol, bars), feed: "SIMULATED" };
    }
  }
}

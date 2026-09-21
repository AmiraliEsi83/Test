import { getInstrument, timeframeMinutes, type Candle } from "@harsi/shared";
import { fetchBinanceKlines, seriesForTimeframe } from "@harsi/market-data";
import { quoteFromMid } from "@harsi/trading-engine";

export type MarketSource = "simulated" | "binance-public";

const binanceCache = new Map<string, { at: number; candles: Candle[] }>();
let binancePausedUntil = 0;

export const runtimeState = {
  lastEngineAt: null as number | null,
  lastEngineError: null as string | null,
  sources: new Set<MarketSource>(),
};

export async function loadSeries(symbol: string, timeframe: string, now = Date.now()) {
  const inst = getInstrument(symbol);
  if (inst.binance && Date.now() > binancePausedUntil) {
    const key = `${inst.binance}:${timeframe}`;
    const cached = binanceCache.get(key);
    if (cached && now - cached.at < 15_000) {
      runtimeState.sources.add("binance-public");
      return { candles: cached.candles, source: "binance-public" as const };
    }
    try {
      const candles = await fetchBinanceKlines(inst.binance, timeframe);
      if (candles.length > 30) {
        binanceCache.set(key, { at: now, candles });
        runtimeState.sources.add("binance-public");
        return { candles, source: "binance-public" as const };
      }
    } catch {
      binancePausedUntil = Date.now() + 60_000;
    }
  }
  runtimeState.sources.add("simulated");
  return { candles: seriesForTimeframe(symbol, timeframe, now).slice(-500), source: "simulated" as const };
}

export function quoteFor(symbol: string, candles: Candle[]) {
  const inst = getInstrument(symbol);
  const mid = candles[candles.length - 1]?.close ?? inst.base;
  return quoteFromMid(mid, inst.pip, inst.spreadPips);
}

export function bucketSeconds(timeframe: string) {
  return timeframeMinutes(timeframe) * 60;
}

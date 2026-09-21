import {
  asianRangeFromCandles,
  getInstrument,
  inHarsiWindow,
  londonDayKey,
  roundPrice,
  zonedParts,
  type AsianRange,
  type Candle,
  type Side,
} from "@harsi/shared";
import { atr, ema, macd, rsi, sma } from "@harsi/market-data";

export interface Check {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface StrategySignal {
  strategyId: string;
  symbol: string;
  timeframe: string;
  side: Side;
  entry: number;
  stop: number;
  target: number;
  dedupeKey: string;
  checks: Check[];
  reasons: string[];
  timestamp: number;
  indicators: Record<string, number>;
}

export interface StrategyContext {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  higherCandles?: Candle[];
  asian?: AsianRange | null;
  now: Date;
  params: Record<string, unknown>;
  fired: { buy: boolean; sell: boolean };
  signalsToday?: number;
}

export interface StrategyResult {
  signal: StrategySignal | null;
  checks: Check[];
  snapshot: Record<string, number | string | null>;
}

export interface StrategyModule {
  id: string;
  name: string;
  summary: string;
  disclaimer: string;
  defaults: Record<string, unknown>;
  evaluate(ctx: StrategyContext): StrategyResult;
}

function num(params: Record<string, unknown>, key: string, fallback: number): number {
  const value = params[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function days(params: Record<string, unknown>, fallback: string[]): string[] {
  const value = params.allowedDays;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value as string[];
  return fallback;
}

function lastFinite(values: number[]): number {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (Number.isFinite(values[i])) return values[i];
  }
  return Number.NaN;
}

export const londonHarsi: StrategyModule = {
  id: "london-harsi",
  name: "London HARSI",
  summary:
    "Around the London open, the first HARSI print inside −30 to −15 can alert a buy. The first print inside +15 to +30 can alert a sell.",
  disclaimer: "A research signal based on the Asian range. It does not predict the London open and does not guarantee a profit.",
  defaults: {
    buyLow: -30,
    buyHigh: -15,
    sellLow: 15,
    sellHigh: 30,
    windowStart: 7 * 60 + 45,
    windowEnd: 8 * 60 + 5,
    stopPips: 22,
    targetPips: 34,
    maxSignals: 2,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  evaluate(ctx) {
    const defaults = londonHarsi.defaults;
    const buyLow = num(ctx.params, "buyLow", defaults.buyLow as number);
    const buyHigh = num(ctx.params, "buyHigh", defaults.buyHigh as number);
    const sellLow = num(ctx.params, "sellLow", defaults.sellLow as number);
    const sellHigh = num(ctx.params, "sellHigh", defaults.sellHigh as number);
    const windowStart = num(ctx.params, "windowStart", defaults.windowStart as number);
    const windowEnd = num(ctx.params, "windowEnd", defaults.windowEnd as number);
    const stopPips = num(ctx.params, "stopPips", defaults.stopPips as number);
    const targetPips = num(ctx.params, "targetPips", defaults.targetPips as number);
    const maxSignals = num(ctx.params, "maxSignals", defaults.maxSignals as number);
    const allowed = days(ctx.params, defaults.allowedDays as string[]);
    const parts = zonedParts(ctx.now, "Europe/London");
    const inst = getInstrument(ctx.symbol);
    const asian = ctx.asian === undefined ? asianRangeFromCandles(ctx.candles, ctx.now) : ctx.asian;
    const dayOk = allowed.includes(parts.weekday);
    const windowOk = inHarsiWindow(ctx.now, windowStart, windowEnd);
    const price = ctx.candles.length ? ctx.candles[ctx.candles.length - 1].close : Number.NaN;
    const mid = asian ? asian.mid : Number.NaN;
    const harsi = asian && Number.isFinite(price) ? (price - mid) / inst.pip : Number.NaN;
    const buyZone = Number.isFinite(harsi) && harsi >= buyLow && harsi <= buyHigh;
    const sellZone = Number.isFinite(harsi) && harsi >= sellLow && harsi <= sellHigh;
    const side: Side | null = buyZone ? "buy" : sellZone ? "sell" : null;
    const fired = side === "buy" ? ctx.fired.buy : side === "sell" ? ctx.fired.sell : false;
    const underCap = (ctx.signalsToday ?? 0) < maxSignals;
    const checks: Check[] = [
      { id: "day", label: "Allowed weekday", pass: dayOk, detail: parts.weekday },
      {
        id: "window",
        label: "London T-15 window",
        pass: windowOk,
        detail: windowOk ? "Inside the configured London window" : "Outside the London window",
      },
      {
        id: "asian",
        label: "Asian range available",
        pass: Boolean(asian),
        detail: asian ? `${asian.bars} bars before 07:45 London` : "Not enough Asian bars yet",
      },
      {
        id: "band",
        label: "HARSI inside a signal band",
        pass: Boolean(side),
        detail: Number.isFinite(harsi) ? `${harsi.toFixed(1)} pips from the Asian midpoint` : "No print",
      },
      {
        id: "first",
        label: "First print of this side today",
        pass: Boolean(side) && !fired,
        detail: !side ? "No side" : fired ? "This side already fired today" : "First qualifying print",
      },
      {
        id: "cap",
        label: "Under the daily signal cap",
        pass: underCap,
        detail: `${ctx.signalsToday ?? 0} of ${maxSignals}`,
      },
    ];
    const snapshot = {
      harsi: Number.isFinite(harsi) ? Number(harsi.toFixed(2)) : null,
      asianMid: asian ? asian.mid : null,
      price: Number.isFinite(price) ? price : null,
    };
    if (!side || checks.some((check) => !check.pass)) {
      return { signal: null, checks, snapshot };
    }
    const entry = roundPrice(ctx.symbol, price);
    const stopDist = stopPips * inst.pip;
    const targetDist = targetPips * inst.pip;
    const stop = roundPrice(ctx.symbol, side === "buy" ? entry - stopDist : entry + stopDist);
    const target = roundPrice(ctx.symbol, side === "buy" ? entry + targetDist : entry - targetDist);
    const direction = side === "buy" ? `between ${buyLow} and ${buyHigh}` : `between +${sellLow} and +${sellHigh}`;
    return {
      checks,
      snapshot,
      signal: {
        strategyId: "london-harsi",
        symbol: ctx.symbol,
        timeframe: ctx.timeframe,
        side,
        entry,
        stop,
        target,
        dedupeKey: `london-harsi:${ctx.symbol}:${londonDayKey(ctx.now)}:${side}`,
        checks,
        reasons: [
          `First HARSI print at ${harsi.toFixed(1)} pips, ${direction}, during the London window.`,
          "HARSI is the distance from the last price to the Asian midpoint, measured in pips.",
          `Stop ${stopPips} pips and target ${targetPips} pips are the configured distances, not a promise of either being hit.`,
        ],
        timestamp: ctx.now.getTime(),
        indicators: { harsi, asianMid: mid, asianHigh: asian!.high, asianLow: asian!.low },
      },
    };
  },
};

export interface PulseMetrics {
  ema9: number;
  ema21: number;
  ema50: number;
  rsi: number;
  macdHist: number;
  macdPrev: number;
  atr: number;
  atrAvg: number;
  close: number;
}

export function pulseChecks(metrics: PulseMetrics): { buy: Check[]; sell: Check[]; side: Side | null } {
  const fmt = (value: number) => (Number.isFinite(value) ? value.toFixed(5) : "—");
  const buy: Check[] = [
    {
      id: "ema",
      label: "EMA 9 > EMA 21",
      pass: metrics.ema9 > metrics.ema21,
      detail: `EMA 9 ${fmt(metrics.ema9)} · EMA 21 ${fmt(metrics.ema21)}`,
    },
    {
      id: "rsi",
      label: "RSI between 52 and 68",
      pass: metrics.rsi >= 52 && metrics.rsi <= 68,
      detail: `RSI ${Number.isFinite(metrics.rsi) ? metrics.rsi.toFixed(1) : "—"}`,
    },
    {
      id: "macd",
      label: "MACD histogram bullish and not fading",
      pass: metrics.macdHist > 0 && metrics.macdHist >= metrics.macdPrev,
      detail: `Hist ${Number.isFinite(metrics.macdHist) ? metrics.macdHist.toExponential(2) : "—"}`,
    },
    {
      id: "atr",
      label: "ATR expanding versus its 20-bar average",
      pass: metrics.atrAvg > 0 && metrics.atr > metrics.atrAvg * 1.05,
      detail: `ATR ${fmt(metrics.atr)} · average ${fmt(metrics.atrAvg)}`,
    },
    {
      id: "trend",
      label: "Close above EMA 50",
      pass: metrics.close > metrics.ema50,
      detail: `Close ${fmt(metrics.close)} · EMA 50 ${fmt(metrics.ema50)}`,
    },
  ];
  const sell: Check[] = [
    {
      id: "ema",
      label: "EMA 9 < EMA 21",
      pass: metrics.ema9 < metrics.ema21,
      detail: `EMA 9 ${fmt(metrics.ema9)} · EMA 21 ${fmt(metrics.ema21)}`,
    },
    {
      id: "rsi",
      label: "RSI between 32 and 48",
      pass: metrics.rsi >= 32 && metrics.rsi <= 48,
      detail: `RSI ${Number.isFinite(metrics.rsi) ? metrics.rsi.toFixed(1) : "—"}`,
    },
    {
      id: "macd",
      label: "MACD histogram bearish and not fading",
      pass: metrics.macdHist < 0 && metrics.macdHist <= metrics.macdPrev,
      detail: `Hist ${Number.isFinite(metrics.macdHist) ? metrics.macdHist.toExponential(2) : "—"}`,
    },
    {
      id: "atr",
      label: "ATR expanding versus its 20-bar average",
      pass: metrics.atrAvg > 0 && metrics.atr > metrics.atrAvg * 1.05,
      detail: `ATR ${fmt(metrics.atr)} · average ${fmt(metrics.atrAvg)}`,
    },
    {
      id: "trend",
      label: "Close below EMA 50",
      pass: metrics.close < metrics.ema50,
      detail: `Close ${fmt(metrics.close)} · EMA 50 ${fmt(metrics.ema50)}`,
    },
  ];
  const side: Side | null = buy.every((check) => check.pass) ? "buy" : sell.every((check) => check.pass) ? "sell" : null;
  return { buy, sell, side };
}

export function metricsFromCandles(candles: Candle[]): PulseMetrics | null {
  if (candles.length < 60) return null;
  const closes = candles.map((candle) => candle.close);
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const ema50 = ema(closes, 50);
  const rsiValues = rsi(closes, 14);
  const macdValues = macd(closes);
  const atrValues = atr(candles, 14);
  const i = candles.length - 1;
  const atrWindow = atrValues.slice(Math.max(0, i - 19), i + 1).filter((value) => Number.isFinite(value));
  const atrAvg = atrWindow.length ? atrWindow.reduce((sum, value) => sum + value, 0) / atrWindow.length : Number.NaN;
  return {
    ema9: ema9[i],
    ema21: ema21[i],
    ema50: ema50[i],
    rsi: rsiValues[i],
    macdHist: macdValues.hist[i],
    macdPrev: macdValues.hist[i - 1],
    atr: atrValues[i],
    atrAvg,
    close: closes[i],
  };
}

export const pulseConfluence: StrategyModule = {
  id: "pulse-confluence",
  name: "Pulse Confluence",
  summary: "Buy or sell only when EMA structure, RSI location, MACD direction, ATR expansion, and the EMA 50 filter all agree.",
  disclaimer: "Every line below is a standard indicator rule. Agreement is not a probability of profit.",
  defaults: {
    cooldownMinutes: 30,
    stopAtr: 1.5,
    targetAtr: 2.5,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  evaluate(ctx) {
    const cooldown = num(ctx.params, "cooldownMinutes", 30);
    const stopAtr = num(ctx.params, "stopAtr", 1.5);
    const targetAtr = num(ctx.params, "targetAtr", 2.5);
    const metrics = metricsFromCandles(ctx.candles);
    if (!metrics) {
      return {
        signal: null,
        checks: [{ id: "history", label: "Enough closed bars", pass: false, detail: "Need at least 60 bars" }],
        snapshot: {},
      };
    }
    const decision = pulseChecks(metrics);
    const side = decision.side;
    const buyScore = decision.buy.filter((check) => check.pass).length;
    const sellScore = decision.sell.filter((check) => check.pass).length;
    const checks = side === "sell" || (side == null && sellScore > buyScore) ? decision.sell : decision.buy;
    const fired = side === "buy" ? ctx.fired.buy : side === "sell" ? ctx.fired.sell : false;
    const ready: Check = {
      id: "cooldown",
      label: "Cooldown clear",
      pass: Boolean(side) && !fired,
      detail: !side ? "Conditions do not agree" : fired ? "A signal already fired in this cooldown" : "Clear",
    };
    const allChecks = [...checks, ready];
    const snapshot = {
      rsi: Number(metrics.rsi.toFixed(2)),
      macdHist: metrics.macdHist,
      atr: metrics.atr,
      ema9: metrics.ema9,
      ema21: metrics.ema21,
    };
    if (!side || allChecks.some((check) => !check.pass) || !Number.isFinite(metrics.atr) || metrics.atr <= 0) {
      return { signal: null, checks: allChecks, snapshot };
    }
    const entry = roundPrice(ctx.symbol, metrics.close);
    const distance = metrics.atr * (side === "buy" ? 1 : 1);
    const stop = roundPrice(ctx.symbol, side === "buy" ? entry - stopAtr * distance : entry + stopAtr * distance);
    const target = roundPrice(ctx.symbol, side === "buy" ? entry + targetAtr * distance : entry - targetAtr * distance);
    const bucket = Math.floor(ctx.now.getTime() / (cooldown * 60000));
    return {
      checks: allChecks,
      snapshot,
      signal: {
        strategyId: "pulse-confluence",
        symbol: ctx.symbol,
        timeframe: ctx.timeframe,
        side,
        entry,
        stop,
        target,
        dedupeKey: `pulse:${ctx.symbol}:${ctx.timeframe}:${side}:${bucket}`,
        checks: allChecks,
        reasons: allChecks.filter((check) => check.pass).map((check) => `${check.label}: ${check.detail}`),
        timestamp: ctx.now.getTime(),
        indicators: {
          rsi: metrics.rsi,
          macdHist: metrics.macdHist,
          atr: metrics.atr,
          ema9: metrics.ema9,
          ema21: metrics.ema21,
          ema50: metrics.ema50,
        },
      },
    };
  },
};

export const breakoutTrend: StrategyModule = {
  id: "breakout-trend",
  name: "Breakout + Trend",
  summary:
    "A research breakout: higher-timeframe EMA trend, a close through the Asian high or low, ATR expansion, and volume above its recent average.",
  disclaimer: "Breakouts fail often. This module only reports whether the listed rules are true on closed bars.",
  defaults: {
    volumeMultiple: 1.2,
    atrMultiple: 1.05,
    stopAtr: 1.2,
    targetR: 2,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  evaluate(ctx) {
    const volumeMultiple = num(ctx.params, "volumeMultiple", 1.2);
    const atrMultiple = num(ctx.params, "atrMultiple", 1.05);
    const stopAtr = num(ctx.params, "stopAtr", 1.2);
    const targetR = num(ctx.params, "targetR", 2);
    const allowed = days(ctx.params, ["Mon", "Tue", "Wed", "Thu", "Fri"]);
    const parts = zonedParts(ctx.now, "Europe/London");
    const asian = ctx.asian === undefined ? asianRangeFromCandles(ctx.candles, ctx.now) : ctx.asian;
    const higher = ctx.higherCandles && ctx.higherCandles.length >= 55 ? ctx.higherCandles : null;
    const metrics = metricsFromCandles(ctx.candles);
    const close = ctx.candles.length ? ctx.candles[ctx.candles.length - 1].close : Number.NaN;
    const volume = ctx.candles.length ? ctx.candles[ctx.candles.length - 1].volume : 0;
    const volAvg = sma(
      ctx.candles.map((candle) => candle.volume),
      20
    );
    const avgVol = lastFinite(volAvg);
    let htfUp = false;
    let htfDown = false;
    if (higher) {
      const closes = higher.map((candle) => candle.close);
      const ema20 = ema(closes, 20);
      const ema50 = ema(closes, 50);
      const i = closes.length - 1;
      htfUp = ema20[i] > ema50[i];
      htfDown = ema20[i] < ema50[i];
    }
    const brokeHigh = Boolean(asian) && close > asian!.high;
    const brokeLow = Boolean(asian) && close < asian!.low;
    const atrOk = Boolean(metrics) && metrics!.atrAvg > 0 && metrics!.atr > metrics!.atrAvg * atrMultiple;
    const volumeOk = avgVol > 0 && volume > avgVol * volumeMultiple;
    const dayOk = allowed.includes(parts.weekday);
    const buyPass = dayOk && Boolean(higher) && htfUp && brokeHigh && atrOk && volumeOk && !ctx.fired.buy;
    const sellPass = dayOk && Boolean(higher) && htfDown && brokeLow && atrOk && volumeOk && !ctx.fired.sell;
    const side: Side | null = buyPass ? "buy" : sellPass ? "sell" : null;
    const checks: Check[] = [
      { id: "day", label: "Allowed weekday", pass: dayOk, detail: parts.weekday },
      {
        id: "htf",
        label: "Higher-timeframe EMA 20 vs EMA 50",
        pass: Boolean(higher) && (htfUp || htfDown),
        detail: !higher ? "Higher-timeframe bars were not supplied" : htfUp ? "EMA 20 above EMA 50" : htfDown ? "EMA 20 below EMA 50" : "Flat",
      },
      {
        id: "level",
        label: "Close through the Asian high or low",
        pass: brokeHigh || brokeLow,
        detail: !asian ? "Asian range unavailable" : `Close ${close.toFixed(5)} · range ${asian.low.toFixed(5)}–${asian.high.toFixed(5)}`,
      },
      {
        id: "atr",
        label: "ATR expansion",
        pass: atrOk,
        detail: metrics ? `ATR ${metrics.atr.toFixed(5)} vs average ${metrics.atrAvg.toFixed(5)}` : "Not enough bars",
      },
      {
        id: "volume",
        label: "Volume above its 20-bar average",
        pass: volumeOk,
        detail: `Volume ${Math.round(volume)} vs average ${Math.round(avgVol || 0)}`,
      },
      {
        id: "align",
        label: "Trend and breakout point the same way",
        pass: (htfUp && brokeHigh) || (htfDown && brokeLow),
        detail: side ? side.toUpperCase() : "No aligned break",
      },
      {
        id: "first",
        label: "First break this session",
        pass: side === "buy" ? !ctx.fired.buy : side === "sell" ? !ctx.fired.sell : false,
        detail: side ? "Clear" : "No signal",
      },
    ];
    const snapshot = { close, volume, atr: metrics?.atr ?? null };
    if (!side || !metrics) return { signal: null, checks, snapshot };
    const entry = roundPrice(ctx.symbol, close);
    const risk = stopAtr * metrics.atr;
    const stop = roundPrice(ctx.symbol, side === "buy" ? entry - risk : entry + risk);
    const target = roundPrice(
      ctx.symbol,
      side === "buy" ? entry + risk * targetR : entry - risk * targetR
    );
    return {
      checks,
      snapshot,
      signal: {
        strategyId: "breakout-trend",
        symbol: ctx.symbol,
        timeframe: ctx.timeframe,
        side,
        entry,
        stop,
        target,
        dedupeKey: `breakout:${ctx.symbol}:${londonDayKey(ctx.now)}:${side}`,
        checks,
        reasons: [
          side === "buy"
            ? "Higher-timeframe EMA 20 is above EMA 50 and price closed above the Asian high."
            : "Higher-timeframe EMA 20 is below EMA 50 and price closed below the Asian low.",
          "ATR is above its recent average and volume is above its 20-bar average.",
          "Stop and target are multiples of ATR. They are position-management marks, not expected outcomes.",
        ],
        timestamp: ctx.now.getTime(),
        indicators: { atr: metrics.atr, close, volume },
      },
    };
  },
};

export const STRATEGIES: StrategyModule[] = [londonHarsi, pulseConfluence, breakoutTrend];

export function getStrategy(id: string): StrategyModule | undefined {
  return STRATEGIES.find((strategy) => strategy.id === id);
}

export function mergeParams(strategy: StrategyModule, stored: Record<string, unknown>): Record<string, unknown> {
  return { ...strategy.defaults, ...stored };
}

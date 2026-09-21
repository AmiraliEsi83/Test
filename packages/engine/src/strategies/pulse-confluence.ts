import { fromPips, toPips } from "@harsi/shared";
import { atr, ema, macd, rsi } from "../indicators.js";
import { weekdayShort } from "../sessions.js";
import type { StrategyContext, StrategyModule } from "./types.js";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export const pulseConfluence: StrategyModule = {
  id: "pulse-confluence",
  name: "Pulse Confluence",
  badge: "Desk rec.",
  summary:
    "EMA 9/21 structure, RSI location, MACD expansion, and ATR energy. Fires only when the stack agrees — every check is shown on the signal.",
  rules: [
    "Trend: EMA 9 vs EMA 21 defines directional bias.",
    "Location: RSI with-trend mid-range or extremes.",
    "Impulse: MACD histogram must expand in the trade direction.",
    "Energy: ATR must be expanding versus its recent average.",
    "Score ≥ threshold with a minimum edge vs the other side.",
    "Stops and targets scale with ATR (1.4× / 2.1×).",
    "Not a black-box confidence score — conditions are listed.",
  ],
  defaultConfig: {},
  evaluate(ctx: StrategyContext) {
    const cfg = ctx.config as {
      enabled: boolean;
      emaFast: number;
      emaSlow: number;
      rsiPeriod: number;
      scoreThreshold: number;
      edge: number;
      allowedDays: string[];
    };
    const candles = ctx.candles;
    if (!cfg.enabled || !candles || candles.length < 40) {
      return {
        diagnostics: { score: 50, reasons: [], ready: false },
        signal: null,
      };
    }
    const day = weekdayShort(ctx.now);
    if (!(cfg.allowedDays || []).includes(day) && (cfg.allowedDays || []).length) {
      return { diagnostics: { score: 50, blocked: "weekday" }, signal: null };
    }

    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);
    const eFast = ema(closes, cfg.emaFast || 9);
    const eSlow = ema(closes, cfg.emaSlow || 21);
    const r = rsi(closes, cfg.rsiPeriod || 14);
    const m = macd(closes);
    const a = atr(candles, 14);
    const i = closes.length - 1;
    const price = closes[i];
    const atrNow = a[i];
    const atrAvg = a.slice(-40).reduce((s, v) => s + v, 0) / Math.min(40, a.length);
    const volExpand = atrAvg ? atrNow / atrAvg : 1;
    const rsiNow = r[i];
    const macdNow = m.hist[i];
    const macdPrev = m.hist[i - 1] || 0;
    const emaBull = eFast[i] > eSlow[i];
    const macdBull = macdNow > 0 && macdNow > macdPrev;
    const macdBear = macdNow < 0 && macdNow < macdPrev;
    const trendOkLong = emaBull;
    const trendOkShort = !emaBull;
    const rsiLong = rsiNow > 48 && rsiNow < 70;
    const rsiShort = rsiNow < 52 && rsiNow > 30;
    const atrOk = volExpand > 1.08;

    let long = 50;
    let short = 50;
    if (emaBull) {
      long += 16;
      short -= 10;
    } else {
      short += 16;
      long -= 10;
    }
    if (rsiNow <= 32) long += 18;
    else if (rsiNow >= 68) short += 18;
    else if (rsiNow > 50 && emaBull) long += 8;
    else if (rsiNow < 50 && !emaBull) short += 8;
    if (macdBull) long += 14;
    else if (macdBear) short += 14;
    if (volExpand > 1.15) {
      if (long > short) long += 10;
      else short += 10;
    } else if (volExpand < 0.75) {
      long -= 8;
      short -= 8;
    }
    const slope = closes[i] - closes[Math.max(0, i - 8)];
    if (toPips(ctx.symbol, slope) > 8) long += 6;
    if (toPips(ctx.symbol, slope) < -8) short += 6;
    long = clamp(long, 0, 100);
    short = clamp(short, 0, 100);
    const score = Math.round(50 + (long - short) / 2);
    const threshold = cfg.scoreThreshold ?? 74;
    const edge = cfg.edge ?? 18;

    const longConditions = [
      { label: `EMA ${cfg.emaFast || 9} > EMA ${cfg.emaSlow || 21}`, detail: `${eFast[i].toFixed(5)} vs ${eSlow[i].toFixed(5)}`, passed: emaBull },
      { label: "RSI", detail: rsiNow.toFixed(1), passed: rsiLong || rsiNow <= 32 },
      { label: "MACD bullish", detail: `hist ${macdNow.toFixed(5)}`, passed: macdBull || (macdNow > 0 && emaBull) },
      { label: "ATR expansion", detail: `${volExpand.toFixed(2)}× average`, passed: atrOk },
      { label: "Trend filter", detail: emaBull ? "bullish EMA stack" : "bearish EMA stack", passed: trendOkLong },
    ];
    const shortConditions = [
      { label: `EMA ${cfg.emaFast || 9} < EMA ${cfg.emaSlow || 21}`, detail: `${eFast[i].toFixed(5)} vs ${eSlow[i].toFixed(5)}`, passed: !emaBull },
      { label: "RSI", detail: rsiNow.toFixed(1), passed: rsiShort || rsiNow >= 68 },
      { label: "MACD bearish", detail: `hist ${macdNow.toFixed(5)}`, passed: macdBear || (macdNow < 0 && !emaBull) },
      { label: "ATR expansion", detail: `${volExpand.toFixed(2)}× average`, passed: atrOk },
      { label: "Trend filter", detail: !emaBull ? "bearish EMA stack" : "bullish EMA stack", passed: trendOkShort },
    ];

    const slPips = Math.max(12, Math.round(toPips(ctx.symbol, atrNow) * 1.4));
    const tpPips = Math.max(18, Math.round(toPips(ctx.symbol, atrNow) * 2.1));

    let signal = null;
    if (long >= threshold && long - short >= edge) {
      const side = "buy" as const;
      signal = {
        strategyId: "pulse-confluence" as const,
        side,
        symbol: ctx.symbol,
        timeframe: ctx.timeframe,
        entry: price,
        stop: price - fromPips(ctx.symbol, slPips),
        target: price + fromPips(ctx.symbol, tpPips),
        slPips,
        tpPips,
        riskReward: tpPips / slPips,
        reason: longConditions.filter((c) => c.passed).map((c) => c.label).join(" · "),
        conditions: longConditions,
        timestamp: ctx.now.getTime(),
      };
    } else if (short >= threshold && short - long >= edge) {
      const side = "sell" as const;
      signal = {
        strategyId: "pulse-confluence" as const,
        side,
        symbol: ctx.symbol,
        timeframe: ctx.timeframe,
        entry: price,
        stop: price + fromPips(ctx.symbol, slPips),
        target: price - fromPips(ctx.symbol, tpPips),
        slPips,
        tpPips,
        riskReward: tpPips / slPips,
        reason: shortConditions.filter((c) => c.passed).map((c) => c.label).join(" · "),
        conditions: shortConditions,
        timestamp: ctx.now.getTime(),
      };
    }

    return {
      diagnostics: {
        score,
        long: Math.round(long),
        short: Math.round(short),
        rsi: rsiNow,
        macdHist: macdNow,
        ema9: eFast[i],
        ema21: eSlow[i],
        atr: atrNow,
        volExpand,
        volume: volumes[i],
        conditions: signal?.side === "sell" ? shortConditions : longConditions,
      },
      signal,
    };
  },
};

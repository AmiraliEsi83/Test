import { fromPips, toPips } from "@harsi/shared";
import { atr, ema } from "../indicators.js";
import { previousSessionHighLow, weekdayShort } from "../sessions.js";
import type { StrategyContext, StrategyModule } from "./types.js";

export const breakoutTrend: StrategyModule = {
  id: "breakout-trend",
  name: "Breakout + Trend",
  badge: "Research",
  summary:
    "Higher-timeframe trend, previous-session high/low breakout, ATR expansion, and volume confirmation where available.",
  rules: [
    "Higher-timeframe close must be on the correct side of EMA 50.",
    "Price must break the previous session high (long) or low (short).",
    "ATR must be expanding versus its 20-bar average.",
    "Volume, when present, should confirm versus its 20-bar average.",
    "Breakout bar close should finish in the direction of the break.",
    "Research / demo strategy — does not guarantee returns.",
  ],
  defaultConfig: {},
  evaluate(ctx: StrategyContext) {
    const cfg = ctx.config as {
      enabled: boolean;
      htfEma: number;
      atrExpand: number;
      volumeConfirm: number;
      allowedDays: string[];
      session: "london" | "asia" | "ny";
    };
    const candles = ctx.candles;
    if (!cfg.enabled || !candles || candles.length < 50) {
      return { diagnostics: { ready: false }, signal: null };
    }
    const day = weekdayShort(ctx.now);
    const allowed = cfg.allowedDays || ["Mon", "Tue", "Wed", "Thu", "Fri"];
    if (allowed.length && !allowed.includes(day)) {
      return { diagnostics: { blocked: "weekday" }, signal: null };
    }

    const htf = ctx.htfCandles && ctx.htfCandles.length > 30 ? ctx.htfCandles : candles;
    const htfCloses = htf.map((c) => c.close);
    const htfEma = ema(htfCloses, cfg.htfEma || 50);
    const htfTrendUp = htfCloses[htfCloses.length - 1] > htfEma[htfEma.length - 1];
    const range = previousSessionHighLow(candles, cfg.session || "london");
    const last = candles[candles.length - 1];
    const a = atr(candles, 14);
    const atrNow = a[a.length - 1];
    const atrAvg = a.slice(-20).reduce((s, v) => s + v, 0) / Math.min(20, a.length);
    const expand = atrAvg ? atrNow / atrAvg : 1;
    const vols = candles.map((c) => c.volume);
    const volAvg = vols.slice(-20).reduce((s, v) => s + v, 0) / Math.min(20, vols.length);
    const volRatio = volAvg ? last.volume / volAvg : 1;
    const closePos = (last.close - last.low) / Math.max(last.high - last.low, 1e-9);

    const brokeHigh = last.close > range.high;
    const brokeLow = last.close < range.low;
    const atrOk = expand >= (cfg.atrExpand || 1.12);
    const volOk = volRatio >= (cfg.volumeConfirm || 1.1);

    const longConditions = [
      { label: "HTF trend up", detail: `close vs EMA${cfg.htfEma || 50}`, passed: htfTrendUp },
      { label: "Break previous session high", detail: `${last.close} > ${range.high}`, passed: brokeHigh },
      { label: "ATR expansion", detail: `${expand.toFixed(2)}×`, passed: atrOk },
      { label: "Volume confirmation", detail: `${volRatio.toFixed(2)}× avg`, passed: volOk },
      { label: "Close in upper half of bar", detail: `${(closePos * 100).toFixed(0)}%`, passed: closePos >= 0.55 },
    ];
    const shortConditions = [
      { label: "HTF trend down", detail: `close vs EMA${cfg.htfEma || 50}`, passed: !htfTrendUp },
      { label: "Break previous session low", detail: `${last.close} < ${range.low}`, passed: brokeLow },
      { label: "ATR expansion", detail: `${expand.toFixed(2)}×`, passed: atrOk },
      { label: "Volume confirmation", detail: `${volRatio.toFixed(2)}× avg`, passed: volOk },
      { label: "Close in lower half of bar", detail: `${(closePos * 100).toFixed(0)}%`, passed: closePos <= 0.45 },
    ];

    const longPass = longConditions.every((c) => c.passed);
    const shortPass = shortConditions.every((c) => c.passed);
    const slPips = Math.max(10, Math.round(toPips(ctx.symbol, atrNow) * 1.2));
    const tpPips = Math.max(16, Math.round(toPips(ctx.symbol, atrNow) * 2.0));

    if (longPass) {
      return {
        diagnostics: { range, expand, volRatio, htfTrendUp, conditions: longConditions },
        signal: {
          strategyId: "breakout-trend",
          side: "buy",
          symbol: ctx.symbol,
          timeframe: ctx.timeframe,
          entry: last.close,
          stop: last.close - fromPips(ctx.symbol, slPips),
          target: last.close + fromPips(ctx.symbol, tpPips),
          slPips,
          tpPips,
          riskReward: tpPips / slPips,
          reason: "Previous-session high break with HTF uptrend, ATR expansion, and volume confirmation.",
          conditions: longConditions,
          timestamp: ctx.now.getTime(),
        },
      };
    }
    if (shortPass) {
      return {
        diagnostics: { range, expand, volRatio, htfTrendUp, conditions: shortConditions },
        signal: {
          strategyId: "breakout-trend",
          side: "sell",
          symbol: ctx.symbol,
          timeframe: ctx.timeframe,
          entry: last.close,
          stop: last.close + fromPips(ctx.symbol, slPips),
          target: last.close - fromPips(ctx.symbol, tpPips),
          slPips,
          tpPips,
          riskReward: tpPips / slPips,
          reason: "Previous-session low break with HTF downtrend, ATR expansion, and volume confirmation.",
          conditions: shortConditions,
          timestamp: ctx.now.getTime(),
        },
      };
    }
    return {
      diagnostics: { range, expand, volRatio, htfTrendUp, longConditions, shortConditions },
      signal: null,
    };
  },
};

import { fromPips, toPips } from "@harsi/shared";
import { weekdayShort } from "../sessions.js";
import type { StrategyContext, StrategyModule, StrategySignal } from "./types.js";

export function computeHarsi(
  symbol: string,
  price: number,
  asian?: { high: number; low: number } | null
) {
  if (!asian || asian.high == null || asian.low == null) {
    return { value: 0, zone: "flat" as const, mid: price, rangePips: 0, asianHigh: 0, asianLow: 0 };
  }
  const buyMin = -30;
  const buyMax = -15;
  const sellMin = 15;
  const sellMax = 30;
  const mid = (asian.high + asian.low) / 2;
  const value = toPips(symbol, price - mid);
  let zone: "flat" | "buy" | "sell" | "extended-buy" | "extended-sell" = "flat";
  if (value <= buyMax && value >= buyMin) zone = "buy";
  else if (value >= sellMin && value <= sellMax) zone = "sell";
  else if (value < buyMin) zone = "extended-buy";
  else if (value > sellMax) zone = "extended-sell";
  return {
    value,
    zone,
    mid,
    asianHigh: asian.high,
    asianLow: asian.low,
    rangePips: toPips(symbol, asian.high - asian.low),
  };
}

export const londonHarsi: StrategyModule = {
  id: "london-harsi",
  name: "London HARSI",
  badge: "Primary",
  summary:
    "Fifteen minutes before London cash opens, the first HARSI print between −15 and −30 can alert BUY. The first print between +15 and +30 can alert SELL.",
  rules: [
    "Asian session range is measured from 00:00–07:45 London.",
    "HARSI = distance of last price from the Asian midpoint, in pips.",
    "Window opens at London T-15 (configurable) and arms until the first qualifying print of each side.",
    "First HARSI in [buyMin, buyMax] → BUY.",
    "First HARSI in [sellMin, sellMax] → SELL.",
    "Only the first print of each zone fires per London day (unless maxSignals allows more).",
    "Suggested stop/target default 22 / 34 pips — configurable.",
    "Signals are research alerts, not guaranteed fills or returns.",
  ],
  defaultConfig: {},
  evaluate(ctx: StrategyContext) {
    const cfg = ctx.config as {
      enabled: boolean;
      buyMin: number;
      buyMax: number;
      sellMin: number;
      sellMax: number;
      slPips: number;
      tpPips: number;
      allowedDays: string[];
      maxSignalsPerDay: number;
    };
    const harsi = computeHarsi(ctx.symbol, ctx.price, ctx.asian);
    const day = weekdayShort(ctx.now);
    const allowedDay = (cfg.allowedDays || ["Mon", "Tue", "Wed", "Thu", "Fri"]).includes(day);
    const buyBand = harsi.value <= cfg.buyMax && harsi.value >= cfg.buyMin;
    const sellBand = harsi.value >= cfg.sellMin && harsi.value <= cfg.sellMax;

    const conditions = [
      { label: "Strategy enabled", detail: String(cfg.enabled !== false), passed: cfg.enabled !== false },
      { label: "Allowed weekday", detail: day, passed: allowedDay },
      { label: "London T-15 window", detail: ctx.inHarsiWindow ? "inside window" : "outside window", passed: ctx.inHarsiWindow },
      { label: "Asian range set", detail: ctx.asian ? `${ctx.asian.low} – ${ctx.asian.high}` : "missing", passed: Boolean(ctx.asian) },
      {
        label: "HARSI threshold",
        detail: `${harsi.value.toFixed(1)} pips from Asian mid`,
        passed: buyBand || sellBand,
      },
      {
        label: "First print of zone",
        detail: buyBand ? `buy fired=${Boolean(ctx.fired.buy)}` : sellBand ? `sell fired=${Boolean(ctx.fired.sell)}` : "no zone",
        passed: (buyBand && !ctx.fired.buy) || (sellBand && !ctx.fired.sell),
      },
    ];

    const diagnostics = { harsi, conditions, day };

    if (!cfg.enabled || !ctx.inHarsiWindow || !allowedDay || !ctx.asian) {
      return { diagnostics, signal: null };
    }

    const make = (side: "buy" | "sell"): StrategySignal => {
      const slPips = cfg.slPips ?? 22;
      const tpPips = cfg.tpPips ?? 34;
      const stop = side === "buy" ? ctx.price - fromPips(ctx.symbol, slPips) : ctx.price + fromPips(ctx.symbol, slPips);
      const target = side === "buy" ? ctx.price + fromPips(ctx.symbol, tpPips) : ctx.price - fromPips(ctx.symbol, tpPips);
      return {
        strategyId: "london-harsi",
        side,
        symbol: ctx.symbol,
        timeframe: ctx.timeframe,
        entry: ctx.price,
        stop,
        target,
        slPips,
        tpPips,
        riskReward: tpPips / slPips,
        reason:
          side === "buy"
            ? `First HARSI print inside ${cfg.buyMin} to ${cfg.buyMax} during the London T-15 window. Mean-reversion long into the London open.`
            : `First HARSI print inside +${cfg.sellMin} to +${cfg.sellMax} during the London T-15 window. Mean-reversion short into the London open.`,
        conditions,
        timestamp: ctx.now.getTime(),
        harsiValue: harsi.value,
      };
    };

    if (buyBand && !ctx.fired.buy) {
      return { diagnostics, signal: make("buy") };
    }
    if (sellBand && !ctx.fired.sell) {
      return { diagnostics, signal: make("sell") };
    }
    return { diagnostics, signal: null };
  },
};

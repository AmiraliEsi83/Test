import { describe, expect, it } from "vitest";
import { londonHarsi, metricsFromCandles, pulseChecks, breakoutTrend } from "./index";
import type { Candle } from "@harsi/shared";

function candle(time: number, close: number, spread = 0.0002, volume = 100): Candle {
  return { time, open: close - spread / 2, high: close + spread, low: close - spread, close, volume };
}

describe("London HARSI", () => {
  const asian = { high: 1.09, low: 1.08, mid: 1.085, bars: 40 };
  const now = new Date("2026-01-05T07:50:00Z");

  it("buys the first print between -30 and -15 inside the London window", () => {
    const price = 1.085 - 0.0022;
    const result = londonHarsi.evaluate({
      symbol: "EURUSD",
      timeframe: "1m",
      candles: [candle(1, price)],
      asian,
      now,
      params: {},
      fired: { buy: false, sell: false },
      signalsToday: 0,
    });
    expect(result.signal?.side).toBe("buy");
    expect(result.checks.every((check) => check.pass)).toBe(true);
  });

  it("sells the first print between +15 and +30", () => {
    const price = 1.085 + 0.0022;
    const result = londonHarsi.evaluate({
      symbol: "EURUSD",
      timeframe: "1m",
      candles: [candle(1, price)],
      asian,
      now,
      params: {},
      fired: { buy: false, sell: false },
    });
    expect(result.signal?.side).toBe("sell");
  });

  it("does not fire outside the window or after the first print", () => {
    const price = 1.085 - 0.0022;
    const outside = londonHarsi.evaluate({
      symbol: "EURUSD",
      timeframe: "1m",
      candles: [candle(1, price)],
      asian,
      now: new Date("2026-01-05T12:00:00Z"),
      params: {},
      fired: { buy: false, sell: false },
    });
    expect(outside.signal).toBeNull();
    const fired = londonHarsi.evaluate({
      symbol: "EURUSD",
      timeframe: "1m",
      candles: [candle(1, price)],
      asian,
      now,
      params: {},
      fired: { buy: true, sell: false },
    });
    expect(fired.signal).toBeNull();
  });
});

describe("Pulse Confluence", () => {
  it("requires every listed buy check before a buy signal", () => {
    const decision = pulseChecks({
      ema9: 1.2,
      ema21: 1.1,
      ema50: 1.0,
      rsi: 58,
      macdHist: 0.002,
      macdPrev: 0.001,
      atr: 0.0012,
      atrAvg: 0.001,
      close: 1.21,
    });
    expect(decision.side).toBe("buy");
    expect(decision.buy.map((check) => check.label)).toEqual([
      "EMA 9 > EMA 21",
      "RSI between 52 and 68",
      "MACD histogram bullish and not fading",
      "ATR expanding versus its 20-bar average",
      "Close above EMA 50",
    ]);
  });

  it("does not invent a signal when RSI is extended", () => {
    const decision = pulseChecks({
      ema9: 1.2,
      ema21: 1.1,
      ema50: 1.0,
      rsi: 85,
      macdHist: 0.002,
      macdPrev: 0.001,
      atr: 0.0012,
      atrAvg: 0.001,
      close: 1.21,
    });
    expect(decision.side).toBeNull();
    expect(decision.buy.find((check) => check.id === "rsi")?.pass).toBe(false);
  });

  it("computes finite metrics on a rising series", () => {
    const candles: Candle[] = [];
    let price = 1.08;
    for (let i = 0; i < 80; i += 1) {
      price += 0.00015 + (i % 7 === 0 ? 0.0004 : 0);
      candles.push(candle(i * 60, price, 0.0003, 100 + i));
    }
    const metrics = metricsFromCandles(candles);
    expect(metrics).not.toBeNull();
    expect(metrics!.ema9).toBeGreaterThan(metrics!.ema21);
  });
});

describe("Breakout + Trend", () => {
  it("stays flat without a higher-timeframe series", () => {
    const candles = Array.from({ length: 80 }, (_, i) => candle(i * 900, 1.08 + i * 0.0001, 0.0002, 500));
    const result = breakoutTrend.evaluate({
      symbol: "EURUSD",
      timeframe: "15m",
      candles,
      higherCandles: [],
      asian: { high: 1.07, low: 1.06, mid: 1.065, bars: 20 },
      now: new Date("2026-01-05T10:00:00Z"),
      params: {},
      fired: { buy: false, sell: false },
    });
    expect(result.signal).toBeNull();
    expect(result.checks.find((check) => check.id === "htf")?.pass).toBe(false);
  });
});

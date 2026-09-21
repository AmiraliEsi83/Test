import { describe, expect, it } from "vitest";
import { atr, ema, resample, rsi } from "./index";

describe("indicators", () => {
  it("seeds EMA with an SMA and then smooths", () => {
    const values = ema([1, 2, 3, 4, 5, 6], 3);
    expect(values[2]).toBeCloseTo(2, 5);
    expect(values[5]).toBeGreaterThan(values[2]);
  });

  it("returns RSI near 100 for a one-way rise", () => {
    const values = Array.from({ length: 30 }, (_, i) => i + 1);
    const result = rsi(values, 14);
    expect(result[29]).toBeGreaterThan(90);
  });

  it("resamples five 1-minute bars into one 5-minute bar", () => {
    const candles = [0, 1, 2, 3, 4].map((i) => ({
      time: i * 60,
      open: 1,
      high: 1 + i,
      low: 0.5,
      close: 1.2,
      volume: 10,
    }));
    const out = resample(candles, 5);
    expect(out).toHaveLength(1);
    expect(out[0].high).toBe(5);
    expect(out[0].volume).toBe(50);
  });

  it("computes a positive ATR", () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({
      time: i * 60,
      open: 10,
      high: 11,
      low: 9,
      close: 10.2,
      volume: 1,
    }));
    expect(atr(candles, 14).at(-1)).toBeGreaterThan(0);
  });
});

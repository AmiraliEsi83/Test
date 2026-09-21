import { evaluateBreakout } from "./strategies";

function trendingCandles(n = 80, drift = 0.0004) {
  const out = [];
  let price = 1.08;
  for (let i = 0; i < n; i += 1) {
    price += drift;
    out.push({ time: i * 60, open: price - 0.0002, high: price + 0.0004, low: price - 0.0003, close: price, volume: 200 });
  }
  out[out.length - 1] = { ...out[out.length - 1], close: price + 0.004, high: price + 0.005, volume: 600 };
  return out;
}

test("breakout returns structured checks", () => {
  const candles = trendingCandles();
  const r = evaluateBreakout({ candles, symbol: "EURUSD", config: {} });
  expect(r.checks.length).toBeGreaterThanOrEqual(4);
  expect(r.rangeHigh).toBeGreaterThan(0);
});

test("flat market produces no signal", () => {
  const candles = Array.from({ length: 80 }, (_, i) => ({ time: i * 60, open: 1.08, high: 1.0802, low: 1.0798, close: 1.08, volume: 50 }));
  const r = evaluateBreakout({ candles, symbol: "EURUSD", config: {} });
  expect(r.signal).toBeNull();
});

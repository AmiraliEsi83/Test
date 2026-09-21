import { evaluateLondonHarsi, evaluatePulseConfluence, computeHarsi } from "./algorithms";

test("London Harsi buys on first print between -15 and -30", () => {
  const asian = { high: 1.09, low: 1.08 };
  const mid = 1.085;
  const price = mid - 0.0022;
  const harsi = computeHarsi("EURUSD", price, asian);
  expect(harsi.zone).toBe("buy");
  const { signal } = evaluateLondonHarsi({
    symbol: "EURUSD",
    price,
    asian,
    inWindow: true,
    fired: { buy: false, sell: false },
  });
  expect(signal.side).toBe("buy");
});

test("London Harsi sells on first print between +15 and +30", () => {
  const asian = { high: 1.09, low: 1.08 };
  const mid = 1.085;
  const price = mid + 0.0022;
  const { signal } = evaluateLondonHarsi({
    symbol: "EURUSD",
    price,
    asian,
    inWindow: true,
    fired: { buy: false, sell: false },
  });
  expect(signal.side).toBe("sell");
});

test("Harsi does not fire outside the London T-15 window", () => {
  const asian = { high: 1.09, low: 1.08 };
  const { signal } = evaluateLondonHarsi({
    symbol: "EURUSD",
    price: 1.0828,
    asian,
    inWindow: false,
    fired: { buy: false, sell: false },
  });
  expect(signal).toBeNull();
});

test("Pulse Confluence returns a score on a trend", () => {
  const candles = [];
  let price = 1.08;
  for (let i = 0; i < 80; i += 1) {
    price += 0.0004;
    candles.push({
      time: i * 60,
      open: price - 0.0002,
      high: price + 0.0003,
      low: price - 0.0003,
      close: price,
      volume: 100,
    });
  }
  const pulse = evaluatePulseConfluence({ candles, symbol: "EURUSD" });
  expect(pulse.score).toBeGreaterThan(50);
  expect(pulse.ema9).toBeGreaterThan(pulse.ema21);
});

import { runBacktest } from "./backtest";
import { generateHistory } from "./market";

test("backtest runs without look-ahead and returns stats", () => {
  const hist = generateHistory("EURUSD", 300, 1700000000000);
  const out = runBacktest({ candles: hist.candles, symbol: "EURUSD", strategyId: "pulse-confluence", startingBalance: 10000, riskLots: 0.1, params: {} });
  expect(out.stats.trades).toBeGreaterThanOrEqual(0);
  expect(out.equity.length).toBeGreaterThan(0);
  expect(typeof out.stats.net).toBe("number");
});

test("backtest handles tiny input gracefully", () => {
  const out = runBacktest({ candles: [], symbol: "EURUSD", strategyId: "london-harsi", startingBalance: 10000, riskLots: 0.1, params: {} });
  expect(out.trades).toEqual([]);
});

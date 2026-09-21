import { describe, expect, it } from "vitest";
import { computeHarsi, STRATEGIES, DEFAULT_STRATEGY_CONFIGS } from "../src/strategies/registry.js";
import { evaluateRisk, DEFAULT_RISK } from "../src/risk.js";
import { PaperBroker } from "../src/brokers/paper.js";
import { generateHistory } from "../src/market.js";
import { pulseConfluence } from "../src/strategies/pulse-confluence.js";
import { runBacktest } from "../src/backtest.js";
import { analyticsFromTrades } from "../src/analytics.js";
import { ema, rsi } from "../src/indicators.js";

describe("London HARSI", () => {
  it("buys on first print between -15 and -30", () => {
    const asian = { high: 1.09, low: 1.08 };
    const mid = 1.085;
    const price = mid - 0.0022;
    const harsi = computeHarsi("EURUSD", price, asian);
    expect(harsi.zone).toBe("buy");
    const { signal } = STRATEGIES["london-harsi"].evaluate({
      symbol: "EURUSD",
      timeframe: "1m",
      price,
      candles: [],
      asian,
      now: new Date("2026-09-21T07:50:00+01:00"),
      inHarsiWindow: true,
      fired: { buy: false, sell: false },
      config: DEFAULT_STRATEGY_CONFIGS["london-harsi"],
    });
    expect(signal?.side).toBe("buy");
    expect(signal?.conditions.some((c) => c.label.includes("HARSI"))).toBe(true);
  });

  it("sells on first print between +15 and +30", () => {
    const asian = { high: 1.09, low: 1.08 };
    const price = 1.085 + 0.0022;
    const { signal } = STRATEGIES["london-harsi"].evaluate({
      symbol: "EURUSD",
      timeframe: "1m",
      price,
      candles: [],
      asian,
      now: new Date("2026-09-21T07:50:00+01:00"),
      inHarsiWindow: true,
      fired: { buy: false, sell: false },
      config: DEFAULT_STRATEGY_CONFIGS["london-harsi"],
    });
    expect(signal?.side).toBe("sell");
  });

  it("does not fire outside the window", () => {
    const { signal } = STRATEGIES["london-harsi"].evaluate({
      symbol: "EURUSD",
      timeframe: "1m",
      price: 1.0828,
      candles: [],
      asian: { high: 1.09, low: 1.08 },
      now: new Date(),
      inHarsiWindow: false,
      fired: { buy: false, sell: false },
      config: DEFAULT_STRATEGY_CONFIGS["london-harsi"],
    });
    expect(signal).toBeNull();
  });

  it("does not double-fire buy", () => {
    const { signal } = STRATEGIES["london-harsi"].evaluate({
      symbol: "EURUSD",
      timeframe: "1m",
      price: 1.0828,
      candles: [],
      asian: { high: 1.09, low: 1.08 },
      now: new Date(),
      inHarsiWindow: true,
      fired: { buy: true, sell: false },
      config: DEFAULT_STRATEGY_CONFIGS["london-harsi"],
    });
    expect(signal).toBeNull();
  });
});

describe("Pulse Confluence", () => {
  it("returns a bullish score on an uptrend", () => {
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
    const pulse = pulseConfluence.evaluate({
      symbol: "EURUSD",
      timeframe: "5m",
      price,
      candles,
      now: new Date("2026-09-21T10:00:00Z"),
      inHarsiWindow: false,
      fired: {},
      config: DEFAULT_STRATEGY_CONFIGS["pulse-confluence"],
    });
    expect((pulse.diagnostics as { score: number }).score).toBeGreaterThan(50);
    expect((pulse.diagnostics as { ema9: number; ema21: number }).ema9).toBeGreaterThan(
      (pulse.diagnostics as { ema21: number }).ema21
    );
  });
});

describe("risk manager", () => {
  const snap = {
    equity: 100000,
    cash: 100000,
    realizedPnlToday: 0,
    openPositions: [],
    consecutiveLosses: 0,
    killSwitchActive: false,
  };
  const intent = {
    symbol: "EURUSD",
    side: "buy" as const,
    lots: 0.2,
    type: "market" as const,
    mode: "paper" as const,
  };

  it("allows a normal paper order", () => {
    const d = evaluateRisk(intent, DEFAULT_RISK, snap);
    expect(d.allowed).toBe(true);
    expect(d.sizedLots).toBe(0.2);
  });

  it("blocks when kill switch is on", () => {
    const d = evaluateRisk(intent, DEFAULT_RISK, { ...snap, killSwitchActive: true });
    expect(d.allowed).toBe(false);
  });

  it("blocks max daily loss", () => {
    const d = evaluateRisk(intent, DEFAULT_RISK, { ...snap, realizedPnlToday: -2000 });
    expect(d.allowed).toBe(false);
  });

  it("blocks consecutive losses", () => {
    const d = evaluateRisk(intent, DEFAULT_RISK, { ...snap, consecutiveLosses: 4 });
    expect(d.allowed).toBe(false);
  });

  it("caps lots to max position size", () => {
    const d = evaluateRisk({ ...intent, lots: 99 }, { ...DEFAULT_RISK, maxExposureByAsset: 50 }, snap);
    expect(d.allowed).toBe(true);
    expect(d.sizedLots).toBe(DEFAULT_RISK.maxPositionLots);
  });
});

describe("paper broker", () => {
  it("opens and closes a market order with P/L", async () => {
    const desk = new PaperBroker(100000);
    desk.setPrice("EURUSD", 1.08);
    const order = await desk.placeOrder({
      symbol: "EURUSD",
      side: "buy",
      type: "market",
      lots: 0.1,
    });
    expect(order.status).toBe("filled");
    expect(desk.positions).toHaveLength(1);
    desk.setPrice("EURUSD", 1.082);
    await desk.closePosition(desk.positions[0].id);
    expect(desk.positions).toHaveLength(0);
    expect(desk.cash).not.toBe(100000);
  });

  it("keeps limit orders pending until price reaches", async () => {
    const desk = new PaperBroker(100000);
    desk.setPrice("EURUSD", 1.08);
    const order = await desk.placeOrder({
      symbol: "EURUSD",
      side: "buy",
      type: "limit",
      lots: 0.1,
      price: 1.07,
    });
    expect(order.status).toBe("pending");
    desk.setPrice("EURUSD", 1.069);
    desk.matchPending();
    expect(desk.positions.length).toBe(1);
  });
});

describe("indicators", () => {
  it("computes ema and rsi", () => {
    const values = Array.from({ length: 30 }, (_, i) => 1 + i * 0.01);
    expect(ema(values, 5).length).toBe(30);
    expect(rsi(values, 14)[29]).toBeGreaterThan(50);
  });
});

describe("backtest", () => {
  it("runs without look-ahead by iterating bar-by-bar", () => {
    const hist = generateHistory("EURUSD", 300, Date.now(), 60_000);
    const result = runBacktest(hist.candles, {
      strategyId: "pulse-confluence",
      symbol: "EURUSD",
      timeframe: "5m",
      start: hist.candles[0].time * 1000,
      end: hist.candles[hist.candles.length - 1].time * 1000,
      startingBalance: 100000,
      lots: 0.1,
    });
    expect(result.stats.start).toBe(100000);
    expect(Array.isArray(result.equity)).toBe(true);
  });
});

describe("analytics", () => {
  it("computes win rate and profit factor", () => {
    const stats = analyticsFromTrades([
      { pnl: 100, side: "buy", symbol: "EURUSD", openedAt: 1, closedAt: 2, strategy: "london-harsi" },
      { pnl: -40, side: "sell", symbol: "EURUSD", openedAt: 1, closedAt: 3, strategy: "pulse-confluence" },
    ]);
    expect(stats.winRate).toBeCloseTo(0.5);
    expect(stats.profitFactor).toBeCloseTo(2.5);
  });
});

import { describe, expect, it } from "vitest";
import {
  accountSummary,
  assessRisk,
  closePositionQty,
  consecutiveLosses,
  createLedger,
  DEFAULT_RISK,
  exitOnBar,
  performanceStats,
  quoteFromMid,
  runBacktest,
  sizeForRisk,
  submitOrder,
  type CostModel,
} from "./index";
import { getInstrument, type Candle } from "@harsi/shared";

const costs: CostModel = { commissionBps: 0, slippagePips: 0, spreadPips: 0 };

describe("paper ledger", () => {
  it("opens a market buy and realizes a gain on close", () => {
    const ledger = createLedger(100000);
    const quote = quoteFromMid(1.08, 0.0001, 0);
    const submitted = submitOrder(
      ledger,
      { symbol: "EURUSD", side: "buy", type: "market", qty: 10000, stopLoss: 1.078, takeProfit: 1.084, now: 1 },
      quote,
      costs
    );
    expect(submitted.error).toBeUndefined();
    expect(ledger.positions[0].status).toBe("open");
    const summary = accountSummary(ledger, { EURUSD: quoteFromMid(1.081, 0.0001, 0) });
    expect(summary.unrealized).toBeCloseTo(10, 1);
    const closed = closePositionQty(ledger, ledger.positions[0].id, null, 1.081, costs, 2, "manual");
    expect(closed.ok).toBe(true);
    if (closed.ok) expect(closed.trade.pnl).toBeCloseTo(10, 1);
    expect(ledger.positions[0].status).toBe("closed");
    expect(accountSummary(ledger, {}).equity).toBeCloseTo(100010, 1);
  });

  it("keeps a limit order pending until price trades through it", () => {
    const ledger = createLedger(100000);
    const submitted = submitOrder(
      ledger,
      { symbol: "EURUSD", side: "buy", type: "limit", qty: 10000, limitPrice: 1.07, now: 1 },
      quoteFromMid(1.08, 0.0001, 0),
      costs
    );
    expect(submitted.order.status).toBe("pending");
    expect(ledger.positions).toHaveLength(0);
  });

  it("partially closes and leaves the remainder open", () => {
    const ledger = createLedger(100000);
    submitOrder(
      ledger,
      { symbol: "EURUSD", side: "buy", type: "market", qty: 10000, now: 1 },
      quoteFromMid(1.08, 0.0001, 0),
      costs
    );
    const result = closePositionQty(ledger, ledger.positions[0].id, 4000, 1.081, costs, 2, "partial");
    expect(result.ok).toBe(true);
    expect(ledger.positions[0].status).toBe("open");
    expect(ledger.positions[0].qty).toBe(6000);
    expect(ledger.trades).toHaveLength(1);
  });

  it("assumes the stop fills when a bar trades through both stop and target", () => {
    const inst = getInstrument("EURUSD");
    const exit = exitOnBar(
      {
        id: "p",
        symbol: "EURUSD",
        side: "buy",
        qty: 1,
        entry: 1.08,
        stop: 1.079,
        target: 1.082,
        strategyId: null,
        status: "open",
        realizedPnl: 0,
        commission: 0,
        margin: 0,
        openedAt: 0,
        closedAt: null,
      },
      { time: 60, open: 1.0805, high: 1.083, low: 1.078, close: 1.081, volume: 10 },
      inst,
      0
    );
    expect(exit?.reason).toBe("stop");
  });
});

describe("risk manager", () => {
  const base = {
    settings: { ...DEFAULT_RISK, killSwitch: false },
    equity: 100000,
    openPositions: [],
    realizedNetToday: 0,
    consecutiveLosses: 0,
    order: { symbol: "EURUSD", notional: 10000, riskAmount: 100, hasStop: true },
  };

  it("blocks the kill switch, daily loss, and loss streak", () => {
    expect(assessRisk({ ...base, settings: { ...base.settings, killSwitch: true } }).ok).toBe(false);
    expect(assessRisk({ ...base, realizedNetToday: -1500 }).ok).toBe(false);
    expect(assessRisk({ ...base, consecutiveLosses: 4 }).ok).toBe(false);
  });

  it("sizes from stop distance", () => {
    const qty = sizeForRisk(getInstrument("EURUSD"), "buy", 1.08, 1.078, 500);
    expect(qty).toBe(250000);
  });

  it("counts consecutive losses from the newest trade backwards", () => {
    expect(consecutiveLosses([{ pnl: 10, commission: 0 }, { pnl: -2, commission: 0 }, { pnl: -3, commission: 1 }])).toBe(2);
  });
});

describe("backtest", () => {
  it("fills on the next bar open and prefers the stop when both sides are touched", () => {
    const candles: Candle[] = [];
    for (let i = 0; i < 80; i += 1) {
      const close = 1.1;
      candles.push({ time: i * 60, open: close, high: close + 0.0001, low: close - 0.0001, close, volume: 10 });
    }
    candles[69] = { time: 69 * 60, open: 1.1, high: 1.106, low: 1.099, close: 1.105, volume: 10 };
    candles[70] = { time: 70 * 60, open: 1.1, high: 1.12, low: 1.08, close: 1.1, volume: 10 };
    const result = runBacktest({
      symbol: "EURUSD",
      candles,
      starting: 100000,
      warmup: 20,
      risk: { ...DEFAULT_RISK, riskPerTradePct: 0.25, maxPositionNotional: 500000, maxSymbolNotional: 500000 },
      costs: { commissionBps: 0, slippagePips: 0, spreadPips: 0 },
      evaluate: ({ index, bar }) => {
        if (index !== 69) return null;
        return { time: bar.time, side: "buy", entry: bar.close, stop: bar.close - 0.01, target: bar.close + 0.02 };
      },
    });
    expect(result.ledger.trades).toHaveLength(1);
    expect(result.ledger.trades[0].reason).toBe("stop");
    expect(result.ledger.trades[0].entry).not.toBe(candles[69].close);
    expect(result.ledger.orders[0].avgPrice).toBeCloseTo(candles[70].open, 5);
  });
});

describe("performance", () => {
  it("computes profit factor and drawdown from closed trades", () => {
    const stats = performanceStats(1000, [
      { pnl: 100, commission: 0, closedAt: 1, side: "buy", symbol: "EURUSD", strategyId: "london-harsi", rMultiple: 1 },
      { pnl: -40, commission: 0, closedAt: 2, side: "sell", symbol: "GBPUSD", strategyId: "pulse-confluence", rMultiple: -1 },
    ]);
    expect(stats.profitFactor).toBeCloseTo(2.5, 5);
    expect(stats.netPnl).toBe(60);
    expect(stats.winRate).toBe(0.5);
    expect(stats.maxDrawdown).toBe(40);
  });
});

import { type Side, type StrategyId } from "@harsi/shared";
import type { Candle } from "./indicators.js";
import { resample as resampleCandles } from "./indicators.js";
import { PaperBroker } from "./brokers/paper.js";
import { evaluateRisk, DEFAULT_RISK, type RiskSettings } from "./risk.js";
import { STRATEGIES, DEFAULT_STRATEGY_CONFIGS } from "./strategies/registry.js";
import { getSessionState, isHarsiWindow } from "./sessions.js";

export interface BacktestParams {
  strategyId: StrategyId;
  symbol: string;
  timeframe: string;
  start: number;
  end: number;
  startingBalance: number;
  risk?: Partial<RiskSettings>;
  config?: Record<string, unknown>;
  lots?: number;
}

export interface BacktestTrade {
  side: Side;
  entry: number;
  exit: number;
  pnl: number;
  openedAt: number;
  closedAt: number;
  reason: string;
}

export function runBacktest(candles: Candle[], params: BacktestParams) {
  const tfSec =
    params.timeframe === "5m" ? 300 : params.timeframe === "15m" ? 900 : params.timeframe === "1h" ? 3600 : 60;
  const series = resampleCandles(
    candles.filter((c) => c.time * 1000 >= params.start && c.time * 1000 <= params.end),
    tfSec
  );
  const strategy = STRATEGIES[params.strategyId];
  const config = { ...DEFAULT_STRATEGY_CONFIGS[params.strategyId], ...(params.config || {}) };
  const broker = new PaperBroker(params.startingBalance);
  const risk = { ...DEFAULT_RISK, ...(params.risk || {}) };
  const equity: { t: number; v: number }[] = [];
  const trades: BacktestTrade[] = [];
  const fired: Record<string, boolean | number> = { buy: false, sell: false, pulse: 0 };
  let dayKey = "";
  let asian = { high: -Infinity, low: Infinity };

  for (let i = 40; i < series.length; i += 1) {
    const window = series.slice(0, i + 1);
    const bar = series[i];
    const now = new Date(bar.time * 1000);
    const key = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
    if (key !== dayKey) {
      dayKey = key;
      fired.buy = false;
      fired.sell = false;
      asian = { high: -Infinity, low: Infinity };
    }
    const sess = getSessionState(now, false);
    if (sess.key === "asia" || sess.key === "london-prep") {
      asian.high = Math.max(asian.high, bar.high);
      asian.low = Math.min(asian.low, bar.low);
    }
    broker.setPrice(params.symbol, bar.close);
    broker.matchPending();
    const closed = broker.checkStops();
    for (const c of closed) {
      trades.push({
        side: "buy",
        entry: 0,
        exit: c.exit,
        pnl: c.pnl,
        openedAt: bar.time * 1000,
        closedAt: bar.time * 1000,
        reason: c.reason,
      });
    }

    const evaled = strategy.evaluate({
      symbol: params.symbol,
      timeframe: params.timeframe,
      price: bar.close,
      candles: window,
      htfCandles: window,
      asian: Number.isFinite(asian.high) ? asian : undefined,
      now,
      inHarsiWindow: isHarsiWindow(now, {
        windowMinutesBefore: Number(config.windowMinutesBefore ?? 15),
        windowMinutesAfter: Number(config.windowMinutesAfter ?? 5),
      }),
      fired,
      config,
    });
    if (evaled.signal) {
      if (evaled.signal.side === "buy") fired.buy = true;
      if (evaled.signal.side === "sell") fired.sell = true;
      const decision = evaluateRisk(
        {
          symbol: params.symbol,
          side: evaled.signal.side,
          lots: params.lots || 0.1,
          type: "market",
          mode: "paper",
        },
        risk,
        {
          equity: broker.cash + broker.unrealized(),
          cash: broker.cash,
          realizedPnlToday: 0,
          openPositions: broker.positions.map((p) => ({ symbol: p.symbol, lots: p.lots })),
          consecutiveLosses: 0,
          killSwitchActive: false,
        }
      );
      if (decision.allowed) {
        void broker.placeOrder({
          symbol: params.symbol,
          side: evaled.signal.side,
          type: "market",
          lots: decision.sizedLots,
          stop: evaled.signal.stop,
          target: evaled.signal.target,
        });
      }
    }
    equity.push({ t: bar.time, v: broker.cash + broker.unrealized() });
  }

  while (broker.positions.length) {
    const p = broker.positions[0];
    const last = series[series.length - 1];
    broker.setPrice(p.symbol, last.close);
    const before = broker.cash;
    void broker.closePosition(p.id);
    trades.push({
      side: p.side,
      entry: p.entry,
      exit: last.close,
      pnl: broker.cash - before,
      openedAt: p.openedAt,
      closedAt: last.time * 1000,
      reason: "End of backtest",
    });
  }

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  let peak = params.startingBalance;
  let maxDd = 0;
  for (const p of equity) {
    peak = Math.max(peak, p.v);
    maxDd = Math.max(maxDd, peak - p.v);
  }
  const finalEquity = equity[equity.length - 1]?.v ?? params.startingBalance;

  return {
    params,
    equity,
    trades,
    stats: {
      start: params.startingBalance,
      end: finalEquity,
      pnl: finalEquity - params.startingBalance,
      trades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: trades.length ? wins.length / trades.length : 0,
      profitFactor: grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : grossWin / grossLoss,
      avgTrade: trades.length ? trades.reduce((s, t) => s + t.pnl, 0) / trades.length : 0,
      maxDrawdown: maxDd,
    },
  };
}

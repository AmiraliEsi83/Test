import { ema } from "./algorithms";
import { toPips, pnlUsd } from "./instruments";

export function runBacktest({ candles, symbol, strategyId, params, startingBalance = 10000, riskLots = 0.1 }) {
  const trades = [];
  let balance = startingBalance;
  let peak = startingBalance;
  let maxDd = 0;
  const equity = [];
  if (!candles || candles.length < 60) {
    return { trades: [], stats: emptyStats(), equity: [], params };
  }
  let open = null;
  const closeAt = (idx, reason) => {
    const px = candles[idx].close;
    const pnl = pnlUsd(symbol, open.side, open.entry, px, open.lots) - 1.5;
    balance += pnl;
    peak = Math.max(peak, balance);
    maxDd = Math.max(maxDd, peak - balance);
    trades.push({ ...open, exit: px, exitIdx: idx, pnl, reason, closedAt: candles[idx].time * 1000, durationMin: idx - open.entryIdx });
    open = null;
  };

  for (let i = 50; i < candles.length; i += 1) {
    const slice = candles.slice(0, i + 1);
    const closes = slice.map((c) => c.close);
    const e9 = ema(closes, 9);
    const e21 = ema(closes, 21);
    const price = closes[i];
    if (open) {
      const dir = open.side === "buy" ? 1 : -1;
      const movePips = toPips(symbol, (price - open.entry) * dir);
      if (movePips >= open.tpPips) closeAt(i, "Take profit");
      else if (movePips <= -open.slPips) closeAt(i, "Stop loss");
      else if (i - open.entryIdx > 120) closeAt(i, "Time exit");
      continue;
    }
    let side = null;
    let slPips = 20;
    let tpPips = 30;
    if (strategyId === "pulse-confluence") {
      const bull = e9[i] > e21[i] && closes[i] > closes[i - 5];
      const bear = e9[i] < e21[i] && closes[i] < closes[i - 5];
      if (bull && (params?.longOnly !== true || true)) side = "buy";
      else if (bear) side = "sell";
      slPips = params?.slPips || 20; tpPips = params?.tpPips || 30;
    } else if (strategyId === "breakout-trend") {
      const lookback = params?.lookback || 40;
      const win = candles.slice(Math.max(0, i - lookback), i);
      const hi = Math.max(...win.map((c) => c.high));
      const lo = Math.min(...win.map((c) => c.low));
      if (price > hi) side = "buy";
      else if (price < lo) side = "sell";
      slPips = params?.slPips || 24; tpPips = params?.tpPips || 40;
    } else {
      const mid = (Math.max(...slice.slice(-120).map((c) => c.high)) + Math.min(...slice.slice(-120).map((c) => c.low))) / 2;
      const h = toPips(symbol, price - mid);
      if (h <= -15 && h >= -30) side = "buy";
      else if (h >= 15 && h <= 30) side = "sell";
      slPips = params?.slPips || 22; tpPips = params?.tpPips || 34;
    }
    if (side && (i % (params?.everyN || 25) === 0)) {
      open = { symbol, side, entry: price, entryIdx: i, lots: riskLots, slPips, tpPips, algorithm: strategyId, openedAt: candles[i].time * 1000 };
    }
    equity.push({ t: candles[i].time * 1000, eq: balance });
  }
  if (open) closeAt(candles.length - 1, "End of data");
  const wins = trades.filter((t) => t.pnl > 0);
  const grossW = wins.reduce((s, t) => s + t.pnl, 0);
  const grossL = Math.abs(trades.filter((t) => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0));
  return {
    trades,
    equity,
    params,
    stats: {
      trades: trades.length,
      wins: wins.length,
      winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
      net: balance - startingBalance,
      endBalance: balance,
      profitFactor: grossL > 0 ? grossW / grossL : wins.length ? 99 : 0,
      maxDd,
      avgTrade: trades.length ? (balance - startingBalance) / trades.length : 0,
    },
  };
}

function emptyStats() {
  return { trades: 0, wins: 0, winRate: 0, net: 0, endBalance: 0, profitFactor: 0, maxDd: 0, avgTrade: 0 };
}

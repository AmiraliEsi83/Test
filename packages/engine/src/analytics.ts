export interface ClosedTrade {
  pnl: number;
  side: "buy" | "sell";
  symbol: string;
  strategy?: string | null;
  openedAt: number;
  closedAt: number;
  mode?: string;
}

export function analyticsFromTrades(trades: ClosedTrade[], equityCurve?: { t: number; v: number }[]) {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const byStrategy: Record<string, { pnl: number; n: number }> = {};
  const bySymbol: Record<string, { pnl: number; n: number }> = {};
  const byWeekday: Record<string, { pnl: number; n: number }> = {};
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const t of trades) {
    const sk = t.strategy || "manual";
    byStrategy[sk] = byStrategy[sk] || { pnl: 0, n: 0 };
    byStrategy[sk].pnl += t.pnl;
    byStrategy[sk].n += 1;
    bySymbol[t.symbol] = bySymbol[t.symbol] || { pnl: 0, n: 0 };
    bySymbol[t.symbol].pnl += t.pnl;
    bySymbol[t.symbol].n += 1;
    const d = days[new Date(t.closedAt).getDay()];
    byWeekday[d] = byWeekday[d] || { pnl: 0, n: 0 };
    byWeekday[d].pnl += t.pnl;
    byWeekday[d].n += 1;
  }
  const longs = trades.filter((t) => t.side === "buy");
  const shorts = trades.filter((t) => t.side === "sell");
  let peak = equityCurve?.[0]?.v ?? 0;
  let maxDd = 0;
  if (equityCurve) {
    for (const p of equityCurve) {
      peak = Math.max(peak, p.v);
      maxDd = Math.max(maxDd, peak - p.v);
    }
  }
  const durations = trades.map((t) => t.closedAt - t.openedAt);
  const spanDays = trades.length
    ? (Math.max(...trades.map((t) => t.closedAt)) - Math.min(...trades.map((t) => t.openedAt))) / 86400000
    : 1;
  return {
    trades: trades.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    avgWinner: wins.length ? grossWin / wins.length : 0,
    avgLoser: losses.length ? -grossLoss / losses.length : 0,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : grossWin / grossLoss,
    maxDrawdown: maxDd,
    avgRiskReward: losses.length && wins.length ? Math.abs(grossWin / wins.length) / (grossLoss / losses.length || 1) : 0,
    tradesPerDay: spanDays > 0 ? trades.length / Math.max(spanDays, 1) : trades.length,
    pnl: trades.reduce((s, t) => s + t.pnl, 0),
    longPnl: longs.reduce((s, t) => s + t.pnl, 0),
    shortPnl: shorts.reduce((s, t) => s + t.pnl, 0),
    byStrategy,
    bySymbol,
    byWeekday,
    avgDurationMs: durations.length ? durations.reduce((s, n) => s + n, 0) / durations.length : 0,
  };
}

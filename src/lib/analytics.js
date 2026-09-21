export function summarizeTrades(closed) {
  const list = closed || [];
  const wins = list.filter((t) => (t.pnl || 0) > 0);
  const losses = list.filter((t) => (t.pnl || 0) <= 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const net = list.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = list.length ? (wins.length / list.length) * 100 : 0;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : wins.length ? 99 : 0;
  let peak = 0;
  let maxDd = 0;
  let cum = 0;
  const curve = list
    .slice()
    .sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0))
    .map((t) => {
      cum += t.pnl || 0;
      peak = Math.max(peak, cum);
      maxDd = Math.max(maxDd, peak - cum);
      return { t: t.closedAt, cum };
    });
  const byStrategy = {};
  const bySymbol = {};
  const bySide = { buy: { n: 0, pnl: 0 }, sell: { n: 0, pnl: 0 } };
  const byWeekday = {};
  list.forEach((t) => {
    const s = t.algorithm || t.strategy || "manual";
    byStrategy[s] = byStrategy[s] || { n: 0, pnl: 0, wins: 0 };
    byStrategy[s].n += 1; byStrategy[s].pnl += t.pnl || 0;
    if ((t.pnl || 0) > 0) byStrategy[s].wins += 1;
    bySymbol[t.symbol] = bySymbol[t.symbol] || { n: 0, pnl: 0 };
    bySymbol[t.symbol].n += 1; bySymbol[t.symbol].pnl += t.pnl || 0;
    const side = (t.side || "buy").toLowerCase();
    if (bySide[side]) { bySide[side].n += 1; bySide[side].pnl += t.pnl || 0; }
    const wd = new Date(t.closedAt || Date.now()).toLocaleDateString("en-US", { weekday: "short" });
    byWeekday[wd] = byWeekday[wd] || { n: 0, pnl: 0 };
    byWeekday[wd].n += 1; byWeekday[wd].pnl += t.pnl || 0;
  });
  return {
    trades: list.length, wins: wins.length, losses: losses.length,
    winRate, avgWin, avgLoss, profitFactor, net, maxDd, curve,
    byStrategy, bySymbol, bySide, byWeekday,
    avgTrade: list.length ? net / list.length : 0,
    tradesPerDay: list.length ? list.length / Math.max(1, new Set(list.map((t) => new Date(t.closedAt || Date.now()).toDateString())).size) : 0,
  };
}

export function equitySeries(starting, closed) {
  const sorted = (closed || []).slice().sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0));
  let eq = starting;
  const pts = [{ t: Date.now() - sorted.length * 86400000, eq }];
  sorted.forEach((t) => { eq += t.pnl || 0; pts.push({ t: t.closedAt, eq }); });
  return pts;
}

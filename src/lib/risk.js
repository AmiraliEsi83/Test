export const DEFAULT_RISK = {
  riskPerTradePct: 1,
  maxPositionLots: 2,
  maxDailyLossUsd: 500,
  maxOpenPositions: 5,
  maxExposurePerAsset: 2,
  stopAfterConsecutiveLosses: 4,
  killSwitch: false,
};

export function evaluateRisk({ order, account, positions, closed, risk }) {
  const r = { ...DEFAULT_RISK, ...(risk || {}) };
  const reasons = [];
  if (r.killSwitch) reasons.push("Daily kill switch is ON — all automation halted.");
  if ((order.lots || 0) > r.maxPositionLots) reasons.push(`Size ${order.lots} lots exceeds max ${r.maxPositionLots}.`);
  const openCount = (positions || []).filter((p) => p.status !== "closed").length;
  if (openCount >= r.maxOpenPositions) reasons.push(`Max open positions (${r.maxOpenPositions}) reached.`);
  const sameAsset = (positions || []).filter((p) => p.symbol === order.symbol && p.status !== "closed").length;
  if (sameAsset >= r.maxExposurePerAsset) reasons.push(`Max exposure for ${order.symbol} (${r.maxExposurePerAsset}) reached.`);

  const today = new Date().toDateString();
  const todaysClosed = (closed || []).filter((c) => new Date(c.closedAt || c.ts || Date.now()).toDateString() === today);
  const dayPnl = todaysClosed.reduce((s, c) => s + (c.pnl || 0), 0);
  if (dayPnl <= -Math.abs(r.maxDailyLossUsd)) reasons.push(`Max daily loss hit (${dayPnl.toFixed(2)} USD).`);

  let streak = 0;
  const sorted = [...todaysClosed].sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
  for (const t of sorted) {
    if ((t.pnl || 0) < 0) streak += 1;
    else break;
  }
  if (streak >= r.stopAfterConsecutiveLosses) reasons.push(`Stopped after ${streak} consecutive losses.`);

  const equity = account?.equity || account?.balance || 100000;
  const riskUsd = (equity * r.riskPerTradePct) / 100;
  return { allowed: reasons.length === 0, reasons, riskUsd, dayPnl, streak };
}

export function lotsForRisk({ symbol, entry, slPips, equity, riskPct }) {
  void symbol; void entry;
  if (!slPips || !equity) return 0.1;
  const riskUsd = (equity * (riskPct || 1)) / 100;
  const perPipPerLot = 10;
  const lots = riskUsd / (slPips * perPipPerLot);
  return Math.max(0.01, Math.min(5, Math.round(lots * 100) / 100));
}

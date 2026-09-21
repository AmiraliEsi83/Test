import { pnlUsd, type Side } from "@harsi/shared";

export interface RiskSettings {
  riskPerTradePct: number;
  maxPositionLots: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  maxExposureByAsset: number;
  stopAfterConsecutiveLosses: number;
  dailyKillSwitch: boolean;
}

export const DEFAULT_RISK: RiskSettings = {
  riskPerTradePct: 1,
  maxPositionLots: 5,
  maxDailyLoss: 1500,
  maxOpenPositions: 8,
  maxExposureByAsset: 3,
  stopAfterConsecutiveLosses: 4,
  dailyKillSwitch: true,
};

export interface RiskSnapshot {
  equity: number;
  cash: number;
  realizedPnlToday: number;
  openPositions: { symbol: string; lots: number }[];
  consecutiveLosses: number;
  killSwitchActive: boolean;
}

export interface OrderIntent {
  symbol: string;
  side: Side;
  lots: number;
  type: "market" | "limit" | "stop";
  entry?: number;
  mode: "paper" | "live";
}

export interface RiskDecision {
  allowed: boolean;
  reason?: string;
  sizedLots: number;
}

export function evaluateRisk(
  intent: OrderIntent,
  settings: RiskSettings,
  snap: RiskSnapshot
): RiskDecision {
  let lots = intent.lots;
  if (lots > settings.maxPositionLots) {
    lots = settings.maxPositionLots;
  }
  const assetLots = snap.openPositions
    .filter((p) => p.symbol === intent.symbol)
    .reduce((s, p) => s + p.lots, 0);
  const remaining = settings.maxExposureByAsset - assetLots;
  if (remaining <= 0) {
    return { allowed: false, reason: `Max exposure for ${intent.symbol} reached`, sizedLots: 0 };
  }
  lots = Math.min(lots, remaining);
  if (lots <= 0) {
    return { allowed: false, reason: "Position size is zero", sizedLots: 0 };
  }
  if (snap.killSwitchActive && settings.dailyKillSwitch) {
    return { allowed: false, reason: "Daily kill switch is active", sizedLots: 0 };
  }
  if (snap.realizedPnlToday <= -Math.abs(settings.maxDailyLoss)) {
    return { allowed: false, reason: "Max daily loss reached", sizedLots: 0 };
  }
  if (snap.openPositions.length >= settings.maxOpenPositions) {
    return { allowed: false, reason: "Max open positions reached", sizedLots: 0 };
  }
  if (snap.consecutiveLosses >= settings.stopAfterConsecutiveLosses) {
    return { allowed: false, reason: "Stopped after consecutive losses", sizedLots: 0 };
  }
  const riskBudget = snap.equity * (settings.riskPerTradePct / 100);
  if (riskBudget <= 0) {
    return { allowed: false, reason: "No risk budget remaining", sizedLots: 0 };
  }
  return { allowed: true, sizedLots: lots };
}

export function consecutiveLosses(closed: { pnl: number }[]): number {
  let n = 0;
  for (const t of closed) {
    if (t.pnl < 0) n += 1;
    else break;
  }
  return n;
}

export function markPositions<T extends { symbol: string; side: Side; entry: number; lots: number }>(
  positions: T[],
  prices: Record<string, number>
) {
  return positions.map((p) => {
    const px = prices[p.symbol] ?? p.entry;
    return { ...p, mark: px, pnl: pnlUsd(p.symbol, p.side, p.entry, px, p.lots) };
  });
}

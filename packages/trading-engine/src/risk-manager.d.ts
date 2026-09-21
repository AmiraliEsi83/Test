import { RiskSettings, OrderRequest, AccountOverview, Position } from '@harsi/shared';
export interface RiskCheckResult {
    approved: boolean;
    reason?: string;
    adjustedLots?: number;
}
export declare class RiskManager {
    private settings;
    private consecutiveLosses;
    private lastLossTimestamp;
    private dailyPnl;
    constructor(settings?: Partial<RiskSettings>);
    updateSettings(newSettings: Partial<RiskSettings>): void;
    getSettings(): RiskSettings;
    recordTradeResult(realizedPnl: number): void;
    resetDailyStats(): void;
    triggerKillSwitch(reason?: string): void;
    resetKillSwitch(): void;
    evaluateOrder(request: OrderRequest, account: AccountOverview, openPositions: Position[]): RiskCheckResult;
}

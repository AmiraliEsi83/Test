import { DEFAULT_RISK_SETTINGS, } from '@harsi/shared';
export class RiskManager {
    settings;
    consecutiveLosses = 0;
    lastLossTimestamp = 0;
    dailyPnl = 0;
    constructor(settings) {
        this.settings = {
            userId: 'user-default',
            ...DEFAULT_RISK_SETTINGS,
            ...settings,
        };
    }
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
    getSettings() {
        return { ...this.settings };
    }
    recordTradeResult(realizedPnl) {
        this.dailyPnl += realizedPnl;
        if (realizedPnl < 0) {
            this.consecutiveLosses += 1;
            this.lastLossTimestamp = Date.now();
            if (this.consecutiveLosses >= this.settings.consecutiveLossThreshold) {
                this.settings.killSwitchActive = true;
                this.settings.killSwitchReason = `Automatic circuit breaker triggered: ${this.consecutiveLosses} consecutive losing trades.`;
            }
        }
        else {
            this.consecutiveLosses = 0;
        }
        if (this.dailyPnl <= -this.settings.maxDailyLossUsd) {
            this.settings.killSwitchActive = true;
            this.settings.killSwitchReason = `Daily loss limit breached: -$${Math.abs(this.dailyPnl).toFixed(2)} / limit $${this.settings.maxDailyLossUsd}.`;
        }
    }
    resetDailyStats() {
        this.dailyPnl = 0;
        this.consecutiveLosses = 0;
        if (this.settings.killSwitchReason?.startsWith('Daily loss limit')) {
            this.settings.killSwitchActive = false;
            this.settings.killSwitchReason = undefined;
        }
    }
    triggerKillSwitch(reason = 'Manual emergency stop triggered') {
        this.settings.killSwitchActive = true;
        this.settings.killSwitchReason = reason;
    }
    resetKillSwitch() {
        this.settings.killSwitchActive = false;
        this.settings.killSwitchReason = undefined;
        this.consecutiveLosses = 0;
    }
    evaluateOrder(request, account, openPositions) {
        // 1. Check Kill Switch
        if (this.settings.killSwitchActive) {
            return {
                approved: false,
                reason: `Kill switch active: ${this.settings.killSwitchReason || 'Emergency circuit breaker engaged'}`,
            };
        }
        // 2. Consecutive loss cooldown check
        if (this.consecutiveLosses >= this.settings.consecutiveLossThreshold) {
            const cooldownMs = this.settings.cooldownMinutes * 60 * 1000;
            const elapsed = Date.now() - this.lastLossTimestamp;
            if (elapsed < cooldownMs) {
                const remainingMin = Math.ceil((cooldownMs - elapsed) / 60000);
                return {
                    approved: false,
                    reason: `Consecutive loss cooldown active (${remainingMin}m remaining after ${this.consecutiveLosses} losses)`,
                };
            }
        }
        // 3. Max Open Positions
        if (openPositions.length >= this.settings.maxOpenPositions) {
            return {
                approved: false,
                reason: `Maximum open positions limit reached (${openPositions.length}/${this.settings.maxOpenPositions})`,
            };
        }
        // 4. Max Exposure Per Asset
        const assetPositions = openPositions.filter((p) => p.symbol === request.symbol);
        const currentAssetLots = assetPositions.reduce((sum, p) => sum + p.lots, 0);
        if (currentAssetLots + request.lots > this.settings.maxExposurePerAssetLots) {
            return {
                approved: false,
                reason: `Max exposure for ${request.symbol} exceeded. Current: ${currentAssetLots} lots + requested ${request.lots} lots > limit ${this.settings.maxExposurePerAssetLots} lots`,
            };
        }
        // 5. Max Position Size
        let adjustedLots = request.lots;
        if (request.lots > this.settings.maxPositionSizeLots) {
            return {
                approved: false,
                reason: `Requested position size (${request.lots} lots) exceeds max allowed limit (${this.settings.maxPositionSizeLots} lots)`,
            };
        }
        // 6. Max Risk Per Trade (% of Equity)
        if (request.stopLoss && request.price) {
            const isBuy = request.side === 'BUY';
            const riskPerUnit = Math.abs(request.price - request.stopLoss);
            const riskUsd = riskPerUnit * request.lots * 100000; // approximate FX sizing
            const maxAllowedRiskUsd = account.equity * (this.settings.maxRiskPerTradePct / 100);
            if (riskUsd > maxAllowedRiskUsd * 2.5) {
                // Soft sizing adjustment suggestion or warning
                const safeLots = Number((maxAllowedRiskUsd / (riskPerUnit * 100000)).toFixed(2));
                if (safeLots > 0.01 && safeLots < request.lots) {
                    adjustedLots = safeLots;
                }
            }
        }
        // 7. Margin / Buying Power Check
        const estimatedMargin = request.lots * 1000;
        if (account.buyingPower < estimatedMargin) {
            return {
                approved: false,
                reason: `Insufficient buying power ($${account.buyingPower.toFixed(2)} available, $${estimatedMargin.toFixed(2)} required)`,
            };
        }
        return {
            approved: true,
            adjustedLots,
        };
    }
}

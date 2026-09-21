"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionPipeline = void 0;
class ExecutionPipeline {
    orderManager;
    automationSettings;
    onAlert;
    constructor(orderManager, automationSettings, onAlert) {
        this.orderManager = orderManager;
        this.automationSettings = automationSettings;
        this.onAlert = onAlert;
    }
    updateAutomation(settings) {
        this.automationSettings = { ...this.automationSettings, ...settings };
    }
    async processSignal(signal) {
        // 1. Notify listeners / trigger alert
        this.onAlert?.(signal);
        // 2. Check master emergency stop
        if (this.automationSettings.masterEmergencyStop) {
            return null;
        }
        // 3. Check strategy automation settings
        const rule = this.automationSettings.strategies[signal.strategyId];
        if (!rule)
            return null;
        const currentBroker = this.orderManager.getBroker();
        const isLiveBroker = currentBroker.mode === 'LIVE';
        // Live auto-execution requires explicit confirmed risk
        if (isLiveBroker) {
            if (!rule.liveAutoExecute || !rule.confirmedLiveRisk) {
                return null;
            }
        }
        else {
            if (!rule.paperAutoExecute) {
                return null;
            }
        }
        // 4. Route through Order Manager & Risk Manager
        const order = await this.orderManager.submitOrder({
            symbol: signal.symbol,
            side: signal.side,
            type: 'MARKET',
            lots: 0.1, // Default lot sizing or risk-calculated
            price: signal.price,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            strategyId: signal.strategyId,
            mode: currentBroker.mode,
        });
        return order;
    }
}
exports.ExecutionPipeline = ExecutionPipeline;

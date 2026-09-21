"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderManager = void 0;
class OrderManager {
    broker;
    riskManager;
    onAuditLog;
    constructor(broker, riskManager, onAuditLog) {
        this.broker = broker;
        this.riskManager = riskManager;
        this.onAuditLog = onAuditLog;
    }
    setBroker(broker) {
        this.broker = broker;
    }
    getBroker() {
        return this.broker;
    }
    async submitOrder(request) {
        const account = await this.broker.getAccount();
        const positions = await this.broker.getPositions();
        const overview = {
            balance: account.balance,
            equity: account.equity,
            cash: account.cash,
            marginUsed: account.marginUsed,
            buyingPower: account.buyingPower,
            unrealizedPnl: account.unrealizedPnl,
            realizedPnl: account.realizedPnl,
            todayPnl: 0,
            totalReturnPct: 0,
            openRiskPct: 0,
            maxDrawdownPct: 0,
            currency: account.currency,
            mode: this.broker.mode,
        };
        // Evaluate against Risk Manager
        const riskCheck = this.riskManager.evaluateOrder(request, overview, positions);
        if (!riskCheck.approved) {
            this.onAuditLog?.({
                action: 'ORDER_REJECTED_BY_RISK',
                category: 'RISK',
                details: `Order ${request.side} ${request.lots} ${request.symbol} blocked by risk rules: ${riskCheck.reason}`,
                level: 'WARN',
            });
            throw new Error(`Risk Manager rejected order: ${riskCheck.reason}`);
        }
        const orderToPlace = {
            ...request,
            lots: riskCheck.adjustedLots || request.lots,
            brokerType: this.broker.id,
            mode: this.broker.mode,
        };
        try {
            const placedOrder = await this.broker.placeOrder(orderToPlace);
            this.onAuditLog?.({
                action: 'ORDER_SUBMITTED',
                category: 'ORDER',
                details: `${placedOrder.side} ${placedOrder.lots} ${placedOrder.symbol} @ ${placedOrder.filledPrice || placedOrder.price} (${placedOrder.status}) via ${this.broker.name}`,
                level: 'INFO',
            });
            return placedOrder;
        }
        catch (err) {
            this.onAuditLog?.({
                action: 'ORDER_FAILED',
                category: 'ORDER',
                details: `Execution failed for ${request.side} ${request.symbol}: ${err.message}`,
                level: 'ERROR',
            });
            throw err;
        }
    }
    async closePosition(positionId, lots) {
        await this.broker.closePosition(positionId, lots);
        this.onAuditLog?.({
            action: 'POSITION_CLOSED',
            category: 'POSITION',
            details: `Position ${positionId} closed${lots ? ` (partial: ${lots} lots)` : ' (full)'}`,
            level: 'INFO',
        });
    }
    async modifyPosition(positionId, stopLoss, takeProfit) {
        const updated = await this.broker.modifyPosition(positionId, stopLoss, takeProfit);
        this.onAuditLog?.({
            action: 'POSITION_MODIFIED',
            category: 'POSITION',
            details: `Position ${positionId} SL: ${stopLoss ?? 'unchanged'}, TP: ${takeProfit ?? 'unchanged'}`,
            level: 'INFO',
        });
        return updated;
    }
}
exports.OrderManager = OrderManager;

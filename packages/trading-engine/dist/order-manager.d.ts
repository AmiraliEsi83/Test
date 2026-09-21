import { Order, OrderRequest, Position } from '@harsi/shared';
import { BrokerAdapter } from '@harsi/broker-adapters';
import { RiskManager } from './risk-manager.js';
export declare class OrderManager {
    private broker;
    private riskManager;
    private onAuditLog?;
    constructor(broker: BrokerAdapter, riskManager: RiskManager, onAuditLog?: (entry: {
        action: string;
        category: any;
        details: string;
        level: any;
    }) => void);
    setBroker(broker: BrokerAdapter): void;
    getBroker(): BrokerAdapter;
    submitOrder(request: OrderRequest): Promise<Order>;
    closePosition(positionId: string, lots?: number): Promise<void>;
    modifyPosition(positionId: string, stopLoss?: number, takeProfit?: number): Promise<Position>;
}

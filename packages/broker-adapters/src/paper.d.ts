import { Order, OrderRequest, Position, BrokerConnectionInfo } from '@harsi/shared';
import { BrokerAdapter, BrokerAccount } from './types.js';
export declare class PaperBrokerAdapter implements BrokerAdapter {
    id: string;
    name: string;
    mode: 'PAPER';
    private connected;
    private balance;
    private realizedPnl;
    private orders;
    private positions;
    constructor(initialBalance?: number);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getInfo(): BrokerConnectionInfo;
    getAccount(): Promise<BrokerAccount>;
    getPositions(): Promise<Position[]>;
    getOrders(): Promise<Order[]>;
    updatePrices(prices: Record<string, number>): void;
    placeOrder(request: OrderRequest): Promise<Order>;
    cancelOrder(id: string): Promise<void>;
    closePosition(id: string, lotsToClose?: number): Promise<void>;
    modifyPosition(id: string, stopLoss?: number, takeProfit?: number): Promise<Position>;
}

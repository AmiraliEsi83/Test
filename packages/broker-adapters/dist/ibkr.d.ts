import { Order, OrderRequest, Position, BrokerConnectionInfo } from '@harsi/shared';
import { BrokerAdapter, BrokerAccount } from './types.js';
export declare class InteractiveBrokersAdapter implements BrokerAdapter {
    id: string;
    name: string;
    mode: 'PAPER' | 'LIVE';
    private host;
    private port;
    private accountId;
    private connected;
    constructor();
    connect(credentials?: Record<string, string>): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getInfo(): BrokerConnectionInfo;
    getAccount(): Promise<BrokerAccount>;
    getPositions(): Promise<Position[]>;
    getOrders(): Promise<Order[]>;
    placeOrder(request: OrderRequest): Promise<Order>;
    cancelOrder(id: string): Promise<void>;
    closePosition(id: string, lots?: number): Promise<void>;
    modifyPosition(id: string, stopLoss?: number, takeProfit?: number): Promise<Position>;
}

import { Order, OrderRequest, Position, BrokerConnectionInfo, ExecutionMode } from '@harsi/shared';

export interface BrokerAccount {
  brokerId: string;
  name: string;
  accountId: string;
  currency: string;
  balance: number;
  equity: number;
  cash: number;
  buyingPower: number;
  marginUsed: number;
  unrealizedPnl: number;
  realizedPnl: number;
  mode: ExecutionMode;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'NOT_CONNECTED' | 'ERROR';
}

export interface BrokerAdapter {
  id: string;
  name: string;
  mode: ExecutionMode;
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

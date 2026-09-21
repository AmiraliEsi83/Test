import { Order, OrderRequest, Position, BrokerConnectionInfo } from '@harsi/shared';
import { BrokerAdapter, BrokerAccount } from './types.js';

export class InteractiveBrokersAdapter implements BrokerAdapter {
  public id: string = 'ibkr';
  public name: string = 'Interactive Brokers (CP Gateway)';
  public mode: 'PAPER' | 'LIVE' = 'LIVE';

  private host: string = '127.0.0.1';
  private port: number = 5000;
  private accountId: string = '';
  private connected: boolean = false;

  constructor() {
    this.host = process.env.IBKR_GATEWAY_HOST || '127.0.0.1';
    this.port = Number(process.env.IBKR_GATEWAY_PORT || 5000);
    this.accountId = process.env.IBKR_ACCOUNT_ID || '';
  }

  public async connect(credentials?: Record<string, string>): Promise<void> {
    if (credentials) {
      this.host = credentials.host || '127.0.0.1';
      this.port = Number(credentials.port || 5000);
      this.accountId = credentials.accountId || '';
    }

    try {
      const res = await fetch(`https://${this.host}:${this.port}/v1/api/iserver/auth/status`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        this.connected = true;
      } else {
        this.connected = false;
        throw new Error('IBKR Gateway is not authenticated.');
      }
    } catch (err: any) {
      this.connected = false;
      throw new Error(`IBKR Client Portal Gateway unreachable at ${this.host}:${this.port}. Please launch your IB Gateway.`);
    }
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getInfo(): BrokerConnectionInfo {
    return {
      id: 'ibkr',
      brokerType: 'ibkr',
      name: this.name,
      status: this.connected ? 'CONNECTED' : 'NOT_CONNECTED',
      environment: 'live',
      accountId: this.accountId || undefined,
      lastSync: this.connected ? new Date().toISOString() : undefined,
      hasCredentials: Boolean(this.accountId),
      permissions: ['multi-asset', 'smart-routing'],
    };
  }

  public async getAccount(): Promise<BrokerAccount> {
    return {
      brokerId: this.id,
      name: this.name,
      accountId: this.accountId || 'NOT_CONNECTED',
      currency: 'USD',
      balance: 0,
      equity: 0,
      cash: 0,
      buyingPower: 0,
      marginUsed: 0,
      unrealizedPnl: 0,
      realizedPnl: 0,
      mode: 'LIVE',
      status: this.connected ? 'CONNECTED' : 'NOT_CONNECTED',
    };
  }

  public async getPositions(): Promise<Position[]> {
    return [];
  }

  public async getOrders(): Promise<Order[]> {
    return [];
  }

  public async placeOrder(request: OrderRequest): Promise<Order> {
    throw new Error('IBKR order execution requires active authenticated IB Client Portal Gateway.');
  }

  public async cancelOrder(id: string): Promise<void> {
    throw new Error('IBKR Gateway not connected.');
  }

  public async closePosition(id: string, lots?: number): Promise<void> {
    throw new Error('IBKR Gateway not connected.');
  }

  public async modifyPosition(id: string, stopLoss?: number, takeProfit?: number): Promise<Position> {
    throw new Error('IBKR Gateway not connected.');
  }
}

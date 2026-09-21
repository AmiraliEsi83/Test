import { Order, OrderRequest, Position, BrokerConnectionInfo } from '@harsi/shared';
import { BrokerAdapter, BrokerAccount } from './types.js';

export class OandaBrokerAdapter implements BrokerAdapter {
  public id: string = 'oanda';
  public name: string = 'OANDA FX & Metals';
  public mode: 'PAPER' | 'LIVE' = 'LIVE';

  private accountId: string = '';
  private apiToken: string = '';
  private environment: 'practice' | 'live' = 'practice';
  private connected: boolean = false;

  constructor() {
    this.accountId = process.env.OANDA_ACCOUNT_ID || '';
    this.apiToken = process.env.OANDA_API_TOKEN || '';
    this.environment = (process.env.OANDA_ENV as any) || 'practice';
  }

  public async connect(credentials?: Record<string, string>): Promise<void> {
    if (credentials) {
      this.accountId = credentials.accountId || '';
      this.apiToken = credentials.apiToken || '';
      this.environment = (credentials.env as any) || 'practice';
    }

    if (!this.accountId || !this.apiToken) {
      this.connected = false;
      throw new Error('OANDA Account ID and Bearer API Token are required.');
    }

    const host =
      this.environment === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com';

    try {
      const res = await fetch(`${host}/v3/accounts/${this.accountId}/summary`, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        this.connected = false;
        throw new Error(`OANDA authorization failed: ${res.statusText}`);
      }
      this.connected = true;
    } catch (err: any) {
      this.connected = false;
      throw new Error(`OANDA connection failed: ${err.message}`);
    }
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getInfo(): BrokerConnectionInfo {
    const hasCreds = Boolean(this.accountId && this.apiToken);
    return {
      id: 'oanda',
      brokerType: 'oanda',
      name: this.name,
      status: this.connected ? 'CONNECTED' : hasCreds ? 'NOT_CONNECTED' : 'NOT_CONFIGURED',
      environment: this.environment === 'live' ? 'live' : 'sandbox',
      accountId: hasCreds ? this.accountId : undefined,
      lastSync: this.connected ? new Date().toISOString() : undefined,
      hasCredentials: hasCreds,
      permissions: ['fx-trade', 'streaming-pricing'],
    };
  }

  public async getAccount(): Promise<BrokerAccount> {
    return {
      brokerId: this.id,
      name: this.name,
      accountId: this.accountId || 'NOT_CONFIGURED',
      currency: 'USD',
      balance: 0,
      equity: 0,
      cash: 0,
      buyingPower: 0,
      marginUsed: 0,
      unrealizedPnl: 0,
      realizedPnl: 0,
      mode: 'LIVE',
      status: this.connected ? 'CONNECTED' : 'NOT_CONFIGURED',
    };
  }

  public async getPositions(): Promise<Position[]> {
    return [];
  }

  public async getOrders(): Promise<Order[]> {
    return [];
  }

  public async placeOrder(request: OrderRequest): Promise<Order> {
    throw new Error('OANDA live execution requires configured API token and active account authorization.');
  }

  public async cancelOrder(id: string): Promise<void> {
    throw new Error('OANDA broker not connected.');
  }

  public async closePosition(id: string, lots?: number): Promise<void> {
    throw new Error('OANDA broker not connected.');
  }

  public async modifyPosition(id: string, stopLoss?: number, takeProfit?: number): Promise<Position> {
    throw new Error('OANDA broker not connected.');
  }
}

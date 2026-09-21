import { Order, OrderRequest, Position, BrokerConnectionInfo } from '@harsi/shared';
import { BrokerAdapter, BrokerAccount } from './types.js';

export class AlpacaBrokerAdapter implements BrokerAdapter {
  public id: string = 'alpaca';
  public name: string = 'Alpaca Markets';
  public mode: 'PAPER' | 'LIVE' = 'PAPER';

  private keyId: string = '';
  private secretKey: string = '';
  private isPaper: boolean = true;
  private connected: boolean = false;

  constructor() {
    this.keyId = process.env.ALPACA_API_KEY || '';
    this.secretKey = process.env.ALPACA_SECRET_KEY || '';
    this.isPaper = process.env.ALPACA_ENV !== 'live';
  }

  public async connect(credentials?: Record<string, string>): Promise<void> {
    if (credentials) {
      this.keyId = credentials.keyId || '';
      this.secretKey = credentials.secretKey || '';
      this.isPaper = credentials.env !== 'live';
    }

    if (!this.keyId || !this.secretKey) {
      this.connected = false;
      throw new Error('Alpaca API Key and Secret are required to connect.');
    }

    // In a real environment with credentials, we would call Alpaca's /v2/account
    // Test endpoint ping:
    try {
      const baseUrl = this.isPaper
        ? 'https://paper-api.alpaca.markets'
        : 'https://api.alpaca.markets';
      const res = await fetch(`${baseUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': this.keyId,
          'APCA-API-SECRET-KEY': this.secretKey,
        },
      });

      if (!res.ok) {
        this.connected = false;
        throw new Error(`Alpaca authentication failed: ${res.statusText}`);
      }
      this.connected = true;
    } catch (err: any) {
      this.connected = false;
      throw new Error(`Alpaca connection failed: ${err.message}`);
    }
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getInfo(): BrokerConnectionInfo {
    const hasCreds = Boolean(this.keyId && this.secretKey);
    return {
      id: 'alpaca',
      brokerType: 'alpaca',
      name: this.name,
      status: this.connected ? 'CONNECTED' : hasCreds ? 'NOT_CONNECTED' : 'NOT_CONFIGURED',
      environment: this.isPaper ? 'sandbox' : 'live',
      accountId: hasCreds ? 'ALPACA-LIVE-XXXX' : undefined,
      lastSync: this.connected ? new Date().toISOString() : undefined,
      hasCredentials: hasCreds,
      permissions: ['read', 'trade'],
    };
  }

  public async getAccount(): Promise<BrokerAccount> {
    if (!this.connected) {
      return {
        brokerId: this.id,
        name: this.name,
        accountId: 'UNCONFIGURED',
        currency: 'USD',
        balance: 0,
        equity: 0,
        cash: 0,
        buyingPower: 0,
        marginUsed: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        mode: this.isPaper ? 'PAPER' : 'LIVE',
        status: 'NOT_CONFIGURED',
      };
    }

    const baseUrl = this.isPaper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
    const res = await fetch(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': this.keyId,
        'APCA-API-SECRET-KEY': this.secretKey,
      },
    });
    const data = await res.json();

    return {
      brokerId: this.id,
      name: this.name,
      accountId: data.id || 'ALPACA-ACC',
      currency: data.currency || 'USD',
      balance: parseFloat(data.portfolio_value || 0),
      equity: parseFloat(data.equity || 0),
      cash: parseFloat(data.cash || 0),
      buyingPower: parseFloat(data.buying_power || 0),
      marginUsed: parseFloat(data.initial_margin || 0),
      unrealizedPnl: 0,
      realizedPnl: 0,
      mode: this.isPaper ? 'PAPER' : 'LIVE',
      status: 'CONNECTED',
    };
  }

  public async getPositions(): Promise<Position[]> {
    if (!this.connected) return [];
    return [];
  }

  public async getOrders(): Promise<Order[]> {
    if (!this.connected) return [];
    return [];
  }

  public async placeOrder(request: OrderRequest): Promise<Order> {
    if (!this.connected) {
      throw new Error('Alpaca broker is not connected or configured with live credentials.');
    }
    throw new Error('Live Alpaca execution requires validated API credentials.');
  }

  public async cancelOrder(id: string): Promise<void> {
    if (!this.connected) throw new Error('Alpaca broker not connected.');
  }

  public async closePosition(id: string, lots?: number): Promise<void> {
    if (!this.connected) throw new Error('Alpaca broker not connected.');
  }

  public async modifyPosition(id: string, stopLoss?: number, takeProfit?: number): Promise<Position> {
    if (!this.connected) throw new Error('Alpaca broker not connected.');
    throw new Error('Position not found');
  }
}

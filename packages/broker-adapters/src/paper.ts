import {
  Order,
  OrderRequest,
  Position,
  BrokerConnectionInfo,
  calcPnl,
  getInstrument,
} from '@harsi/shared';
import { BrokerAdapter, BrokerAccount } from './types.js';

export class PaperBrokerAdapter implements BrokerAdapter {
  public id: string = 'paper';
  public name: string = 'HARSI Institutional Paper Desk';
  public mode: 'PAPER' = 'PAPER';

  private connected: boolean = true;
  private balance: number = 100000;
  private realizedPnl: number = 0;
  private orders: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();

  constructor(initialBalance: number = 100000) {
    this.balance = initialBalance;
  }

  public async connect(): Promise<void> {
    this.connected = true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getInfo(): BrokerConnectionInfo {
    return {
      id: 'paper',
      brokerType: 'paper',
      name: this.name,
      status: 'SIMULATED',
      environment: 'sandbox',
      accountId: 'PAPER-100842',
      lastSync: new Date().toISOString(),
      hasCredentials: true,
      permissions: ['read', 'trade', 'paper'],
    };
  }

  public async getAccount(): Promise<BrokerAccount> {
    const unrealized = Array.from(this.positions.values()).reduce(
      (sum, p) => sum + p.unrealizedPnl,
      0
    );
    const equity = this.balance + unrealized;
    const marginUsed = Array.from(this.positions.values()).reduce(
      (sum, p) => sum + p.lots * 1000,
      0
    );
    const buyingPower = Math.max(0, equity * 10 - marginUsed);

    return {
      brokerId: this.id,
      name: this.name,
      accountId: 'PAPER-100842',
      currency: 'USD',
      balance: Math.round(this.balance * 100) / 100,
      equity: Math.round(equity * 100) / 100,
      cash: Math.round((this.balance - marginUsed) * 100) / 100,
      buyingPower: Math.round(buyingPower * 100) / 100,
      marginUsed: Math.round(marginUsed * 100) / 100,
      unrealizedPnl: Math.round(unrealized * 100) / 100,
      realizedPnl: Math.round(this.realizedPnl * 100) / 100,
      mode: 'PAPER',
      status: 'CONNECTED',
    };
  }

  public async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values()).filter((p) => p.lots > 0);
  }

  public async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public updatePrices(prices: Record<string, number>): void {
    for (const [id, pos] of this.positions.entries()) {
      const currentPrice = prices[pos.symbol];
      if (currentPrice != null) {
        pos.currentPrice = currentPrice;
        const { pnlUsd, pnlPips } = calcPnl(
          pos.symbol,
          pos.side,
          pos.entryPrice,
          currentPrice,
          pos.lots
        );
        pos.unrealizedPnl = pnlUsd;
        pos.unrealizedPnlPips = pnlPips;

        // Check SL/TP triggers
        if (pos.side === 'LONG') {
          if (pos.stopLoss && currentPrice <= pos.stopLoss) {
            this.closePosition(id);
          } else if (pos.takeProfit && currentPrice >= pos.takeProfit) {
            this.closePosition(id);
          }
        } else {
          if (pos.stopLoss && currentPrice >= pos.stopLoss) {
            this.closePosition(id);
          } else if (pos.takeProfit && currentPrice <= pos.takeProfit) {
            this.closePosition(id);
          }
        }
      }
    }
  }

  public async placeOrder(request: OrderRequest): Promise<Order> {
    const inst = getInstrument(request.symbol);
    const orderId = `ord_paper_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const currentPrice = request.price || inst.basePrice;
    // Spread & realistic slippage model
    const slippagePips = (Math.random() - 0.4) * 0.4;
    const filledPrice =
      request.side === 'BUY'
        ? currentPrice + (inst.spread / 2) + (slippagePips * inst.pip)
        : currentPrice - (inst.spread / 2) - (slippagePips * inst.pip);

    const commission = Math.round(request.lots * 2.5 * 100) / 100; // $2.50 per lot

    const order: Order = {
      id: orderId,
      userId: 'user-default',
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      lots: request.lots,
      price: currentPrice,
      stopLoss: request.stopLoss,
      takeProfit: request.takeProfit,
      status: 'FILLED',
      filledAt: now,
      filledPrice: Number(filledPrice.toFixed(inst.digits)),
      commission,
      slippage: Math.round(slippagePips * 10) / 10,
      strategyId: request.strategyId,
      brokerType: 'paper',
      mode: 'PAPER',
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(orderId, order);
    this.balance -= commission;

    // Create or aggregate position
    const positionId = `pos_paper_${request.symbol}_${request.side.toLowerCase()}`;
    const existing = this.positions.get(positionId);

    if (existing && existing.lots > 0) {
      // Average entry price
      const totalLots = existing.lots + request.lots;
      const weightedEntry =
        (existing.entryPrice * existing.lots + filledPrice * request.lots) / totalLots;
      existing.lots = totalLots;
      existing.entryPrice = Number(weightedEntry.toFixed(inst.digits));
      if (request.stopLoss) existing.stopLoss = request.stopLoss;
      if (request.takeProfit) existing.takeProfit = request.takeProfit;
    } else {
      const position: Position = {
        id: positionId,
        userId: 'user-default',
        symbol: request.symbol,
        side: request.side === 'BUY' ? 'LONG' : 'SHORT',
        lots: request.lots,
        entryPrice: Number(filledPrice.toFixed(inst.digits)),
        currentPrice: Number(filledPrice.toFixed(inst.digits)),
        stopLoss: request.stopLoss,
        takeProfit: request.takeProfit,
        unrealizedPnl: 0,
        unrealizedPnlPips: 0,
        realizedPnl: 0,
        strategyId: request.strategyId,
        brokerType: 'paper',
        mode: 'PAPER',
        openedAt: now,
      };
      this.positions.set(positionId, position);
    }

    return order;
  }

  public async cancelOrder(id: string): Promise<void> {
    const order = this.orders.get(id);
    if (order && order.status === 'PENDING') {
      order.status = 'CANCELLED';
      order.updatedAt = new Date().toISOString();
    }
  }

  public async closePosition(id: string, lotsToClose?: number): Promise<void> {
    const pos = this.positions.get(id);
    if (!pos || pos.lots <= 0) return;

    const closingLots = lotsToClose && lotsToClose < pos.lots ? lotsToClose : pos.lots;
    const { pnlUsd } = calcPnl(
      pos.symbol,
      pos.side,
      pos.entryPrice,
      pos.currentPrice,
      closingLots
    );

    this.realizedPnl += pnlUsd;
    this.balance += pnlUsd;

    if (closingLots >= pos.lots) {
      pos.lots = 0;
      pos.closedAt = new Date().toISOString();
      pos.realizedPnl += pnlUsd;
      pos.unrealizedPnl = 0;
      this.positions.delete(id);
    } else {
      pos.lots -= closingLots;
      pos.realizedPnl += pnlUsd;
      const rem = calcPnl(pos.symbol, pos.side, pos.entryPrice, pos.currentPrice, pos.lots);
      pos.unrealizedPnl = rem.pnlUsd;
      pos.unrealizedPnlPips = rem.pnlPips;
    }
  }

  public async modifyPosition(
    id: string,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<Position> {
    const pos = this.positions.get(id);
    if (!pos) throw new Error(`Position ${id} not found`);
    if (stopLoss !== undefined) pos.stopLoss = stopLoss;
    if (takeProfit !== undefined) pos.takeProfit = takeProfit;
    return pos;
  }
}

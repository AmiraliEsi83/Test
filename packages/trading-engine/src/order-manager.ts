import {
  Order,
  OrderRequest,
  Position,
  AccountOverview,
} from '@harsi/shared';
import { BrokerAdapter } from '@harsi/broker-adapters';
import { RiskManager } from './risk-manager.js';

export class OrderManager {
  private broker: BrokerAdapter;
  private riskManager: RiskManager;
  private onAuditLog?: (entry: { action: string; category: any; details: string; level: any }) => void;

  constructor(
    broker: BrokerAdapter,
    riskManager: RiskManager,
    onAuditLog?: (entry: { action: string; category: any; details: string; level: any }) => void
  ) {
    this.broker = broker;
    this.riskManager = riskManager;
    this.onAuditLog = onAuditLog;
  }

  public setBroker(broker: BrokerAdapter): void {
    this.broker = broker;
  }

  public getBroker(): BrokerAdapter {
    return this.broker;
  }

  public async submitOrder(request: OrderRequest): Promise<Order> {
    const account = await this.broker.getAccount();
    const positions = await this.broker.getPositions();

    const overview: AccountOverview = {
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

    const orderToPlace: OrderRequest = {
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
    } catch (err: any) {
      this.onAuditLog?.({
        action: 'ORDER_FAILED',
        category: 'ORDER',
        details: `Execution failed for ${request.side} ${request.symbol}: ${err.message}`,
        level: 'ERROR',
      });
      throw err;
    }
  }

  public async closePosition(positionId: string, lots?: number): Promise<void> {
    await this.broker.closePosition(positionId, lots);
    this.onAuditLog?.({
      action: 'POSITION_CLOSED',
      category: 'POSITION',
      details: `Position ${positionId} closed${lots ? ` (partial: ${lots} lots)` : ' (full)'}`,
      level: 'INFO',
    });
  }

  public async modifyPosition(
    positionId: string,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<Position> {
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

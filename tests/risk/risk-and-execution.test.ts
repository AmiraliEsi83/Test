import { RiskManager } from '@harsi/trading-engine';
import { PaperBrokerAdapter } from '@harsi/broker-adapters';
import { OrderRequest, AccountOverview } from '@harsi/shared';

describe('Risk Manager & Paper Broker Execution Pipeline', () => {
  let riskManager: RiskManager;
  let paperBroker: PaperBrokerAdapter;

  const mockAccount: AccountOverview = {
    balance: 100000,
    equity: 100000,
    cash: 100000,
    marginUsed: 0,
    buyingPower: 100000,
    unrealizedPnl: 0,
    realizedPnl: 0,
    todayPnl: 0,
    totalReturnPct: 0,
    openRiskPct: 0,
    maxDrawdownPct: 0,
    currency: 'USD',
    mode: 'PAPER',
  };

  beforeEach(() => {
    riskManager = new RiskManager({
      maxRiskPerTradePct: 1.0,
      maxPositionSizeLots: 5.0,
      maxDailyLossUsd: 1500,
      maxDailyLossPct: 3.0,
      maxOpenPositions: 3,
      maxExposurePerAssetLots: 4.0,
      consecutiveLossThreshold: 3,
      cooldownMinutes: 60,
    });
    paperBroker = new PaperBrokerAdapter(100000);
  });

  test('Rejects order if lots exceed maxPositionSizeLots', async () => {
    const orderReq: OrderRequest = {
      symbol: 'EURUSD',
      side: 'BUY',
      type: 'MARKET',
      lots: 10.0, // Limit is 5.0
      mode: 'PAPER',
    };

    const check = riskManager.evaluateOrder(orderReq, mockAccount, []);
    expect(check.approved).toBe(false);
    expect(check.reason).toContain('exceeded');
  });

  test('Approves compliant order within risk parameters', async () => {
    const orderReq: OrderRequest = {
      symbol: 'EURUSD',
      side: 'BUY',
      type: 'MARKET',
      lots: 1.0,
      stopLoss: 1.0750,
      takeProfit: 1.0900,
      mode: 'PAPER',
    };

    const check = riskManager.evaluateOrder(orderReq, mockAccount, []);
    expect(check.approved).toBe(true);
  });

  test('Kill switch globally rejects all incoming orders immediately', async () => {
    riskManager.triggerKillSwitch('Manual operator intervention');
    expect(riskManager.getSettings().killSwitchActive).toBe(true);

    const orderReq: OrderRequest = {
      symbol: 'EURUSD',
      side: 'BUY',
      type: 'MARKET',
      lots: 0.5,
      mode: 'PAPER',
    };

    const check = riskManager.evaluateOrder(orderReq, mockAccount, []);
    expect(check.approved).toBe(false);
    expect(check.reason).toContain('Kill switch active');
  });

  test('Paper Broker fills market orders, tracks positions, and allows partial/full close', async () => {
    const orderReq: OrderRequest = {
      symbol: 'EURUSD',
      side: 'BUY',
      type: 'MARKET',
      lots: 2.0,
      price: 1.0800,
      stopLoss: 1.0750,
      takeProfit: 1.0900,
      mode: 'PAPER',
    };

    // 1. Place order
    const filledOrder = await paperBroker.placeOrder(orderReq);
    expect(filledOrder.status).toBe('FILLED');
    expect(filledOrder.lots).toBe(2.0);

    // 2. Inspect positions
    const positions = await paperBroker.getPositions();
    expect(positions.length).toBe(1);
    const pos = positions[0];
    expect(pos.symbol).toBe('EURUSD');
    expect(pos.side).toBe('LONG');
    expect(pos.lots).toBe(2.0);

    // 3. Mark to market update
    paperBroker.updatePrices({ EURUSD: 1.0850 });
    const updatedPositions = await paperBroker.getPositions();
    expect(updatedPositions[0].unrealizedPnl).toBeGreaterThan(0);

    // 4. Modify SL/TP
    await paperBroker.modifyPosition(pos.id, 1.0760, 1.0950);
    const modPos = (await paperBroker.getPositions())[0];
    expect(modPos.stopLoss).toBe(1.0760);
    expect(modPos.takeProfit).toBe(1.0950);

    // 5. Partial close 1.0 lot
    await paperBroker.closePosition(pos.id, 1.0);
    const halfPos = (await paperBroker.getPositions())[0];
    expect(halfPos.lots).toBe(1.0);

    // 6. Close remaining
    await paperBroker.closePosition(pos.id);
    const finalPositions = await paperBroker.getPositions();
    expect(finalPositions.length).toBe(0);
  });
});

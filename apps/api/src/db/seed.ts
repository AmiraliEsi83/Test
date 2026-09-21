import { prisma } from './client.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding HARSI database...');

  // 1. Create or upsert users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const demoUser = await prisma.user.upsert({
    where: { email: 'trader@harsi.ai' },
    update: {},
    create: {
      email: 'trader@harsi.ai',
      name: 'Amirali (Trader)',
      passwordHash,
      subscriptionTier: 'TRADER',
      subscriptions: {
        create: {
          plan: 'TRADER',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@harsi.ai' },
    update: {},
    create: {
      email: 'pro@harsi.ai',
      name: 'Amirali (Institutional Pro)',
      passwordHash,
      subscriptionTier: 'PRO',
      subscriptions: {
        create: {
          plan: 'PRO',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // 2. Broker connections
  await prisma.brokerConnection.upsert({
    where: {
      userId_brokerType: {
        userId: demoUser.id,
        brokerType: 'paper',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      brokerType: 'paper',
      status: 'CONNECTED',
      environment: 'sandbox',
      accountId: 'PAPER-100842',
      lastSync: new Date(),
    },
  });

  await prisma.brokerConnection.upsert({
    where: {
      userId_brokerType: {
        userId: demoUser.id,
        brokerType: 'alpaca',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      brokerType: 'alpaca',
      status: 'NOT_CONFIGURED',
      environment: 'sandbox',
    },
  });

  await prisma.brokerConnection.upsert({
    where: {
      userId_brokerType: {
        userId: demoUser.id,
        brokerType: 'oanda',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      brokerType: 'oanda',
      status: 'NOT_CONFIGURED',
      environment: 'sandbox',
    },
  });

  await prisma.brokerConnection.upsert({
    where: {
      userId_brokerType: {
        userId: demoUser.id,
        brokerType: 'ibkr',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      brokerType: 'ibkr',
      status: 'NOT_CONNECTED',
      environment: 'live',
    },
  });

  // 3. Strategy Configs
  await prisma.strategyConfig.upsert({
    where: {
      userId_strategyId: {
        userId: demoUser.id,
        strategyId: 'london-harsi',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      strategyId: 'london-harsi',
      enabled: true,
      symbols: 'EURUSD,GBPUSD,USDJPY,XAUUSD',
      timeframe: '15m',
      parameters: JSON.stringify({
        minBuyThresholdPips: -30,
        maxBuyThresholdPips: -15,
        minSellThresholdPips: 15,
        maxSellThresholdPips: 30,
        slPips: 22,
        tpPips: 34,
      }),
      maxSignalsPerDay: 2,
      cooldownMinutes: 45,
      allowedDays: 'Mon,Tue,Wed,Thu,Fri',
    },
  });

  await prisma.strategyConfig.upsert({
    where: {
      userId_strategyId: {
        userId: demoUser.id,
        strategyId: 'pulse-confluence',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      strategyId: 'pulse-confluence',
      enabled: true,
      symbols: 'EURUSD,GBPUSD,USDJPY,BTCUSD,ETHUSD,SPY,QQQ',
      timeframe: '5m',
      parameters: JSON.stringify({
        emaFast: 9,
        emaSlow: 21,
        rsiPeriod: 14,
        atrMultiplierSl: 1.4,
        atrMultiplierTp: 2.1,
      }),
      maxSignalsPerDay: 4,
      cooldownMinutes: 30,
      allowedDays: 'Mon,Tue,Wed,Thu,Fri',
    },
  });

  await prisma.strategyConfig.upsert({
    where: {
      userId_strategyId: {
        userId: demoUser.id,
        strategyId: 'breakout-trend',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      strategyId: 'breakout-trend',
      enabled: true,
      symbols: 'EURUSD,GBPUSD,XAUUSD,BTCUSD,SPY',
      timeframe: '15m',
      parameters: JSON.stringify({
        trendEmaPeriod: 50,
        lookbackBars: 20,
        minAtrExpansion: 1.1,
      }),
      maxSignalsPerDay: 3,
      cooldownMinutes: 60,
      allowedDays: 'Mon,Tue,Wed,Thu,Fri',
    },
  });

  // 4. Sample Signals
  await prisma.signal.createMany({
    data: [
      {
        id: 'sig-seed-1',
        strategyId: 'london-harsi',
        strategyName: 'London HARSI Mean-Reversion',
        symbol: 'EURUSD',
        timeframe: '15m',
        side: 'BUY',
        price: 1.0842,
        entry: 1.0842,
        stopLoss: 1.0820,
        takeProfit: 1.0876,
        riskReward: '1:1.55',
        timestamp: BigInt(Date.now() - 3600000 * 2),
        status: 'HIT_TP',
        resultPips: 34.0,
        reason: 'First HARSI print at -19.4 pips below Asian midpoint during London T-15 prep window. Mean reversion long.',
        conditions: JSON.stringify([
          { name: 'Trading Day Filter', passed: true, detail: 'Current day allowed (Mon-Fri)' },
          { name: 'London T-15 Window', passed: true, detail: '07:45 - 08:30 London active' },
          { name: 'Asian Range Equilibrium', passed: true, detail: 'Asian mid 1.08614, range 42 pips' },
          { name: 'HARSI Threshold Zone', passed: true, detail: 'Print -19.4 pips within [-30, -15]' },
        ]),
      },
      {
        id: 'sig-seed-2',
        strategyId: 'pulse-confluence',
        strategyName: 'Pulse Momentum Confluence',
        symbol: 'GBPUSD',
        timeframe: '5m',
        side: 'BUY',
        price: 1.2730,
        entry: 1.2730,
        stopLoss: 1.2712,
        takeProfit: 1.2758,
        riskReward: '1:1.55',
        timestamp: BigInt(Date.now() - 3600000 * 1),
        status: 'ACTIVE',
        reason: 'PULSE BUY: EMA 9 > EMA 21, RSI 58.4, MACD expansion positive, ATR expanded 1.28x.',
        conditions: JSON.stringify([
          { name: 'EMA 9 > EMA 21', passed: true, detail: 'EMA 9: 1.2732 > EMA 21: 1.2721' },
          { name: 'RSI Location (58.4)', passed: true, detail: 'Bullish momentum continuation' },
          { name: 'MACD Impulse Expansion', passed: true, detail: 'Histogram expanding +0.00018' },
          { name: 'ATR Expansion (1.28x)', passed: true, detail: 'Current ATR 18 pips vs 14 pips avg' },
          { name: 'Trend Filter', passed: true, detail: 'Price above dynamic EMA baseline' },
        ]),
      },
      {
        id: 'sig-seed-3',
        strategyId: 'breakout-trend',
        strategyName: 'Breakout + Trend Confirmation',
        symbol: 'BTCUSD',
        timeframe: '15m',
        side: 'BUY',
        price: 65150.0,
        entry: 65150.0,
        stopLoss: 64200.0,
        takeProfit: 67200.0,
        riskReward: '1:2.16',
        timestamp: BigInt(Date.now() - 1800000),
        status: 'ACTIVE',
        reason: 'BREAKOUT BUY: Clear close above 20-bar swing high with EMA 50 trend confirmation, volume surge 1.4x.',
        conditions: JSON.stringify([
          { name: 'Higher-Timeframe Trend', passed: true, detail: 'Price above EMA 50 ($64,480)' },
          { name: 'Range High Breakout', passed: true, detail: 'Broke 20-bar resistance at $65,000' },
          { name: 'ATR Volatility Expansion', passed: true, detail: 'ATR expansion 1.22x' },
          { name: 'Volume Surge Confirmation', passed: true, detail: 'Volume 1.42x 20-bar average' },
        ]),
      },
    ],
  });

  // 5. Sample Open Positions
  await prisma.position.createMany({
    data: [
      {
        id: 'pos-seed-1',
        userId: demoUser.id,
        symbol: 'EURUSD',
        side: 'LONG',
        lots: 0.5,
        entryPrice: 1.0845,
        currentPrice: 1.0858,
        stopLoss: 1.0825,
        takeProfit: 1.0880,
        unrealizedPnl: 65.0,
        unrealizedPnlPips: 13.0,
        realizedPnl: 0,
        strategyId: 'london-harsi',
        brokerType: 'paper',
        mode: 'PAPER',
        openedAt: new Date(Date.now() - 3600000 * 2),
      },
      {
        id: 'pos-seed-2',
        userId: demoUser.id,
        symbol: 'GBPUSD',
        side: 'LONG',
        lots: 0.3,
        entryPrice: 1.2720,
        currentPrice: 1.2735,
        stopLoss: 1.2705,
        takeProfit: 1.2760,
        unrealizedPnl: 45.0,
        unrealizedPnlPips: 15.0,
        realizedPnl: 0,
        strategyId: 'pulse-confluence',
        brokerType: 'paper',
        mode: 'PAPER',
        openedAt: new Date(Date.now() - 3600000 * 1),
      },
    ],
  });

  // 6. Sample Closed Orders & History
  await prisma.order.createMany({
    data: [
      {
        id: 'ord-seed-1',
        userId: demoUser.id,
        symbol: 'EURUSD',
        side: 'BUY',
        type: 'MARKET',
        lots: 0.5,
        price: 1.0845,
        filledPrice: 1.0845,
        status: 'FILLED',
        filledAt: new Date(Date.now() - 3600000 * 2),
        commission: 1.25,
        slippage: 0.1,
        brokerType: 'paper',
        mode: 'PAPER',
        strategyId: 'london-harsi',
      },
      {
        id: 'ord-seed-2',
        userId: demoUser.id,
        symbol: 'GBPUSD',
        side: 'BUY',
        type: 'MARKET',
        lots: 0.3,
        price: 1.2720,
        filledPrice: 1.2720,
        status: 'FILLED',
        filledAt: new Date(Date.now() - 3600000 * 1),
        commission: 0.75,
        slippage: 0.1,
        brokerType: 'paper',
        mode: 'PAPER',
        strategyId: 'pulse-confluence',
      },
      {
        id: 'ord-seed-3',
        userId: demoUser.id,
        symbol: 'USDJPY',
        side: 'SELL',
        type: 'MARKET',
        lots: 0.4,
        price: 154.50,
        filledPrice: 154.50,
        status: 'FILLED',
        filledAt: new Date(Date.now() - 86400000),
        commission: 1.0,
        slippage: 0.0,
        brokerType: 'paper',
        mode: 'PAPER',
        strategyId: 'pulse-confluence',
      },
    ],
  });

  // 7. Audit log entries
  await prisma.auditLog.createMany({
    data: [
      {
        userId: demoUser.id,
        action: 'USER_LOGIN',
        category: 'AUTH',
        details: 'User authenticated successfully via Web Terminal',
        level: 'INFO',
        ip: '127.0.0.1',
      },
      {
        userId: demoUser.id,
        action: 'STRATEGY_INITIALIZED',
        category: 'STRATEGY',
        details: 'London HARSI and Pulse Confluence active in EUR/USD and GBP/USD',
        level: 'INFO',
      },
      {
        userId: demoUser.id,
        action: 'ORDER_FILLED',
        category: 'ORDER',
        details: 'BUY 0.5 EURUSD @ 1.0845 filled via Paper Desk',
        level: 'INFO',
      },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

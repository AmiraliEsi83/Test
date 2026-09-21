import { prisma } from "./db.js";
import { hashPassword } from "./auth.js";
import { DEFAULT_STRATEGY_CONFIGS } from "@harsi/engine";
import { DEFAULT_WATCHLIST } from "@harsi/shared";

async function seedUser(email: string, name: string, plan: string) {
  const passwordHash = await hashPassword("harsi123");
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      plan,
      demo: true,
    },
    update: { plan, demo: true, passwordHash },
  });

  await prisma.paperAccount.upsert({
    where: { userId: user.id },
    create: { userId: user.id, cash: 101250, realized: 1250 },
    update: { cash: 101250, realized: 1250 },
  });
  await prisma.riskSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  await prisma.automationSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      json: JSON.stringify({
        "london-harsi": { alerts: true, paper: true, live: false },
        "pulse-confluence": { alerts: true, paper: false, live: false },
        "breakout-trend": { alerts: true, paper: false, live: false },
      }),
    },
    update: {},
  });
  await prisma.watchlistItem.deleteMany({ where: { userId: user.id } });
  await prisma.watchlistItem.createMany({
    data: DEFAULT_WATCHLIST.map((symbol, sort) => ({ userId: user.id, symbol, sort })),
  });
  for (const strategyId of Object.keys(DEFAULT_STRATEGY_CONFIGS)) {
    await prisma.strategyConfig.upsert({
      where: { userId_strategyId: { userId: user.id, strategyId } },
      create: {
        userId: user.id,
        strategyId,
        enabled: true,
        config: JSON.stringify(DEFAULT_STRATEGY_CONFIGS[strategyId as keyof typeof DEFAULT_STRATEGY_CONFIGS]),
      },
      update: {},
    });
  }
  await prisma.brokerConnection.upsert({
    where: { id: `${user.id}-paper` },
    create: {
      id: `${user.id}-paper`,
      userId: user.id,
      type: "paper",
      name: "HARSI Paper Desk",
      status: "connected",
      environment: "paper",
      accountId: "PAPER-8801",
      lastSync: new Date(),
    },
    update: { status: "connected" },
  });

  await prisma.signal.deleteMany({ where: { userId: user.id } });
  await prisma.trade.deleteMany({ where: { userId: user.id } });
  await prisma.position.deleteMany({ where: { userId: user.id } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.alert.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.deleteMany({ where: { userId: user.id } });

  const now = Date.now();
  const conditionsBuy = JSON.stringify([
    { label: "London T-15 window", detail: "inside window", passed: true },
    { label: "HARSI threshold", detail: "-22.4 pips from Asian mid", passed: true },
    { label: "First print of zone", detail: "buy", passed: true },
  ]);
  const conditionsPulse = JSON.stringify([
    { label: "EMA 9 > EMA 21", detail: "1.08512 vs 1.08440", passed: true },
    { label: "RSI", detail: "58.2", passed: true },
    { label: "MACD bullish", detail: "hist +0.00012", passed: true },
    { label: "ATR expansion", detail: "1.22× average", passed: true },
    { label: "Trend filter", detail: "bullish EMA stack", passed: true },
  ]);

  const s1 = await prisma.signal.create({
    data: {
      userId: user.id,
      strategyId: "london-harsi",
      symbol: "EURUSD",
      timeframe: "1m",
      side: "buy",
      status: "closed",
      entry: 1.08284,
      stop: 1.08064,
      target: 1.08624,
      slPips: 22,
      tpPips: 34,
      riskReward: 34 / 22,
      price: 1.08284,
      reason: "First HARSI print inside −15 to −30 during the London T-15 window.",
      conditions: conditionsBuy,
      result: "+18.6 pips",
      createdAt: new Date(now - 86400000 * 2),
      closedAt: new Date(now - 86400000 * 2 + 3600000),
    },
  });
  await prisma.signal.create({
    data: {
      userId: user.id,
      strategyId: "pulse-confluence",
      symbol: "GBPUSD",
      timeframe: "5m",
      side: "sell",
      status: "active",
      entry: 1.27410,
      stop: 1.27620,
      target: 1.27080,
      slPips: 21,
      tpPips: 33,
      riskReward: 1.57,
      price: 1.27410,
      reason: "EMA 9 below EMA 21 · MACD histogram expanding negative · ATR expanding",
      conditions: conditionsPulse,
      createdAt: new Date(now - 12 * 60000),
    },
  });

  const trades = [
    { symbol: "EURUSD", side: "buy", pnl: 186, strategyId: "london-harsi", days: 2 },
    { symbol: "GBPUSD", side: "sell", pnl: -42, strategyId: "pulse-confluence", days: 3 },
    { symbol: "XAUUSD", side: "buy", pnl: 310, strategyId: "breakout-trend", days: 5 },
    { symbol: "USDJPY", side: "sell", pnl: 95, strategyId: "london-harsi", days: 6 },
    { symbol: "EURUSD", side: "buy", pnl: -70, strategyId: "pulse-confluence", days: 8 },
    { symbol: "SPY", side: "buy", pnl: 140, strategyId: "breakout-trend", days: 9 },
  ];
  for (const t of trades) {
    const openedAt = new Date(now - t.days * 86400000);
    const closedAt = new Date(openedAt.getTime() + 2 * 3600000);
    await prisma.trade.create({
      data: {
        userId: user.id,
        brokerId: "paper",
        mode: "paper",
        symbol: t.symbol,
        side: t.side,
        lots: 0.2,
        entry: 1.08,
        exit: 1.081,
        pnl: t.pnl,
        strategyId: t.strategyId,
        durationMs: 2 * 3600000,
        openedAt,
        closedAt,
      },
    });
  }

  await prisma.position.create({
    data: {
      userId: user.id,
      brokerId: "paper",
      mode: "paper",
      symbol: "EURUSD",
      side: "buy",
      lots: 0.15,
      entry: 1.0832,
      stop: 1.081,
      target: 1.0866,
      strategyId: "london-harsi",
      status: "open",
    },
  });

  await prisma.order.create({
    data: {
      userId: user.id,
      brokerId: "paper",
      mode: "paper",
      symbol: "EURUSD",
      side: "buy",
      type: "market",
      lots: 0.15,
      status: "filled",
      filledLots: 0.15,
      averagePrice: 1.0832,
      strategyId: "london-harsi",
    },
  });
  await prisma.order.create({
    data: {
      userId: user.id,
      brokerId: "paper",
      mode: "paper",
      symbol: "XAUUSD",
      side: "buy",
      type: "limit",
      lots: 0.1,
      price: 2488,
      status: "pending",
    },
  });

  await prisma.alert.create({
    data: {
      userId: user.id,
      type: "new_signal",
      title: "London HARSI BUY · EURUSD",
      message: "First HARSI print inside −15 to −30. SIMULATED demo tape.",
      symbol: "EURUSD",
      side: "buy",
      strategyId: "london-harsi",
      signalId: s1.id,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { userId: user.id, action: "login", detail: "DEMO seed login" },
      { userId: user.id, action: "strategy_changed", detail: "london-harsi enabled=true" },
      { userId: user.id, action: "order_submitted", detail: "buy EURUSD 0.15 PAPER" },
    ],
  });

  return user;
}

async function main() {
  if (process.env.DEMO_MODE !== "true") {
    console.log("Skipping seed (DEMO_MODE is not true).");
    return;
  }
  await seedUser("trader@harsi.ai", "Ava Moreau", "trader");
  await seedUser("pro@harsi.ai", "Desk Operator", "pro");
  const free = await prisma.user.upsert({
    where: { email: "free@harsi.ai" },
    create: {
      email: "free@harsi.ai",
      name: "Scout User",
      passwordHash: await hashPassword("harsi123"),
      plan: "free",
      demo: true,
    },
    update: { plan: "free", demo: true },
  });
  await seedUser("free@harsi.ai", free.name, "free");
  console.log("Seeded DEMO users: trader@harsi.ai, pro@harsi.ai, free@harsi.ai / harsi123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

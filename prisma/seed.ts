import "dotenv/config";
import bcrypt from "bcryptjs";
import { londonHarsi } from "@harsi/strategies";
import { closePositionQty, createLedger, quoteFromMid, submitOrder } from "@harsi/trading-engine";
import { prisma } from "../apps/web/lib/prisma";
import { createAccount } from "../apps/web/lib/auth";
import { saveLedger } from "../apps/web/lib/ledger";

async function main() {
  if (process.env.DEMO_MODE !== "true") {
    console.log("Seed skipped because DEMO_MODE is not true.");
    return;
  }
  const email = "demo@harsi.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo account already exists.");
    return;
  }
  const password = process.env.SEED_DEMO_PASSWORD || "harsi-demo-only";
  const created = await createAccount({ email, name: "Demo Desk", password });
  if (!created.ok) throw new Error(created.error);
  await prisma.subscription.update({
    where: { userId: created.userId },
    data: { plan: "pro", source: "demo", note: "Simulated Pro plan for local development. Stripe was not charged." },
  });
  const ledger = createLedger(100000);
  const costs = { commissionBps: 0.8, slippagePips: 0.2, spreadPips: 0.8 };
  const samples = [
    { symbol: "EURUSD", side: "buy" as const, qty: 20000, entry: 1.084, exit: 1.0862, day: "2026-02-03T10:00:00Z" },
    { symbol: "GBPUSD", side: "sell" as const, qty: 15000, entry: 1.268, exit: 1.271, day: "2026-02-04T11:00:00Z" },
    { symbol: "USDJPY", side: "buy" as const, qty: 20000, entry: 149.2, exit: 149.55, day: "2026-02-05T12:00:00Z" },
    { symbol: "XAUUSD", side: "buy" as const, qty: 2, entry: 2648, exit: 2656, day: "2026-02-06T13:00:00Z" },
    { symbol: "EURUSD", side: "sell" as const, qty: 10000, entry: 1.09, exit: 1.088, day: "2026-02-10T09:30:00Z" },
  ];
  for (const sample of samples) {
    const opened = Date.parse(sample.day);
    submitOrder(ledger, { symbol: sample.symbol, side: sample.side, type: "market", qty: sample.qty, strategyId: "london-harsi", now: opened }, quoteFromMid(sample.entry, sample.symbol === "USDJPY" ? 0.01 : sample.symbol === "XAUUSD" ? 0.1 : 0.0001, 0), { ...costs, slippagePips: 0, spreadPips: 0 });
    const position = ledger.positions.find((item) => item.status === "open" && item.symbol === sample.symbol);
    if (position) closePositionQty(ledger, position.id, null, sample.exit, { ...costs, slippagePips: 0, spreadPips: 0 }, opened + 45 * 60000, "seed");
  }
  submitOrder(ledger, { symbol: "EURUSD", side: "buy", type: "market", qty: 10000, stopLoss: 1.08, takeProfit: 1.092, strategyId: "pulse-confluence", now: Date.parse("2026-03-10T08:00:00Z") }, quoteFromMid(1.086, 0.0001, 0), { ...costs, slippagePips: 0, spreadPips: 0 });
  await saveLedger(created.userId, ledger);
  const asian = { high: 1.09, low: 1.08, mid: 1.085, bars: 80 };
  const buy = londonHarsi.evaluate({
    symbol: "EURUSD",
    timeframe: "1m",
    candles: [{ time: 1, open: 1.0828, high: 1.0832, low: 1.0824, close: 1.0828, volume: 100 }],
    asian,
    now: new Date("2026-01-05T07:50:00Z"),
    params: {},
    fired: { buy: false, sell: false },
    signalsToday: 0,
  });
  if (buy.signal) {
    await prisma.signal.create({
      data: {
        userId: created.userId,
        strategyId: "london-harsi",
        symbol: "EURUSD",
        timeframe: "1m",
        side: buy.signal.side,
        entry: buy.signal.entry,
        stop: buy.signal.stop,
        target: buy.signal.target,
        priceAt: buy.signal.entry,
        dedupeKey: `${created.userId}:seed:${buy.signal.dedupeKey}`,
        checks: JSON.stringify(buy.signal.checks),
        reasons: JSON.stringify(buy.signal.reasons),
        indicators: JSON.stringify(buy.signal.indicators),
        marketData: "simulated",
        createdAt: new Date("2026-01-05T07:50:00Z"),
      },
    });
  }
  await prisma.auditLog.create({ data: { userId: created.userId, action: "seed", detail: "Loaded simulated paper history and a historical HARSI signal." } });
  console.log(`Demo account ${email} / ${password}`);
  console.log("Plan is simulated Pro. Password hash stored; this password is only for local demo mode.");
  void bcrypt;
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

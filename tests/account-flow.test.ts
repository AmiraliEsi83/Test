import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../apps/web/lib/prisma";
import { createAccount } from "../apps/web/lib/auth";
import { analyticsFor, closePaperPosition, placePaperOrder, runUserBacktest } from "../apps/web/lib/actions";
import { loadLedger } from "../apps/web/lib/ledger";
import type { PublicUser } from "../apps/web/lib/auth";

async function wipe() {
  await prisma.trade.deleteMany();
  await prisma.order.deleteMany();
  await prisma.position.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.backtestRun.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.watchItem.deleteMany();
  await prisma.strategyConfig.deleteMany();
  await prisma.brokerConnection.deleteMany();
  await prisma.paperAccount.deleteMany();
  await prisma.preference.deleteMany();
  await prisma.riskSettings.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
}

describe("account and paper flow", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("signs up, opens a paper position, closes it, and updates history", async () => {
    await wipe();
    const created = await createAccount({ name: "Test Desk", email: "flow@harsi.test", password: "paper-pass-123" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const opened = await placePaperOrder(created.userId, { symbol: "EURUSD", side: "buy", type: "market", qty: 10000, stopLoss: 1.05, takeProfit: 1.2 });
    expect(opened.ok).toBe(true);
    const ledger = await loadLedger(created.userId);
    const position = ledger.positions.find((item) => item.status === "open");
    expect(position?.symbol).toBe("EURUSD");
    const closed = await closePaperPosition(created.userId, position!.id, null);
    expect(closed.ok).toBe(true);
    const after = await loadLedger(created.userId);
    expect(after.positions.filter((item) => item.status === "open")).toHaveLength(0);
    expect(after.trades).toHaveLength(1);
    expect(after.cash).not.toBe(100000);
    await prisma.subscription.update({ where: { userId: created.userId }, data: { plan: "trader" } });
    const user = { id: created.userId, plan: "trader", timezone: "Europe/London" } as PublicUser;
    const analytics = await analyticsFor(user);
    expect(analytics.ok).toBe(true);
    if (analytics.ok) expect(analytics.stats.trades).toBe(1);
    const free = await createAccount({ name: "Free Desk", email: "free@harsi.test", password: "paper-pass-123" });
    expect(free.ok).toBe(true);
    if (!free.ok) return;
    const blocked = await runUserBacktest({ id: free.userId, plan: "free", timezone: "Europe/London" } as PublicUser, {
      strategyId: "london-harsi",
      symbol: "EURUSD",
      timeframe: "15m",
      startDate: "2026-02-01",
      endDate: "2026-02-20",
      starting: 100000,
    });
    expect(blocked.ok).toBe(false);
  });
});

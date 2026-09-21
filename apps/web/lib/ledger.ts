import type { CostModel, Ledger, PaperOrder, PaperPosition, PaperTrade, Quote } from "@harsi/trading-engine";
import { getInstrument } from "@harsi/shared";
import { prisma } from "./prisma";

const chains = new Map<string, Promise<unknown>>();

export function locked<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(userId) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  chains.set(
    userId,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}

function maxSeq(ids: string[]) {
  let max = 1;
  for (const id of ids) {
    const value = Number(id.split("_")[1]);
    if (Number.isFinite(value)) max = Math.max(max, value + 1);
  }
  return max;
}

export async function loadLedger(userId: string): Promise<Ledger> {
  const [account, positions, orders, trades] = await Promise.all([
    prisma.paperAccount.findUnique({ where: { userId } }),
    prisma.position.findMany({ where: { userId, mode: "paper" } }),
    prisma.order.findMany({ where: { userId, mode: "paper" } }),
    prisma.trade.findMany({ where: { userId, mode: "paper" } }),
  ]);
  if (!account) throw new Error("Paper account is missing.");
  const ledger: Ledger = {
    cash: account.cash,
    startBalance: account.startBalance,
    seq: maxSeq([...positions.map((item) => item.id), ...orders.map((item) => item.id), ...trades.map((item) => item.id)]),
    positions: positions.map((position) => ({
      id: position.id,
      symbol: position.symbol,
      side: position.side as PaperPosition["side"],
      qty: position.qty,
      entry: position.entry,
      stop: position.stop,
      target: position.target,
      strategyId: position.strategyId,
      status: position.status as PaperPosition["status"],
      realizedPnl: position.realizedPnl,
      commission: position.commission,
      margin: position.margin,
      openedAt: position.openedAt.getTime(),
      closedAt: position.closedAt?.getTime() ?? null,
    })),
    orders: orders.map((order) => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side as PaperOrder["side"],
      type: order.type as PaperOrder["type"],
      qty: order.qty,
      limitPrice: order.limitPrice,
      stopPrice: order.stopPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      status: order.status as PaperOrder["status"],
      filledQty: order.filledQty,
      avgPrice: order.avgPrice,
      strategyId: order.strategyId,
      positionId: order.positionId,
      rejectReason: order.rejectReason,
      createdAt: order.createdAt.getTime(),
      updatedAt: order.updatedAt.getTime(),
    })),
    trades: trades.map((trade) => ({
      id: trade.id,
      positionId: trade.positionId || "",
      symbol: trade.symbol,
      side: trade.side as PaperTrade["side"],
      qty: trade.qty,
      entry: trade.entry,
      exit: trade.exit,
      pnl: trade.pnl,
      commission: trade.commission,
      spreadCost: trade.spreadCost,
      slippageCost: trade.slippage,
      strategyId: trade.strategyId,
      openedAt: trade.openedAt.getTime(),
      closedAt: trade.closedAt.getTime(),
      reason: trade.reason,
      rMultiple: trade.rMultiple,
    })),
  };
  return ledger;
}

export async function saveLedger(userId: string, ledger: Ledger) {
  await prisma.$transaction(async (tx) => {
    await tx.paperAccount.update({ where: { userId }, data: { cash: ledger.cash } });
    for (const position of ledger.positions) {
      const data = {
        userId,
        mode: "paper",
        broker: "paper",
        symbol: position.symbol,
        side: position.side,
        qty: position.qty,
        entry: position.entry,
        stop: position.stop,
        target: position.target,
        strategyId: position.strategyId,
        status: position.status,
        realizedPnl: position.realizedPnl,
        commission: position.commission,
        margin: position.margin,
        openedAt: new Date(position.openedAt),
        closedAt: position.closedAt ? new Date(position.closedAt) : null,
      };
      await tx.position.upsert({ where: { id: position.id }, create: { id: position.id, ...data }, update: data });
    }
    for (const order of ledger.orders) {
      const data = {
        userId,
        mode: "paper",
        broker: "paper",
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        qty: order.qty,
        limitPrice: order.limitPrice,
        stopPrice: order.stopPrice,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        status: order.status,
        filledQty: order.filledQty,
        avgPrice: order.avgPrice,
        strategyId: order.strategyId,
        positionId: order.positionId,
        rejectReason: order.rejectReason,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
      };
      await tx.order.upsert({ where: { id: order.id }, create: { id: order.id, ...data }, update: data });
    }
    for (const trade of ledger.trades) {
      const data = {
        userId,
        positionId: trade.positionId,
        mode: "paper",
        broker: "paper",
        symbol: trade.symbol,
        side: trade.side,
        qty: trade.qty,
        entry: trade.entry,
        exit: trade.exit,
        pnl: trade.pnl,
        commission: trade.commission,
        spreadCost: trade.spreadCost,
        slippage: trade.slippageCost,
        strategyId: trade.strategyId,
        reason: trade.reason,
        rMultiple: trade.rMultiple,
        openedAt: new Date(trade.openedAt),
        closedAt: new Date(trade.closedAt),
      };
      await tx.trade.upsert({ where: { id: trade.id }, create: { id: trade.id, ...data }, update: data });
    }
  });
}

export function costsFor(symbol: string, risk: { commissionBps: number; slippagePips: number }): CostModel {
  return {
    commissionBps: risk.commissionBps,
    slippagePips: risk.slippagePips,
    spreadPips: getInstrument(symbol).spreadPips,
  };
}

export type { Quote };

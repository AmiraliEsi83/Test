import { fromPips, INSTRUMENTS, pnlUsd, type Side } from "@harsi/shared";
import type { AdapterOrder, AdapterPosition, AccountSnapshot, BrokerAdapter, OrderRequest } from "./types.js";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface PaperFillAssumptions {
  spreadPips: number;
  slippagePips: number;
  commissionPerLot: number;
}

export const DEFAULT_PAPER_FRICTION: PaperFillAssumptions = {
  spreadPips: 1.1,
  slippagePips: 0.2,
  commissionPerLot: 7,
};

export class PaperBroker implements BrokerAdapter {
  readonly type = "paper";
  readonly name = "HARSI Paper Desk";
  cash: number;
  currency = "USD";
  leverage = 50;
  positions: AdapterPosition[] = [];
  orders: AdapterOrder[] = [];
  fills: { id: string; orderId: string; price: number; lots: number; commission: number; ts: number }[] = [];
  prices: Record<string, number> = {};
  friction: PaperFillAssumptions;

  constructor(startingCash = 100000, friction: PaperFillAssumptions = DEFAULT_PAPER_FRICTION) {
    this.cash = startingCash;
    this.friction = friction;
  }

  setPrice(symbol: string, price: number) {
    this.prices[symbol] = price;
  }

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async getAccount(): Promise<AccountSnapshot> {
    const unreal = this.unrealized();
    return {
      id: "PAPER-8801",
      broker: this.name,
      environment: "paper",
      currency: this.currency,
      cash: this.cash,
      equity: this.cash + unreal,
      buyingPower: this.cash * this.leverage,
      leverage: this.leverage,
    };
  }

  async getPositions(): Promise<AdapterPosition[]> {
    return this.positions;
  }

  async getOrders(): Promise<AdapterOrder[]> {
    return this.orders;
  }

  fillPrice(symbol: string, side: Side, type: string, limit?: number): number | null {
    const mid = this.prices[symbol];
    if (mid == null) return null;
    const spread = fromPips(symbol, this.friction.spreadPips) / 2;
    const slip = fromPips(symbol, this.friction.slippagePips);
    if (type === "market") {
      return side === "buy" ? mid + spread + slip : mid - spread - slip;
    }
    if (type === "limit" && limit != null) {
      if (side === "buy" && mid <= limit) return Math.min(limit, mid + spread);
      if (side === "sell" && mid >= limit) return Math.max(limit, mid - spread);
      return null;
    }
    if (type === "stop" && limit != null) {
      if (side === "buy" && mid >= limit) return mid + spread + slip;
      if (side === "sell" && mid <= limit) return mid - spread - slip;
      return null;
    }
    return null;
  }

  async placeOrder(order: OrderRequest): Promise<AdapterOrder> {
    const inst = INSTRUMENTS[order.symbol];
    if (!inst) {
      const rejected: AdapterOrder = {
        id: uid("ord"),
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        lots: order.lots,
        status: "rejected",
        createdAt: Date.now(),
        reason: "Unknown instrument",
      };
      this.orders.unshift(rejected);
      return rejected;
    }
    const created: AdapterOrder = {
      id: uid("ord"),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      lots: order.lots,
      price: order.price,
      status: order.type === "market" ? "open" : "pending",
      createdAt: Date.now(),
    };
    const px = this.fillPrice(order.symbol, order.side, order.type, order.price);
    if (px == null && order.type !== "market") {
      this.orders.unshift(created);
      return created;
    }
    if (px == null) {
      created.status = "rejected";
      created.reason = "No market price";
      this.orders.unshift(created);
      return created;
    }
    return this.fill(created, px, order);
  }

  private fill(order: AdapterOrder, px: number, req?: OrderRequest): AdapterOrder {
    const commission = Math.abs(order.lots) * this.friction.commissionPerLot;
    this.cash -= commission;
    order.status = "filled";
    order.filledLots = order.lots;
    order.averagePrice = px;
    this.fills.unshift({
      id: uid("fill"),
      orderId: order.id,
      price: px,
      lots: order.lots,
      commission,
      ts: Date.now(),
    });
    this.positions.unshift({
      id: uid("pos"),
      symbol: order.symbol,
      side: order.side,
      lots: order.lots,
      entry: px,
      stop: req?.stop,
      target: req?.target,
      openedAt: Date.now(),
    });
    this.orders.unshift(order);
    return order;
  }

  matchPending() {
    for (const order of this.orders) {
      if (order.status !== "pending") continue;
      const px = this.fillPrice(order.symbol, order.side, order.type, order.price ?? undefined);
      if (px != null) this.fill(order, px);
    }
  }

  async cancelOrder(id: string): Promise<void> {
    const o = this.orders.find((x) => x.id === id);
    if (o && (o.status === "pending" || o.status === "open")) o.status = "cancelled";
  }

  async closePosition(id: string, lots?: number): Promise<void> {
    const pos = this.positions.find((p) => p.id === id);
    if (!pos) return;
    const closeLots = lots && lots < pos.lots ? lots : pos.lots;
    const px = this.fillPrice(pos.symbol, pos.side === "buy" ? "sell" : "buy", "market");
    if (px == null) throw new Error("No market price");
    const pnl = pnlUsd(pos.symbol, pos.side, pos.entry, px, closeLots);
    const commission = closeLots * this.friction.commissionPerLot;
    this.cash += pnl - commission;
    if (closeLots >= pos.lots) {
      this.positions = this.positions.filter((p) => p.id !== id);
    } else {
      pos.lots -= closeLots;
    }
    this.orders.unshift({
      id: uid("ord"),
      symbol: pos.symbol,
      side: pos.side === "buy" ? "sell" : "buy",
      type: "market",
      lots: closeLots,
      status: "filled",
      filledLots: closeLots,
      averagePrice: px,
      createdAt: Date.now(),
      reason: lots && lots < pos.lots + closeLots ? "Partial close" : "Close",
    });
  }

  async modifyPosition(id: string, patch: { stop?: number | null; target?: number | null }) {
    const pos = this.positions.find((p) => p.id === id);
    if (!pos) return;
    if (patch.stop !== undefined) pos.stop = patch.stop;
    if (patch.target !== undefined) pos.target = patch.target;
  }

  checkStops() {
    const closed: { id: string; reason: string; pnl: number; exit: number }[] = [];
    for (const pos of [...this.positions]) {
      const px = this.prices[pos.symbol];
      if (px == null) continue;
      if (pos.stop != null) {
        if (pos.side === "buy" && px <= pos.stop) {
          const before = this.cash;
          void this.closePosition(pos.id);
          closed.push({ id: pos.id, reason: "Stop loss", pnl: this.cash - before, exit: px });
          continue;
        }
        if (pos.side === "sell" && px >= pos.stop) {
          const before = this.cash;
          void this.closePosition(pos.id);
          closed.push({ id: pos.id, reason: "Stop loss", pnl: this.cash - before, exit: px });
          continue;
        }
      }
      if (pos.target != null) {
        if (pos.side === "buy" && px >= pos.target) {
          const before = this.cash;
          void this.closePosition(pos.id);
          closed.push({ id: pos.id, reason: "Take profit", pnl: this.cash - before, exit: px });
        } else if (pos.side === "sell" && px <= pos.target) {
          const before = this.cash;
          void this.closePosition(pos.id);
          closed.push({ id: pos.id, reason: "Take profit", pnl: this.cash - before, exit: px });
        }
      }
    }
    return closed;
  }

  unrealized(): number {
    return this.positions.reduce((s, p) => {
      const px = this.prices[p.symbol] ?? p.entry;
      return s + pnlUsd(p.symbol, p.side, p.entry, px, p.lots);
    }, 0);
  }
}

import type { OrderType, Side } from "@harsi/shared";

export interface AccountSnapshot {
  id: string;
  broker: string;
  environment: "paper" | "live" | "not_configured";
  currency: string;
  cash: number;
  equity: number;
  buyingPower: number;
  leverage: number;
}

export interface AdapterPosition {
  id: string;
  symbol: string;
  side: Side;
  lots: number;
  entry: number;
  stop?: number | null;
  target?: number | null;
  openedAt: number;
}

export interface AdapterOrder {
  id: string;
  symbol: string;
  side: Side;
  type: OrderType;
  lots: number;
  price?: number | null;
  status: "open" | "pending" | "filled" | "cancelled" | "rejected" | "partial";
  filledLots?: number;
  averagePrice?: number;
  createdAt: number;
  reason?: string;
}

export interface OrderRequest {
  symbol: string;
  side: Side;
  type: OrderType;
  lots: number;
  price?: number;
  stop?: number;
  target?: number;
  clientId?: string;
  strategyId?: string;
  note?: string;
}

export interface BrokerAdapter {
  readonly type: string;
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccount(): Promise<AccountSnapshot>;
  getPositions(): Promise<AdapterPosition[]>;
  getOrders(): Promise<AdapterOrder[]>;
  placeOrder(order: OrderRequest): Promise<AdapterOrder>;
  cancelOrder(id: string): Promise<void>;
  closePosition(id: string, lots?: number): Promise<void>;
  modifyPosition?(id: string, patch: { stop?: number | null; target?: number | null }): Promise<void>;
}

export class NotConfiguredBroker implements BrokerAdapter {
  readonly type: string;
  readonly name: string;
  private reason: string;

  constructor(type: string, name: string, reason: string) {
    this.type = type;
    this.name = name;
    this.reason = reason;
  }

  private fail(): never {
    throw new Error(`NOT CONNECTED: ${this.name} is not configured. ${this.reason}`);
  }

  async connect(): Promise<void> {
    this.fail();
  }
  async disconnect(): Promise<void> {}
  async getAccount(): Promise<AccountSnapshot> {
    this.fail();
  }
  async getPositions(): Promise<AdapterPosition[]> {
    this.fail();
  }
  async getOrders(): Promise<AdapterOrder[]> {
    this.fail();
  }
  async placeOrder(): Promise<AdapterOrder> {
    this.fail();
  }
  async cancelOrder(): Promise<void> {
    this.fail();
  }
  async closePosition(): Promise<void> {
    this.fail();
  }
}

export const BROKER_CATALOG = [
  {
    type: "paper",
    name: "HARSI Paper Desk",
    blurb: "Simulated fills with spread, slippage, and commission. Always available.",
    implemented: true,
    fields: [] as { key: string; label: string; secret?: boolean; type?: string; options?: string[] }[],
  },
  {
    type: "oanda",
    name: "OANDA",
    blurb: "FX and metals via REST. Practice or live token stored server-side.",
    implemented: true,
    fields: [
      { key: "accountId", label: "Account ID" },
      { key: "apiKey", label: "API token", secret: true },
      { key: "env", label: "Environment", type: "select", options: ["practice", "live"] },
    ],
  },
  {
    type: "alpaca",
    name: "Alpaca",
    blurb: "US equities & crypto. Paper keys accepted. Live orders only with live keys.",
    implemented: true,
    fields: [
      { key: "keyId", label: "Key ID" },
      { key: "secret", label: "Secret key", secret: true },
      { key: "env", label: "Environment", type: "select", options: ["paper", "live"] },
    ],
  },
  {
    type: "ibkr",
    name: "Interactive Brokers",
    blurb: "Requires a running Client Portal Gateway on a host the server can reach.",
    implemented: false,
    fields: [
      { key: "accountId", label: "Account" },
      { key: "host", label: "Gateway host" },
      { key: "port", label: "Port" },
    ],
  },
  {
    type: "mt5",
    name: "MetaTrader 5",
    blurb: "Placeholder — MT5 needs a bridge process and cannot be faked from the browser.",
    implemented: false,
    fields: [
      { key: "login", label: "Login" },
      { key: "password", label: "Password", secret: true },
      { key: "server", label: "Server" },
    ],
  },
];

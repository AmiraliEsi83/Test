import { NotConfiguredBroker, type AccountSnapshot, type AdapterOrder, type AdapterPosition, type BrokerAdapter, type OrderRequest } from "./types.js";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export class OandaAdapter implements BrokerAdapter {
  readonly type = "oanda";
  readonly name = "OANDA";
  private accountId: string;
  private apiKey: string;
  private env: "practice" | "live";
  private connected = false;

  constructor(opts: { accountId: string; apiKey: string; env?: "practice" | "live" }) {
    this.accountId = opts.accountId;
    this.apiKey = opts.apiKey;
    this.env = opts.env === "live" ? "live" : "practice";
  }

  private host() {
    return this.env === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";
  }

  private async req(path: string, init: RequestInit = {}) {
    const res = await fetch(`${this.host()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OANDA ${res.status}: ${body.slice(0, 240)}`);
    }
    return res.json();
  }

  async connect(): Promise<void> {
    await this.req(`/v3/accounts/${this.accountId}/summary`);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getAccount(): Promise<AccountSnapshot> {
    const data = await this.req(`/v3/accounts/${this.accountId}/summary`);
    const a = data.account;
    return {
      id: a.id,
      broker: this.name,
      environment: this.env === "live" ? "live" : "paper",
      currency: a.currency,
      cash: Number(a.balance),
      equity: Number(a.NAV ?? a.balance),
      buyingPower: Number(a.marginAvailable ?? a.balance),
      leverage: 30,
    };
  }

  async getPositions(): Promise<AdapterPosition[]> {
    const data = await this.req(`/v3/accounts/${this.accountId}/openPositions`);
    return (data.positions || []).flatMap((p: { instrument: string; long: { units: string; averagePrice: string }; short: { units: string; averagePrice: string } }) => {
      const out: AdapterPosition[] = [];
      const lu = Number(p.long?.units || 0);
      const su = Number(p.short?.units || 0);
      if (lu) {
        out.push({
          id: `${p.instrument}-long`,
          symbol: p.instrument.replace("_", ""),
          side: "buy",
          lots: Math.abs(lu) / 100000,
          entry: Number(p.long.averagePrice),
          openedAt: Date.now(),
        });
      }
      if (su) {
        out.push({
          id: `${p.instrument}-short`,
          symbol: p.instrument.replace("_", ""),
          side: "sell",
          lots: Math.abs(su) / 100000,
          entry: Number(p.short.averagePrice),
          openedAt: Date.now(),
        });
      }
      return out;
    });
  }

  async getOrders(): Promise<AdapterOrder[]> {
    const data = await this.req(`/v3/accounts/${this.accountId}/pendingOrders`);
    return (data.orders || []).map((o: { id: string; instrument: string; units: string; type: string; price?: string; createTime: string; state: string }) => ({
      id: o.id,
      symbol: o.instrument.replace("_", ""),
      side: Number(o.units) > 0 ? "buy" : "sell",
      type: String(o.type).toLowerCase().includes("limit") ? "limit" : String(o.type).toLowerCase().includes("stop") ? "stop" : "market",
      lots: Math.abs(Number(o.units)) / 100000,
      price: o.price ? Number(o.price) : null,
      status: o.state === "PENDING" ? "pending" : "open",
      createdAt: Date.parse(o.createTime) || Date.now(),
    }));
  }

  async placeOrder(order: OrderRequest): Promise<AdapterOrder> {
    const instrument = order.symbol.replace(/^(EUR|GBP|USD|AUD|NZD|XAU)/, (m) => m) && order.symbol.length === 6
      ? `${order.symbol.slice(0, 3)}_${order.symbol.slice(3)}`
      : order.symbol;
    const units = Math.round(order.lots * 100000) * (order.side === "buy" ? 1 : -1);
    const body: Record<string, unknown> = {
      order: {
        instrument,
        units: String(units),
        type: order.type === "limit" ? "LIMIT" : order.type === "stop" ? "STOP" : "MARKET",
        timeInForce: order.type === "market" ? "FOK" : "GTC",
        ...(order.price ? { price: String(order.price) } : {}),
      },
    };
    const data = await this.req(`/v3/accounts/${this.accountId}/orders`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const fill = data.orderFillTransaction || data.orderCreateTransaction;
    return {
      id: fill?.id || uid("oanda"),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      lots: order.lots,
      status: data.orderFillTransaction ? "filled" : "pending",
      averagePrice: fill?.price ? Number(fill.price) : undefined,
      filledLots: data.orderFillTransaction ? order.lots : 0,
      createdAt: Date.now(),
    };
  }

  async cancelOrder(id: string): Promise<void> {
    await this.req(`/v3/accounts/${this.accountId}/orders/${id}/cancel`, { method: "PUT" });
  }

  async closePosition(id: string): Promise<void> {
    const [instrument, side] = id.split("-");
    const pathSide = side === "long" ? "longUnits" : "shortUnits";
    const inst = instrument.length === 6 ? `${instrument.slice(0, 3)}_${instrument.slice(3)}` : instrument;
    await this.req(`/v3/accounts/${this.accountId}/positions/${inst}/close`, {
      method: "PUT",
      body: JSON.stringify({ [pathSide]: "ALL" }),
    });
  }
}

export class AlpacaAdapter implements BrokerAdapter {
  readonly type = "alpaca";
  readonly name = "Alpaca";
  private keyId: string;
  private secret: string;
  private env: "paper" | "live";

  constructor(opts: { keyId: string; secret: string; env?: "paper" | "live" }) {
    this.keyId = opts.keyId;
    this.secret = opts.secret;
    this.env = opts.env === "live" ? "live" : "paper";
  }

  private host() {
    return this.env === "live" ? "https://api.alpaca.markets" : "https://paper-api.alpaca.markets";
  }

  private async req(path: string, init: RequestInit = {}) {
    const res = await fetch(`${this.host()}${path}`, {
      ...init,
      headers: {
        "APCA-API-KEY-ID": this.keyId,
        "APCA-API-SECRET-KEY": this.secret,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Alpaca ${res.status}: ${body.slice(0, 240)}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async connect(): Promise<void> {
    await this.req("/v2/account");
  }
  async disconnect(): Promise<void> {}

  async getAccount(): Promise<AccountSnapshot> {
    const a = await this.req("/v2/account");
    return {
      id: a.account_number || a.id,
      broker: this.name,
      environment: this.env,
      currency: "USD",
      cash: Number(a.cash),
      equity: Number(a.equity),
      buyingPower: Number(a.buying_power),
      leverage: 1,
    };
  }

  async getPositions(): Promise<AdapterPosition[]> {
    const rows = await this.req("/v2/positions");
    return (rows || []).map((p: { asset_id: string; symbol: string; side: string; qty: string; avg_entry_price: string }) => ({
      id: p.asset_id,
      symbol: p.symbol,
      side: p.side === "long" ? "buy" : "sell",
      lots: Number(p.qty),
      entry: Number(p.avg_entry_price),
      openedAt: Date.now(),
    }));
  }

  async getOrders(): Promise<AdapterOrder[]> {
    const rows = await this.req("/v2/orders?status=open");
    return (rows || []).map((o: { id: string; symbol: string; side: string; type: string; qty: string; limit_price?: string; status: string; created_at: string }) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side === "buy" ? "buy" : "sell",
      type: o.type === "limit" ? "limit" : o.type === "stop" ? "stop" : "market",
      lots: Number(o.qty),
      price: o.limit_price ? Number(o.limit_price) : null,
      status: o.status === "filled" ? "filled" : o.status === "canceled" ? "cancelled" : "pending",
      createdAt: Date.parse(o.created_at) || Date.now(),
    }));
  }

  async placeOrder(order: OrderRequest): Promise<AdapterOrder> {
    const data = await this.req("/v2/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: order.symbol,
        qty: String(order.lots),
        side: order.side === "buy" ? "buy" : "sell",
        type: order.type,
        time_in_force: "day",
        ...(order.price ? { limit_price: String(order.price) } : {}),
      }),
    });
    return {
      id: data.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      lots: order.lots,
      status: data.status === "filled" ? "filled" : "pending",
      averagePrice: data.filled_avg_price ? Number(data.filled_avg_price) : undefined,
      createdAt: Date.now(),
    };
  }

  async cancelOrder(id: string): Promise<void> {
    await this.req(`/v2/orders/${id}`, { method: "DELETE" });
  }

  async closePosition(id: string): Promise<void> {
    await this.req(`/v2/positions/${id}`, { method: "DELETE" });
  }
}

export function createBrokerAdapter(
  type: string,
  credentials: Record<string, string>
): BrokerAdapter {
  if (type === "oanda") {
    if (!credentials.apiKey || !credentials.accountId) {
      return new NotConfiguredBroker("oanda", "OANDA", "Account ID and API token are required. Secrets stay on the server.");
    }
    return new OandaAdapter({
      accountId: credentials.accountId,
      apiKey: credentials.apiKey,
      env: credentials.env === "live" ? "live" : "practice",
    });
  }
  if (type === "alpaca") {
    if (!credentials.keyId || !credentials.secret) {
      return new NotConfiguredBroker("alpaca", "Alpaca", "Key ID and secret are required.");
    }
    return new AlpacaAdapter({
      keyId: credentials.keyId,
      secret: credentials.secret,
      env: credentials.env === "live" ? "live" : "paper",
    });
  }
  if (type === "ibkr") {
    return new NotConfiguredBroker(
      "ibkr",
      "Interactive Brokers",
      "IBKR Client Portal Gateway is not running on this server. Connection stays NOT CONNECTED until a gateway is available."
    );
  }
  if (type === "mt5") {
    return new NotConfiguredBroker(
      "mt5",
      "MetaTrader 5",
      "MT5 requires a dedicated bridge host. This installation does not include one, so live MT5 execution is NOT CONNECTED."
    );
  }
  return new NotConfiguredBroker(type, type, "Unknown adapter.");
}

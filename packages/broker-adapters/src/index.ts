import type { Side } from "@harsi/shared";

export interface BrokerCredentials {
  accountId?: string;
  apiKey?: string;
  keyId?: string;
  secret?: string;
  environment?: string;
  host?: string;
  port?: string;
}

export interface OrderRequest {
  symbol: string;
  side: Side;
  type: "market" | "limit" | "stop";
  qty: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

export type BrokerFailure = { ok: false; code: "not_configured" | "not_connected" | "rejected" | "error"; message: string };
export type BrokerOk<T> = { ok: true; data: T };

export interface BrokerAccount {
  id: string;
  currency: string;
  balance: number | null;
  environment: string;
}

export interface BrokerPosition {
  id: string;
  symbol: string;
  side: Side;
  qty: number;
  entry: number | null;
}

export interface BrokerOrder {
  id: string;
  symbol: string;
  side: Side;
  type: string;
  qty: number;
  status: string;
  price: number | null;
}

export interface BrokerAdapter {
  id: string;
  name: string;
  kind: "paper" | "live" | "placeholder";
  connect(): Promise<BrokerOk<{ environment: string; account: BrokerAccount }> | BrokerFailure>;
  disconnect(): Promise<BrokerOk<{ disconnected: true }> | BrokerFailure>;
  getAccount(): Promise<BrokerOk<BrokerAccount> | BrokerFailure>;
  getPositions(): Promise<BrokerOk<BrokerPosition[]> | BrokerFailure>;
  getOrders(): Promise<BrokerOk<BrokerOrder[]> | BrokerFailure>;
  placeOrder(order: OrderRequest): Promise<BrokerOk<BrokerOrder> | BrokerFailure>;
  cancelOrder(id: string): Promise<BrokerOk<{ id: string }> | BrokerFailure>;
  closePosition(id: string): Promise<BrokerOk<{ id: string }> | BrokerFailure>;
}

function missing(message: string): BrokerFailure {
  return { ok: false, code: "not_configured", message };
}

function failed(message: string, code: BrokerFailure["code"] = "error"): BrokerFailure {
  return { ok: false, code, message };
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  return text.slice(0, 280) || `HTTP ${response.status}`;
}

export function toOandaInstrument(symbol: string): string | null {
  if (!/^[A-Z]{6}$/.test(symbol)) return null;
  return `${symbol.slice(0, 3)}_${symbol.slice(3)}`;
}

export function createOandaAdapter(creds: BrokerCredentials | null): BrokerAdapter {
  const host = creds?.environment === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";
  const ready = Boolean(creds?.apiKey && creds.accountId);
  const headers = () => ({
    Authorization: `Bearer ${creds?.apiKey ?? ""}`,
    "Content-Type": "application/json",
  });
  return {
    id: "oanda",
    name: "OANDA",
    kind: "live",
    async connect() {
      return this.getAccount().then((account) => {
        if (!account.ok) return account;
        return { ok: true as const, data: { environment: creds?.environment === "live" ? "live" : "practice", account: account.data } };
      });
    },
    async disconnect() {
      return { ok: true, data: { disconnected: true } };
    },
    async getAccount() {
      if (!ready || !creds?.accountId) return missing("OANDA is not configured. Add an API token and account id on the server. No account was queried.");
      const response = await fetch(`${host}/v3/accounts/${encodeURIComponent(creds.accountId)}/summary`, { headers: headers() });
      if (!response.ok) return failed(await readError(response), "not_connected");
      const body = (await response.json()) as { account?: { id?: string; currency?: string; balance?: string } };
      return {
        ok: true,
        data: {
          id: body.account?.id || creds.accountId,
          currency: body.account?.currency || "USD",
          balance: body.account?.balance != null ? Number(body.account.balance) : null,
          environment: creds.environment === "live" ? "live" : "practice",
        },
      };
    },
    async getPositions() {
      if (!ready || !creds?.accountId) return missing("OANDA is not configured.");
      const response = await fetch(`${host}/v3/accounts/${encodeURIComponent(creds.accountId)}/openPositions`, { headers: headers() });
      if (!response.ok) return failed(await readError(response), "not_connected");
      const body = (await response.json()) as { positions?: { instrument: string; long: { units: string; averagePrice: string }; short: { units: string; averagePrice: string } }[] };
      const positions: BrokerPosition[] = [];
      for (const position of body.positions ?? []) {
        const longUnits = Number(position.long.units);
        const shortUnits = Number(position.short.units);
        if (longUnits > 0) {
          positions.push({ id: `${position.instrument}-long`, symbol: position.instrument.replace("_", ""), side: "buy", qty: longUnits, entry: Number(position.long.averagePrice) });
        }
        if (shortUnits < 0) {
          positions.push({ id: `${position.instrument}-short`, symbol: position.instrument.replace("_", ""), side: "sell", qty: Math.abs(shortUnits), entry: Number(position.short.averagePrice) });
        }
      }
      return { ok: true, data: positions };
    },
    async getOrders() {
      if (!ready || !creds?.accountId) return missing("OANDA is not configured.");
      const response = await fetch(`${host}/v3/accounts/${encodeURIComponent(creds.accountId)}/pendingOrders`, { headers: headers() });
      if (!response.ok) return failed(await readError(response), "not_connected");
      const body = (await response.json()) as { orders?: { id: string; instrument: string; units: string; type: string; price?: string }[] };
      return {
        ok: true,
        data: (body.orders ?? []).map((order) => ({
          id: order.id,
          symbol: order.instrument.replace("_", ""),
          side: Number(order.units) >= 0 ? "buy" as const : "sell" as const,
          type: order.type,
          qty: Math.abs(Number(order.units)),
          status: "pending",
          price: order.price != null ? Number(order.price) : null,
        })),
      };
    },
    async placeOrder(order) {
      if (!ready || !creds?.accountId) return missing("OANDA is not configured. The order was not sent.");
      const instrument = toOandaInstrument(order.symbol);
      if (!instrument) return failed(`${order.symbol} is not an OANDA FX instrument. The order was not sent.`, "rejected");
      const units = order.side === "buy" ? String(order.qty) : String(-order.qty);
      const payload: Record<string, unknown> = {
        order: {
          type: order.type === "market" ? "MARKET" : order.type === "limit" ? "LIMIT" : "STOP",
          instrument,
          units,
          timeInForce: order.type === "market" ? "FOK" : "GTC",
          positionFill: "DEFAULT",
          ...(order.type === "limit" ? { price: String(order.limitPrice) } : {}),
          ...(order.type === "stop" ? { price: String(order.stopPrice) } : {}),
          ...(order.stopLoss ? { stopLossOnFill: { price: String(order.stopLoss) } } : {}),
          ...(order.takeProfit ? { takeProfitOnFill: { price: String(order.takeProfit) } } : {}),
        },
      };
      const response = await fetch(`${host}/v3/accounts/${encodeURIComponent(creds.accountId)}/orders`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) return failed(await readError(response), "rejected");
      const body = (await response.json()) as { orderCreateTransaction?: { id?: string }; orderFillTransaction?: { id?: string; price?: string } };
      const id = body.orderFillTransaction?.id || body.orderCreateTransaction?.id || "oanda-order";
      return {
        ok: true,
        data: {
          id,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          qty: order.qty,
          status: body.orderFillTransaction ? "filled" : "pending",
          price: body.orderFillTransaction?.price != null ? Number(body.orderFillTransaction.price) : null,
        },
      };
    },
    async cancelOrder(id) {
      if (!ready || !creds?.accountId) return missing("OANDA is not configured. Nothing was cancelled.");
      const response = await fetch(`${host}/v3/accounts/${encodeURIComponent(creds.accountId)}/orders/${encodeURIComponent(id)}/cancel`, {
        method: "PUT",
        headers: headers(),
      });
      if (!response.ok) return failed(await readError(response), "rejected");
      return { ok: true, data: { id } };
    },
    async closePosition(id) {
      if (!ready || !creds?.accountId) return missing("OANDA is not configured. The position was not closed.");
      const instrument = id.includes("_") ? id.split("-")[0] : toOandaInstrument(id.replace(/-(long|short)$/, ""));
      if (!instrument) return failed("Could not map that position to an OANDA instrument.", "rejected");
      const long = id.endsWith("short") ? "NONE" : "ALL";
      const short = id.endsWith("short") ? "ALL" : "NONE";
      const response = await fetch(`${host}/v3/accounts/${encodeURIComponent(creds.accountId)}/positions/${encodeURIComponent(instrument)}/close`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ longUnits: long, shortUnits: short }),
      });
      if (!response.ok) return failed(await readError(response), "rejected");
      return { ok: true, data: { id } };
    },
  };
}

export function createAlpacaAdapter(creds: BrokerCredentials | null): BrokerAdapter {
  const paper = creds?.environment !== "live";
  const host = paper ? "https://paper-api.alpaca.markets" : "https://api.alpaca.markets";
  const ready = Boolean(creds?.keyId && creds.secret);
  const headers = () => ({
    "APCA-API-KEY-ID": creds?.keyId ?? "",
    "APCA-API-SECRET-KEY": creds?.secret ?? "",
  });
  const equity = (symbol: string) => symbol === "SPY" || symbol === "QQQ";
  return {
    id: "alpaca",
    name: "Alpaca",
    kind: "live",
    async connect() {
      const account = await this.getAccount();
      if (!account.ok) return account;
      return { ok: true, data: { environment: paper ? "paper" : "live", account: account.data } };
    },
    async disconnect() {
      return { ok: true, data: { disconnected: true } };
    },
    async getAccount() {
      if (!ready) return missing("Alpaca is not configured. Add a key id and secret on the server. No account was queried.");
      const response = await fetch(`${host}/v2/account`, { headers: headers() });
      if (!response.ok) return failed(await readError(response), "not_connected");
      const body = (await response.json()) as { id?: string; currency?: string; equity?: string };
      return {
        ok: true,
        data: {
          id: body.id || "alpaca",
          currency: body.currency || "USD",
          balance: body.equity != null ? Number(body.equity) : null,
          environment: paper ? "paper" : "live",
        },
      };
    },
    async getPositions() {
      if (!ready) return missing("Alpaca is not configured.");
      const response = await fetch(`${host}/v2/positions`, { headers: headers() });
      if (!response.ok) return failed(await readError(response), "not_connected");
      const body = (await response.json()) as { asset_id: string; symbol: string; qty: string; avg_entry_price: string; side: string }[];
      return {
        ok: true,
        data: body.map((position) => ({
          id: position.asset_id,
          symbol: position.symbol,
          side: position.side === "short" ? "sell" as const : "buy" as const,
          qty: Math.abs(Number(position.qty)),
          entry: Number(position.avg_entry_price),
        })),
      };
    },
    async getOrders() {
      if (!ready) return missing("Alpaca is not configured.");
      const response = await fetch(`${host}/v2/orders?status=open`, { headers: headers() });
      if (!response.ok) return failed(await readError(response), "not_connected");
      const body = (await response.json()) as { id: string; symbol: string; side: string; type: string; qty: string; status: string; limit_price: string | null }[];
      return {
        ok: true,
        data: body.map((order) => ({
          id: order.id,
          symbol: order.symbol,
          side: order.side === "sell" ? "sell" as const : "buy" as const,
          type: order.type,
          qty: Number(order.qty),
          status: order.status,
          price: order.limit_price != null ? Number(order.limit_price) : null,
        })),
      };
    },
    async placeOrder(order) {
      if (!ready) return missing("Alpaca is not configured. The order was not sent.");
      if (!equity(order.symbol)) return failed("This Alpaca adapter routes SPY and QQQ. The order was not sent.", "rejected");
      const response = await fetch(`${host}/v2/orders`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: order.symbol,
          qty: String(order.qty),
          side: order.side,
          type: order.type === "stop" ? "stop" : order.type,
          time_in_force: "day",
          ...(order.limitPrice ? { limit_price: String(order.limitPrice) } : {}),
          ...(order.stopPrice ? { stop_price: String(order.stopPrice) } : {}),
        }),
      });
      if (!response.ok) return failed(await readError(response), "rejected");
      const body = (await response.json()) as { id: string; status: string; filled_avg_price: string | null };
      return {
        ok: true,
        data: {
          id: body.id,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          qty: order.qty,
          status: body.status,
          price: body.filled_avg_price != null ? Number(body.filled_avg_price) : null,
        },
      };
    },
    async cancelOrder(id) {
      if (!ready) return missing("Alpaca is not configured. Nothing was cancelled.");
      const response = await fetch(`${host}/v2/orders/${encodeURIComponent(id)}`, { method: "DELETE", headers: headers() });
      if (!response.ok && response.status !== 204) return failed(await readError(response), "rejected");
      return { ok: true, data: { id } };
    },
    async closePosition(id) {
      if (!ready) return missing("Alpaca is not configured. The position was not closed.");
      const response = await fetch(`${host}/v2/positions/${encodeURIComponent(id)}`, { method: "DELETE", headers: headers() });
      if (!response.ok) return failed(await readError(response), "rejected");
      return { ok: true, data: { id } };
    },
  };
}

export function createIbkrAdapter(creds: BrokerCredentials | null): BrokerAdapter {
  const host = creds?.host || "";
  const port = creds?.port || "";
  const base = host && port ? `https://${host}:${port}/v1/api` : "";
  async function probe(): Promise<BrokerOk<{ authenticated: boolean }> | BrokerFailure> {
    if (!base || !creds?.accountId) return missing("Interactive Brokers is not configured. The Client Portal gateway host is empty, so nothing was contacted.");
    try {
      const response = await fetch(`${base}/iserver/auth/status`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) return failed(await readError(response), "not_connected");
      const body = (await response.json()) as { authenticated?: boolean };
      if (!body.authenticated) return failed("The IBKR gateway responded, but the session is not authenticated.", "not_connected");
      return { ok: true, data: { authenticated: true } };
    } catch (error) {
      return failed(error instanceof Error ? error.message : "IBKR gateway unreachable", "not_connected");
    }
  }
  const unavailable = async (): Promise<BrokerFailure> => {
    const status = await probe();
    if (!status.ok) return status;
    return failed("The gateway is authenticated, but this build does not submit IBKR orders. No order was sent.", "not_configured");
  };
  return {
    id: "ibkr",
    name: "Interactive Brokers",
    kind: "live",
    async connect() {
      const status = await probe();
      if (!status.ok) return status;
      return {
        ok: true,
        data: {
          environment: "gateway",
          account: { id: creds?.accountId || "", currency: "USD", balance: null, environment: "gateway" },
        },
      };
    },
    async disconnect() {
      return { ok: true, data: { disconnected: true } };
    },
    async getAccount() {
      const status = await probe();
      if (!status.ok) return status;
      return { ok: true, data: { id: creds?.accountId || "", currency: "USD", balance: null, environment: "gateway" } };
    },
    async getPositions() {
      return unavailable();
    },
    async getOrders() {
      return unavailable();
    },
    async placeOrder() {
      return unavailable();
    },
    async cancelOrder() {
      return unavailable();
    },
    async closePosition() {
      return unavailable();
    },
  };
}

function placeholder(id: string, name: string, message: string): BrokerAdapter {
  const fail = async (): Promise<BrokerFailure> => missing(message);
  return {
    id,
    name,
    kind: "placeholder",
    connect: fail,
    disconnect: async () => ({ ok: true, data: { disconnected: true } }),
    getAccount: fail,
    getPositions: fail,
    getOrders: fail,
    placeOrder: fail,
    cancelOrder: fail,
    closePosition: fail,
  };
}

export function createMt5Adapter(): BrokerAdapter {
  return placeholder(
    "mt5",
    "MetaTrader 5",
    "MetaTrader 5 needs a desktop bridge. This server cannot open an MT5 session. Not connected."
  );
}

export const BROKER_CATALOG = [
  { id: "paper", name: "HARSI Paper", kind: "paper" as const, blurb: "Local paper ledger. Fills, stops, and P/L stay in your account database." },
  { id: "oanda", name: "OANDA", kind: "live" as const, blurb: "Practice or live REST. Orders are sent only after a successful account check." },
  { id: "alpaca", name: "Alpaca", kind: "live" as const, blurb: "Equities paper or live API for SPY and QQQ. FX symbols are refused." },
  { id: "ibkr", name: "Interactive Brokers", kind: "live" as const, blurb: "Client Portal gateway probe only. Orders are not submitted by this build." },
  { id: "mt5", name: "MetaTrader 5", kind: "placeholder" as const, blurb: "Shown as not connected. A desktop bridge is required." },
];

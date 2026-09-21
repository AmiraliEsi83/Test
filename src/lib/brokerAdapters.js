export const ADAPTER_STATUS = {
  PAPER: "connected",
  UNCONFIGURED: "not-configured",
};

export const BrokerAdapterSpec = {
  methods: ["connect", "disconnect", "getAccount", "getPositions", "getOrders", "placeOrder", "cancelOrder", "closePosition"],
};

export class PaperBrokerAdapter {
  constructor(store) {
    this.store = store;
  }
  async connect() { return { ok: true, mode: "PAPER" }; }
  async disconnect() { return { ok: true }; }
  async getAccount() {
    return { currency: "USD", environment: "PAPER", lastSync: Date.now() };
  }
  async getPositions(positions) { return positions || []; }
  async getOrders(orders) { return orders || []; }
  async placeOrder(req) {
    if (!req || !req.side || !req.symbol) throw new Error("Invalid order request");
    return { id: `paper_${Date.now()}`, status: "filled", ...req };
  }
  async cancelOrder() { return { ok: true }; }
  async closePosition() { return { ok: true }; }
}

export const LIVE_BROKERS = [
  { type: "oanda", name: "OANDA", note: "REST + practice/live token. Keys stay server-side in production.", status: "adapter-ready" },
  { type: "alpaca", name: "Alpaca", note: "Paper + live keys. Equities & crypto.", status: "adapter-ready" },
  { type: "ibkr", name: "Interactive Brokers", note: "Requires local Client Portal Gateway.", status: "adapter-ready" },
  { type: "mt5", name: "MetaTrader 5", note: "Bridge placeholder — needs MT5 terminal bridge service.", status: "placeholder" },
  { type: "binance", name: "Binance Spot", note: "Market data live; order routing needs server keys.", status: "adapter-ready" },
  { type: "fxcm", name: "FXCM", note: "Forex Connect placeholder.", status: "placeholder" },
];

export function brokerDisplayStatus(broker) {
  if (!broker) return { label: "NOT CONNECTED", cls: "badge-sell" };
  if (broker.type === "paper" || broker.id === "paper") return { label: "PAPER", cls: "badge-teal" };
  if (broker.status === "connected") return { label: "CONNECTED · PAPER/SIM", cls: "badge-buy" };
  return { label: "NOT CONNECTED", cls: "badge-sell" };
}

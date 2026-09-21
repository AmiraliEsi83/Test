export const BROKER_CATALOG = [
  {
    type: "paper",
    name: "Harsi Paper Desk",
    blurb: "Instant fills, $100k virtual. Best for rehearsing Harsi.",
    fields: [],
    demo: true,
  },
  {
    type: "oanda",
    name: "OANDA",
    blurb: "FX and metals via REST. Practice or live token.",
    fields: [
      { key: "accountId", label: "Account ID", placeholder: "001-004-1234567-001" },
      { key: "apiKey", label: "API token", placeholder: "Bearer token", secret: true },
      {
        key: "env",
        label: "Environment",
        type: "select",
        options: ["practice", "live"],
      },
    ],
  },
  {
    type: "alpaca",
    name: "Alpaca",
    blurb: "US equities & crypto. Paper trading keys welcome.",
    fields: [
      { key: "keyId", label: "Key ID", placeholder: "PK..." },
      { key: "secret", label: "Secret key", secret: true },
      {
        key: "env",
        label: "Environment",
        type: "select",
        options: ["paper", "live"],
      },
    ],
  },
  {
    type: "ibkr",
    name: "Interactive Brokers",
    blurb: "Client Portal / Gateway. Connect after the local gateway is running.",
    fields: [
      { key: "accountId", label: "Account", placeholder: "U1234567" },
      { key: "host", label: "Gateway host", placeholder: "127.0.0.1" },
      { key: "port", label: "Port", placeholder: "5000" },
    ],
  },
  {
    type: "mt5",
    name: "MetaTrader 5",
    blurb: "Investor or trader login to your broker's MT5 server.",
    fields: [
      { key: "login", label: "Login", placeholder: "12345678" },
      { key: "password", label: "Password", secret: true },
      { key: "server", label: "Server", placeholder: "ICMarkets-Demo" },
    ],
  },
  {
    type: "binance",
    name: "Binance",
    blurb: "Spot keys. Orders route as marketable on connected pairs.",
    fields: [
      { key: "apiKey", label: "API key", secret: true },
      { key: "secret", label: "Secret", secret: true },
    ],
  },
  {
    type: "fxcm",
    name: "FXCM",
    blurb: "Forex Connect API for majors and metals.",
    fields: [
      { key: "username", label: "Username" },
      { key: "password", label: "Password", secret: true },
      { key: "sid", label: "Connection ID", placeholder: "Demo" },
    ],
  },
];

export function validateBrokerFields(type, values) {
  const spec = BROKER_CATALOG.find((b) => b.type === type);
  if (!spec) return "Unknown broker";
  for (const field of spec.fields) {
    if (!String(values[field.key] || "").trim()) {
      return `${field.label} is required`;
    }
  }
  return null;
}

export function maskSecret(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length < 6) return "••••";
  return `${s.slice(0, 3)}••••${s.slice(-2)}`;
}

export function startingBalance(type) {
  if (type === "paper") return 100000;
  if (type === "binance") return 25000;
  if (type === "alpaca") return 50000;
  return 20000;
}

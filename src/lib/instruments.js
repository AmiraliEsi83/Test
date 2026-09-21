export const INSTRUMENTS = {
  EURUSD: {
    id: "EURUSD",
    label: "EUR/USD",
    pip: 0.0001,
    digits: 5,
    base: 1.08462,
    vol: 0.00009,
    kind: "fx",
    tv: "FX:EURUSD",
    lotSize: 100000,
    sessionPair: true,
  },
  GBPUSD: {
    id: "GBPUSD",
    label: "GBP/USD",
    pip: 0.0001,
    digits: 5,
    base: 1.27148,
    vol: 0.00012,
    kind: "fx",
    tv: "FX:GBPUSD",
    lotSize: 100000,
    sessionPair: true,
  },
  USDJPY: {
    id: "USDJPY",
    label: "USD/JPY",
    pip: 0.01,
    digits: 3,
    base: 149.842,
    vol: 0.014,
    kind: "fx",
    tv: "FX:USDJPY",
    lotSize: 100000,
    sessionPair: true,
  },
  XAUUSD: {
    id: "XAUUSD",
    label: "XAU/USD",
    pip: 0.1,
    digits: 2,
    base: 2518.6,
    vol: 0.42,
    kind: "metal",
    tv: "OANDA:XAUUSD",
    lotSize: 100,
    sessionPair: true,
  },
  BTCUSDT: {
    id: "BTCUSDT",
    label: "BTC/USDT",
    pip: 1,
    digits: 2,
    base: 64120,
    vol: 48,
    kind: "crypto",
    tv: "BINANCE:BTCUSDT",
    lotSize: 1,
    live: true,
    binance: "btcusdt",
  },
  ETHUSDT: {
    id: "ETHUSDT",
    label: "ETH/USDT",
    pip: 0.1,
    digits: 2,
    base: 3428.4,
    vol: 2.8,
    kind: "crypto",
    tv: "BINANCE:ETHUSDT",
    lotSize: 1,
    live: true,
    binance: "ethusdt",
  },
  SPY: {
    id: "SPY",
    label: "SPY",
    pip: 0.01,
    digits: 2,
    base: 592.4,
    vol: 0.18,
    kind: "equity",
    tv: "AMEX:SPY",
    lotSize: 1,
    sessionPair: false,
  },
  QQQ: {
    id: "QQQ",
    label: "QQQ",
    pip: 0.01,
    digits: 2,
    base: 508.9,
    vol: 0.22,
    kind: "equity",
    tv: "NASDAQ:QQQ",
    lotSize: 1,
    sessionPair: false,
  },
};

export const INSTRUMENT_LIST = Object.values(INSTRUMENTS);

export function formatPrice(symbol, price) {
  const inst = INSTRUMENTS[symbol];
  if (!inst || price == null || Number.isNaN(price)) return "—";
  return Number(price).toFixed(inst.digits);
}

export function toPips(symbol, delta) {
  const inst = INSTRUMENTS[symbol];
  if (!inst) return 0;
  return delta / inst.pip;
}

export function fromPips(symbol, pips) {
  const inst = INSTRUMENTS[symbol];
  if (!inst) return 0;
  return pips * inst.pip;
}

export function pnlUsd(symbol, side, entry, current, lots) {
  const inst = INSTRUMENTS[symbol];
  if (!inst) return 0;
  const dir = side === "buy" ? 1 : -1;
  const move = (current - entry) * dir;
  if (inst.kind === "crypto") return move * lots;
  if (inst.kind === "metal") return (move / inst.pip) * lots * 1;
  if (inst.kind === "equity") return move * lots * 100;
  return (move / inst.pip) * lots * 10;
}

export function spreadCostUsd(symbol, lots) {
  const inst = INSTRUMENTS[symbol];
  if (!inst) return 0;
  const spreadPips = inst.kind === "crypto" ? 0.5 : inst.kind === "equity" ? 0.3 : 1.2;
  if (inst.kind === "crypto") return spreadPips * lots;
  if (inst.kind === "metal") return spreadPips * lots * 1;
  if (inst.kind === "equity") return 0.5 * lots;
  return spreadPips * lots * 10 * 0.1;
}

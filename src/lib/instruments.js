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
  return (move / inst.pip) * lots * 10;
}

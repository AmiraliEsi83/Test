import { INSTRUMENTS } from "./instruments";
import { getSessionState } from "./sessions";

function mulberry32(a) {
  return function rng() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSymbol(symbol) {
  return symbol.split("").reduce((s, c) => s + c.charCodeAt(0) * 13, 42);
}

export function generateHistory(symbol, bars = 420, now = Date.now()) {
  const inst = INSTRUMENTS[symbol];
  const rng = mulberry32(hashSymbol(symbol) + Math.floor(now / 86400000));
  const step = 60 * 1000;
  let price = inst.base * (0.997 + rng() * 0.006);
  const candles = [];
  let asian = { high: -Infinity, low: Infinity, set: false };

  for (let i = bars; i >= 1; i -= 1) {
    const time = Math.floor((now - i * step) / 1000);
    const date = new Date(time * 1000);
    const session = getSessionState(date, false);
    const shock = (rng() - 0.5) * inst.vol * session.volatility * 2.2;
    const drift = (inst.base - price) * 0.002;
    const open = price;
    price = Math.max(inst.pip, price + shock + drift);
    const high = Math.max(open, price) + rng() * inst.vol * 0.6;
    const low = Math.min(open, price) - rng() * inst.vol * 0.6;
    const close = price;
    const volume = Math.round(80 + rng() * 420 * session.volatility);
    candles.push({ time, open, high, low, close, volume });

    if (session.key === "asia" || session.key === "london-prep") {
      asian.high = Math.max(asian.high, high);
      asian.low = Math.min(asian.low, low);
      asian.set = true;
    }
  }

  if (!asian.set || !Number.isFinite(asian.high)) {
    const slice = candles.slice(-120);
    asian = {
      high: Math.max(...slice.map((c) => c.high)),
      low: Math.min(...slice.map((c) => c.low)),
      set: true,
    };
  }

  const last = candles[candles.length - 1];
  const mid = (asian.high + asian.low) / 2;
  const target = mid - 22 * inst.pip;
  last.close = last.close * 0.35 + target * 0.65;
  last.low = Math.min(last.low, last.close);
  last.high = Math.max(last.high, last.close);
  last.open = candles[candles.length - 2]?.close || last.close;

  return {
    candles,
    asian,
    lastPrice: last.close,
    lastTime: last.time,
  };
}

export function nextTick(symbol, lastPrice, asian, forceLondonWindow) {
  const inst = INSTRUMENTS[symbol];
  const session = getSessionState(new Date(), forceLondonWindow);
  const noise = (Math.random() - 0.5) * inst.vol * session.volatility * 1.6;
  let mean = 0;
  if (asian && forceLondonWindow) {
    const mid = (asian.high + asian.low) / 2;
    const dist = lastPrice - mid;
    const buyBand = mid - 22 * inst.pip;
    const sellBand = mid + 22 * inst.pip;
    if (Math.abs(dist) < 12 * inst.pip) {
      mean = (Math.random() > 0.5 ? buyBand : sellBand) - lastPrice;
      mean *= 0.08;
    } else {
      mean = (mid - lastPrice) * 0.01;
    }
  } else if (asian) {
    const mid = (asian.high + asian.low) / 2;
    mean = (mid - lastPrice) * 0.008;
  }
  const price = Math.max(inst.pip, lastPrice + noise + mean);
  return { price, session };
}

export function upsertCandle(candles, price, tsSec, volume = 12) {
  const last = candles[candles.length - 1];
  const bucket = Math.floor(tsSec / 60) * 60;
  if (last && last.time === bucket) {
    const updated = {
      ...last,
      high: Math.max(last.high, price),
      low: Math.min(last.low, price),
      close: price,
      volume: last.volume + volume,
    };
    return [...candles.slice(0, -1), updated];
  }
  return [
    ...candles,
    {
      time: bucket,
      open: last ? last.close : price,
      high: price,
      low: price,
      close: price,
      volume,
    },
  ].slice(-500);
}

export function connectBinance(symbol, onTrade) {
  const inst = INSTRUMENTS[symbol];
  if (!inst?.live || !inst.binance) return () => {};
  let ws;
  let closed = false;
  const open = () => {
    if (closed) return;
    ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${inst.binance}@trade`
    );
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const price = Number(msg.p);
        const qty = Number(msg.q);
        if (price) onTrade({ price, volume: qty, ts: msg.T || Date.now() });
      } catch (e) {
        /* ignore malformed ticks */
      }
    };
    ws.onclose = () => {
      if (!closed) setTimeout(open, 2500);
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch (e) {
        /* already closing */
      }
    };
  };
  open();
  return () => {
    closed = true;
    try {
      ws?.close();
    } catch (e) {
      /* ignore */
    }
  };
}

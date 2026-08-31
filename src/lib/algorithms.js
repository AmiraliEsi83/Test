import { INSTRUMENTS, toPips } from "./instruments";

export function ema(values, period) {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export function rsi(values, period = 14) {
  if (values.length < period + 1) return values.map(() => 50);
  const out = new Array(values.length).fill(50);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i += 1) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macd(values, fast = 12, slow = 26, signal = 9) {
  const eFast = ema(values, fast);
  const eSlow = ema(values, slow);
  const line = values.map((_, i) => eFast[i] - eSlow[i]);
  const sig = ema(line, signal);
  const hist = line.map((v, i) => v - sig[i]);
  return { line, signal: sig, hist };
}

export function atr(candles, period = 14) {
  if (!candles.length) return [];
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  const out = [];
  let acc = 0;
  for (let i = 0; i < trs.length; i += 1) {
    if (i < period) {
      acc += trs[i];
      out.push(acc / (i + 1));
    } else if (i === period) {
      acc += trs[i];
      out.push(acc / (period + 1));
    } else {
      out.push((out[i - 1] * (period - 1) + trs[i]) / period);
    }
  }
  return out;
}

export function computeHarsi(symbol, price, asian) {
  if (!asian || asian.high == null || asian.low == null) {
    return { value: 0, zone: "flat", mid: price, rangePips: 0 };
  }
  const mid = (asian.high + asian.low) / 2;
  const value = toPips(symbol, price - mid);
  let zone = "flat";
  if (value <= -15 && value >= -30) zone = "buy";
  else if (value >= 15 && value <= 30) zone = "sell";
  else if (value < -30) zone = "extended-buy";
  else if (value > 30) zone = "extended-sell";
  return {
    value,
    zone,
    mid,
    asianHigh: asian.high,
    asianLow: asian.low,
    rangePips: toPips(symbol, asian.high - asian.low),
  };
}

export function evaluateLondonHarsi({
  symbol,
  price,
  asian,
  inWindow,
  fired,
}) {
  const harsi = computeHarsi(symbol, price, asian);
  if (!inWindow) {
    return { harsi, signal: null };
  }
  if (harsi.zone === "buy" && !fired.buy) {
    return {
      harsi,
      signal: {
        algorithm: "london-harsi",
        side: "buy",
        reason:
          "First Harsi print inside −15 to −30 during the London T-15 window. Mean-reversion long into the London open.",
        slPips: 22,
        tpPips: 34,
      },
    };
  }
  if (harsi.zone === "sell" && !fired.sell) {
    return {
      harsi,
      signal: {
        algorithm: "london-harsi",
        side: "sell",
        reason:
          "First Harsi print inside +15 to +30 during the London T-15 window. Mean-reversion short into the London open.",
        slPips: 22,
        tpPips: 34,
      },
    };
  }
  return { harsi, signal: null };
}

export function evaluatePulseConfluence({ candles, symbol }) {
  if (!candles || candles.length < 40) {
    return { score: 50, side: null, signal: null, reasons: [], rsi: 50, macdHist: 0 };
  }
  const closes = candles.map((c) => c.close);
  const e9 = ema(closes, 9);
  const e21 = ema(closes, 21);
  const r = rsi(closes, 14);
  const m = macd(closes);
  const a = atr(candles, 14);
  const i = closes.length - 1;
  const price = closes[i];
  const inst = INSTRUMENTS[symbol];
  const atrNow = a[i];
  const atrAvg = a.slice(-40).reduce((s, v) => s + v, 0) / Math.min(40, a.length);
  const volExpand = atrAvg ? atrNow / atrAvg : 1;
  const trend = e9[i] - e21[i];
  const trendPips = toPips(symbol, trend);
  const rsiNow = r[i];
  const macdNow = m.hist[i];
  const macdPrev = m.hist[i - 1] || 0;

  let long = 50;
  let short = 50;
  const reasons = [];

  if (e9[i] > e21[i]) {
    long += 16;
    short -= 10;
    reasons.push("EMA 9 holding above EMA 21 — bullish structure");
  } else {
    short += 16;
    long -= 10;
    reasons.push("EMA 9 below EMA 21 — bearish structure");
  }

  if (rsiNow <= 32) {
    long += 18;
    reasons.push(`RSI ${rsiNow.toFixed(1)} oversold — bounce candidate`);
  } else if (rsiNow >= 68) {
    short += 18;
    reasons.push(`RSI ${rsiNow.toFixed(1)} overbought — fade candidate`);
  } else if (rsiNow > 50 && e9[i] > e21[i]) {
    long += 8;
    reasons.push("RSI holding bullish mid-range with trend");
  } else if (rsiNow < 50 && e9[i] < e21[i]) {
    short += 8;
    reasons.push("RSI holding bearish mid-range with trend");
  }

  if (macdNow > 0 && macdNow > macdPrev) {
    long += 14;
    reasons.push("MACD histogram expanding positive");
  } else if (macdNow < 0 && macdNow < macdPrev) {
    short += 14;
    reasons.push("MACD histogram expanding negative");
  }

  if (volExpand > 1.15) {
    if (long > short) long += 10;
    else short += 10;
    reasons.push("ATR expanding — session energy confirmed");
  } else if (volExpand < 0.75) {
    long -= 8;
    short -= 8;
    reasons.push("ATR compressed — stand aside unless Harsi fires");
  }

  const slope = closes[i] - closes[Math.max(0, i - 8)];
  if (toPips(symbol, slope) > 8) long += 6;
  if (toPips(symbol, slope) < -8) short += 6;

  long = clamp(long, 0, 100);
  short = clamp(short, 0, 100);
  const score = Math.round(50 + (long - short) / 2);

  let signal = null;
  if (long >= 74 && long - short >= 18) {
    signal = {
      algorithm: "pulse-confluence",
      side: "buy",
      reason: reasons.slice(0, 3).join(" · "),
      slPips: Math.max(12, Math.round(toPips(symbol, atrNow) * 1.4)),
      tpPips: Math.max(18, Math.round(toPips(symbol, atrNow) * 2.1)),
    };
  } else if (short >= 74 && short - long >= 18) {
    signal = {
      algorithm: "pulse-confluence",
      side: "sell",
      reason: reasons.slice(0, 3).join(" · "),
      slPips: Math.max(12, Math.round(toPips(symbol, atrNow) * 1.4)),
      tpPips: Math.max(18, Math.round(toPips(symbol, atrNow) * 2.1)),
    };
  }

  return {
    score,
    long: Math.round(long),
    short: Math.round(short),
    side: signal ? signal.side : null,
    signal,
    reasons,
    rsi: rsiNow,
    macdHist: macdNow,
    ema9: e9[i],
    ema21: e21[i],
    atr: atrNow,
    price,
    pip: inst?.pip,
    trendPips,
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export const ALGORITHM_META = {
  "london-harsi": {
    id: "london-harsi",
    name: "London Harsi",
    badge: "Primary",
    summary:
      "Fifteen minutes before London cash opens, the first Harsi print between −15 and −30 triggers a buy. The first print between +15 and +30 triggers a sell.",
    rules: [
      "Asian session range is measured from 00:00–07:45 London.",
      "Harsi = distance of last price from the Asian midpoint, in pips.",
      "Window opens at 07:45 London (T-15) and arms until the first qualifying print.",
      "First Harsi in [−30, −15] → BUY alert and suggested long.",
      "First Harsi in [+15, +30] → SELL alert and suggested short.",
      "Only the first print of each zone fires per London day.",
      "Suggested stop 22 pips, target 34 pips, flatten into NY if still open.",
    ],
  },
  "pulse-confluence": {
    id: "pulse-confluence",
    name: "Pulse Confluence",
    badge: "Desk rec.",
    summary:
      "A professional momentum stack used on institutional desks: EMA 9/21 structure, RSI location, MACD expansion, and ATR energy. Fires only when factors agree.",
    rules: [
      "Trend: EMA 9 vs EMA 21 defines directional bias.",
      "Location: RSI extremes or with-trend mid-range continuation.",
      "Impulse: MACD histogram must expand in the trade direction.",
      "Energy: ATR must be expanding so you are not fading a dead tape.",
      "Score ≥ 74 with an 18-point edge vs the other side → recommendation.",
      "Stops and targets scale with ATR, typically 1.4× / 2.1×.",
    ],
  },
};

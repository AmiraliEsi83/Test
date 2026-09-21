import { ema, atr } from "./algorithms";
import { INSTRUMENTS, toPips } from "./instruments";

export const STRATEGY_DEFAULTS = {
  "london-harsi": {
    id: "london-harsi",
    name: "London HARSI",
    enabled: true,
    symbols: ["EURUSD", "GBPUSD", "XAUUSD"],
    timeframe: "1m",
    session: "london-prep",
    buyMin: -30,
    buyMax: -15,
    sellMin: 15,
    sellMax: 30,
    cooldownMin: 0,
    maxSignalsPerDay: 2,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    slPips: 22,
    tpPips: 34,
  },
  "pulse-confluence": {
    id: "pulse-confluence",
    name: "Pulse Confluence",
    enabled: true,
    symbols: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSDT", "ETHUSDT"],
    timeframe: "5m",
    session: "any",
    minScore: 74,
    minEdge: 18,
    cooldownMin: 8,
    maxSignalsPerDay: 12,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  "breakout-trend": {
    id: "breakout-trend",
    name: "Breakout + Trend",
    enabled: true,
    symbols: ["EURUSD", "GBPUSD", "XAUUSD", "SPY", "QQQ"],
    timeframe: "15m",
    session: "any",
    lookback: 40,
    atrMultSl: 1.6,
    atrMultTp: 2.6,
    cooldownMin: 30,
    maxSignalsPerDay: 6,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
};

export const STRATEGY_META = {
  "london-harsi": {
    badge: "Primary",
    tier: ["trader", "pro"],
    summary:
      "Mean-reversion into the London open. Measures distance from the Asian midpoint (HARSI, in pips) and fires once per zone inside the T-15 window.",
    detail:
      "Asian range 00:00–07:45 London builds the midpoint. The first print in [-30,-15] proposes BUY; first in [+15,+30] proposes SELL. Suggested stop/target ship with every signal. Research signal — not a guarantee.",
  },
  "pulse-confluence": {
    badge: "Desk rec.",
    tier: ["trader", "pro"],
    summary:
      "Momentum stack: EMA 9/21 structure + RSI location + MACD expansion + ATR energy. Fires only when factors agree.",
    detail:
      "Every Pulse signal lists each check (pass/fail) with values — no black-box confidence. Stops/targets scale with ATR (1.4x / 2.1x).",
  },
  "breakout-trend": {
    badge: "New",
    tier: ["pro"],
    summary:
      "Session-range breakout with higher-timeframe trend filter, ATR expansion and volume confirmation where available.",
    detail:
      "Uses prior N-bar high/low as the trigger level, EMA 50 as trend filter, ATR expansion > 1.1x and volume > 1.2x average. Research/demo strategy — backtest before trusting it.",
  },
};

export function evaluateBreakout({ candles, symbol, config }) {
  const cfg = { ...STRATEGY_DEFAULTS["breakout-trend"], ...(config || {}) };
  if (!candles || candles.length < cfg.lookback + 20) {
    return { signal: null, checks: [], rangeHigh: null, rangeLow: null };
  }
  const closes = candles.map((c) => c.close);
  const e50 = ema(closes, 50);
  const a = atr(candles, 14);
  const i = closes.length - 1;
  const price = closes[i];
  const window = candles.slice(i - cfg.lookback, i);
  const rangeHigh = Math.max(...window.map((c) => c.high));
  const rangeLow = Math.min(...window.map((c) => c.low));
  const atrNow = a[i];
  const atrAvg = a.slice(-40).reduce((s, v) => s + v, 0) / Math.min(40, a.length);
  const atrRatio = atrAvg ? atrNow / atrAvg : 1;
  const vols = candles.slice(-40).map((c) => c.volume || 0);
  const volAvg = vols.reduce((s, v) => s + v, 0) / Math.max(1, vols.length);
  const volNow = candles[i].volume || 0;
  const volRatio = volAvg ? volNow / volAvg : 1;
  const trendUp = price > e50[i];
  const trendDown = price < e50[i];

  const checks = [];
  const brokeHigh = price > rangeHigh;
  const brokeLow = price < rangeLow;
  checks.push({ label: `Breaks ${cfg.lookback}-bar range`, pass: brokeHigh || brokeLow, value: brokeHigh ? `> ${rangeHigh.toFixed(5)}` : brokeLow ? `< ${rangeLow.toFixed(5)}` : "inside range" });
  checks.push({ label: "Trend filter (EMA 50)", pass: (brokeHigh && trendUp) || (brokeLow && trendDown), value: trendUp ? "price > EMA50" : "price < EMA50" });
  checks.push({ label: "ATR expansion > 1.10x", pass: atrRatio > 1.1, value: `${atrRatio.toFixed(2)}x` });
  checks.push({ label: "Volume confirmation > 1.20x", pass: volRatio > 1.2 || volAvg === 0, value: `${volRatio.toFixed(2)}x` });

  let signal = null;
  if (brokeHigh && trendUp && atrRatio > 1.1 && (volRatio > 1.2 || volAvg === 0)) {
    const slP = Math.max(10, Math.round(toPips(symbol, atrNow) * cfg.atrMultSl));
    signal = { algorithm: "breakout-trend", side: "buy", slPips: slP, tpPips: Math.round(slP * (cfg.atrMultTp / cfg.atrMultSl)), reason: `Breakout above ${cfg.lookback}-bar high with trend + ATR expansion.` };
  } else if (brokeLow && trendDown && atrRatio > 1.1 && (volRatio > 1.2 || volAvg === 0)) {
    const slP = Math.max(10, Math.round(toPips(symbol, atrNow) * cfg.atrMultSl));
    signal = { algorithm: "breakout-trend", side: "sell", slPips: slP, tpPips: Math.round(slP * (cfg.atrMultTp / cfg.atrMultSl)), reason: `Breakdown below ${cfg.lookback}-bar low with trend + ATR expansion.` };
  }
  return { signal, checks, rangeHigh, rangeLow, atrRatio, volRatio, ema50: e50[i], price, pip: INSTRUMENTS[symbol]?.pip };
}

export function describePulseChecks(pulse) {
  if (!pulse || !pulse.checks) return [];
  return pulse.checks;
}

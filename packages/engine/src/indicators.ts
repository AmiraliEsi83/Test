export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export function rsi(values: number[], period = 14): number[] {
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

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const eFast = ema(values, fast);
  const eSlow = ema(values, slow);
  const line = values.map((_, i) => eFast[i] - eSlow[i]);
  const sig = ema(line, signal);
  const hist = line.map((v, i) => v - sig[i]);
  return { line, signal: sig, hist };
}

export function atr(candles: Candle[], period = 14): number[] {
  if (!candles.length) return [];
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  const out: number[] = [];
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

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < values.length; i += 1) {
    acc += values[i];
    if (i >= period) acc -= values[i - period];
    out.push(i + 1 >= period ? acc / period : acc / (i + 1));
  }
  return out;
}

export function resample(candles: Candle[], bucketSec: number): Candle[] {
  if (!candles.length) return [];
  const out: Candle[] = [];
  for (const c of candles) {
    const bucket = Math.floor(c.time / bucketSec) * bucketSec;
    const last = out[out.length - 1];
    if (last && last.time === bucket) {
      last.high = Math.max(last.high, c.high);
      last.low = Math.min(last.low, c.low);
      last.close = c.close;
      last.volume += c.volume;
    } else {
      out.push({ ...c, time: bucket });
    }
  }
  return out;
}

export function supportResistance(candles: Candle[], lookback = 80) {
  const slice = candles.slice(-lookback);
  if (!slice.length) return { support: 0, resistance: 0 };
  return {
    support: Math.min(...slice.map((c) => c.low)),
    resistance: Math.max(...slice.map((c) => c.high)),
  };
}

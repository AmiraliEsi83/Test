import { Candle } from '@harsi/shared';
import { toPips } from '@harsi/shared';

export function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export function rsi(values: number[], period: number = 14): number[] {
  if (values.length < period + 1) return values.map(() => 50);
  const out: number[] = new Array(values.length).fill(50);
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

export function macd(
  values: number[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9
): { line: number[]; signal: number[]; hist: number[] } {
  const eFast = ema(values, fast);
  const eSlow = ema(values, slow);
  const line = values.map((_, i) => eFast[i] - eSlow[i]);
  const signal = ema(line, signalPeriod);
  const hist = line.map((v, i) => v - signal[i]);
  return { line, signal, hist };
}

export function atr(candles: Candle[], period: number = 14): number[] {
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

export function bollingerBands(
  values: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      middle.push(values[i]);
      upper.push(values[i]);
      lower.push(values[i]);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    middle.push(mean);
    upper.push(mean + stdDevMultiplier * stdDev);
    lower.push(mean - stdDevMultiplier * stdDev);
  }

  return { upper, middle, lower };
}

export interface HarsiResult {
  value: number; // In pips from Asian mid
  zone: 'buy' | 'sell' | 'extended-buy' | 'extended-sell' | 'flat';
  mid: number;
  asianHigh: number;
  asianLow: number;
  rangePips: number;
}

export function computeHarsi(
  symbol: string,
  price: number,
  asianRange?: { high: number; low: number }
): HarsiResult {
  if (!asianRange || asianRange.high == null || asianRange.low == null) {
    return { value: 0, zone: 'flat', mid: price, asianHigh: price, asianLow: price, rangePips: 0 };
  }
  const mid = (asianRange.high + asianRange.low) / 2;
  const value = toPips(symbol, price - mid);
  let zone: HarsiResult['zone'] = 'flat';

  // London HARSI logic:
  // -15 to -30 pips: buy zone
  // +15 to +30 pips: sell zone
  // Beyond: extended
  if (value <= -15 && value >= -30) zone = 'buy';
  else if (value >= 15 && value <= 30) zone = 'sell';
  else if (value < -30) zone = 'extended-buy';
  else if (value > 30) zone = 'extended-sell';

  return {
    value,
    zone,
    mid,
    asianHigh: asianRange.high,
    asianLow: asianRange.low,
    rangePips: toPips(symbol, asianRange.high - asianRange.low),
  };
}

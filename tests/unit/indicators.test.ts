import {
  ema,
  rsi,
  macd,
  atr,
  computeHarsi,
  getSessionState,
  extractAsianRange,
  MockMarketFeed,
} from '@harsi/market-data';
import { Candle } from '@harsi/shared';

describe('Market Data & Indicators', () => {
  const dummyPrices = [
    10, 11, 12, 11, 10, 12, 13, 14, 15, 14, 13, 15, 16, 17, 18, 19, 20, 19, 18, 20,
  ];

  test('EMA calculation produces valid exponential moving averages', () => {
    const period = 5;
    const emaValues = ema(dummyPrices, period);
    expect(emaValues.length).toBe(dummyPrices.length);
    expect(emaValues[0]).toBe(dummyPrices[0]);
    expect(emaValues[period - 1]).toBeGreaterThan(0);
    expect(emaValues[emaValues.length - 1]).toBeGreaterThan(15);
  });

  test('RSI calculation responds correctly to trends', () => {
    const period = 14;
    const rsiValues = rsi(dummyPrices, period);
    expect(rsiValues.length).toBe(dummyPrices.length);
    // After strong upward moves, RSI should be above 50
    const lastRsi = rsiValues[rsiValues.length - 1];
    expect(lastRsi).not.toBeNull();
    expect(lastRsi!).toBeGreaterThan(50);
  });

  test('MACD calculation generates valid line, signal, and histogram', () => {
    const longSeries = Array.from({ length: 40 }, (_, i) => 100 + i * 0.5 + Math.sin(i) * 2);
    const macdResult = macd(longSeries, 12, 26, 9);

    expect(macdResult.line.length).toBe(longSeries.length);
    expect(macdResult.signal.length).toBe(longSeries.length);
    expect(macdResult.hist.length).toBe(longSeries.length);

    const lastHist = macdResult.hist[longSeries.length - 1];
    expect(typeof lastHist).toBe('number');
  });

  test('ATR calculation measures true range volatility', () => {
    const sampleCandles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
      time: Math.floor(Date.now() / 1000) + i * 60,
      open: 1.1 + i * 0.001,
      high: 1.1 + i * 0.001 + 0.002,
      low: 1.1 + i * 0.001 - 0.001,
      close: 1.1 + i * 0.001 + 0.001,
      volume: 100,
    }));

    const atrValues = atr(sampleCandles, 14);
    expect(atrValues.length).toBe(sampleCandles.length);
    const lastAtr = atrValues[atrValues.length - 1];
    expect(lastAtr).not.toBeNull();
    expect(lastAtr!).toBeGreaterThan(0);
  });

  test('computeHarsi calculates deviations from Asian session midpoint', () => {
    const currentPrice = 1.0820;
    const asianRange = { high: 1.0850, low: 1.0800 };
    const harsi = computeHarsi('EURUSD', currentPrice, asianRange);

    // Mid is 1.0825. Price is 1.0820 -> -5 pips
    expect(harsi.mid).toBe(1.0825);
    expect(harsi.rangePips).toBe(50);
  });

  test('MockMarketFeed initializes candles and streams ticks', () => {
    const feed = new MockMarketFeed();
    const eurusdCandles = feed.getCandles('EURUSD');
    expect(eurusdCandles.length).toBeGreaterThan(50);

    const tick = feed.getLatestTick('EURUSD');
    expect(tick.symbol).toBe('EURUSD');
    expect(tick.bid).toBeGreaterThan(0);
    expect(tick.ask).toBeGreaterThan(tick.bid);
    expect(tick.price).toBeGreaterThan(0);
  });
});

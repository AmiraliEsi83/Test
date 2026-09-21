import { Candle, Tick, getInstrument } from '@harsi/shared';

export class MockMarketFeed {
  private cache: Map<string, Candle[]> = new Map();
  private lastTicks: Map<string, Tick> = new Map();

  constructor() {
    this.seedAll();
  }

  private seedAll() {
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'ETHUSD', 'SPY', 'QQQ'];
    for (const s of symbols) {
      this.generateHistory(s, 180);
    }
  }

  public generateHistory(symbol: string, count: number = 150): Candle[] {
    const inst = getInstrument(symbol);
    const nowSec = Math.floor(Date.now() / 1000 / 60) * 60;
    const intervalSec = 60; // 1-minute bars
    let price = inst.basePrice;
    const candles: Candle[] = [];

    // Volatility scaled by asset kind
    const volScale =
      inst.kind === 'crypto'
        ? 0.002
        : inst.kind === 'metal'
        ? 0.0012
        : inst.kind === 'indices'
        ? 0.0008
        : 0.0004;

    for (let i = count; i >= 0; i--) {
      const time = nowSec - i * intervalSec;
      const change = (Math.random() - 0.495) * price * volScale;
      const open = price;
      const close = Math.max(open * 0.5, open + change);
      const highWick = Math.random() * price * volScale * 0.7;
      const lowWick = Math.random() * price * volScale * 0.7;
      const high = Math.max(open, close) + highWick;
      const low = Math.min(open, close) - lowWick;
      const volume = Math.floor(50 + Math.random() * 450);

      price = close;
      candles.push({
        time,
        open: Number(open.toFixed(inst.digits)),
        high: Number(high.toFixed(inst.digits)),
        low: Number(low.toFixed(inst.digits)),
        close: Number(close.toFixed(inst.digits)),
        volume,
      });
    }

    this.cache.set(symbol, candles);

    const latest = candles[candles.length - 1];
    const halfSpread = inst.spread / 2;
    this.lastTicks.set(symbol, {
      symbol,
      price: latest.close,
      bid: latest.close - halfSpread,
      ask: latest.close + halfSpread,
      timestamp: Date.now(),
      volume: latest.volume,
    });

    return candles;
  }

  public getCandles(symbol: string): Candle[] {
    if (!this.cache.has(symbol)) {
      return this.generateHistory(symbol);
    }
    return this.cache.get(symbol)!;
  }

  public getLatestTick(symbol: string): Tick {
    if (!this.lastTicks.has(symbol)) {
      this.generateHistory(symbol);
    }
    return this.lastTicks.get(symbol)!;
  }

  public nextTick(symbol: string, volatilityBoost: number = 1.0): { tick: Tick; candle: Candle } {
    const inst = getInstrument(symbol);
    const candles = this.getCandles(symbol);
    const lastCandle = candles[candles.length - 1];
    const prevPrice = lastCandle.close;

    const baseNoise =
      inst.kind === 'crypto'
        ? 0.0006
        : inst.kind === 'metal'
        ? 0.0004
        : inst.kind === 'indices'
        ? 0.0003
        : 0.00015;

    const step = (Math.random() - 0.498) * prevPrice * baseNoise * volatilityBoost;
    const newPrice = Number(Math.max(inst.basePrice * 0.5, prevPrice + step).toFixed(inst.digits));

    const halfSpread = inst.spread / 2;
    const tick: Tick = {
      symbol,
      price: newPrice,
      bid: Number((newPrice - halfSpread).toFixed(inst.digits)),
      ask: Number((newPrice + halfSpread).toFixed(inst.digits)),
      timestamp: Date.now(),
      volume: Math.floor(1 + Math.random() * 15),
    };
    this.lastTicks.set(symbol, tick);

    // Update candle
    const nowSec = Math.floor(Date.now() / 1000 / 60) * 60;
    if (lastCandle.time === nowSec) {
      lastCandle.close = newPrice;
      if (newPrice > lastCandle.high) lastCandle.high = newPrice;
      if (newPrice < lastCandle.low) lastCandle.low = newPrice;
      lastCandle.volume += tick.volume;
      return { tick, candle: lastCandle };
    } else {
      // New bar
      const newCandle: Candle = {
        time: nowSec,
        open: newPrice,
        high: newPrice,
        low: newPrice,
        close: newPrice,
        volume: tick.volume,
      };
      candles.push(newCandle);
      if (candles.length > 300) candles.shift();
      return { tick, candle: newCandle };
    }
  }
}

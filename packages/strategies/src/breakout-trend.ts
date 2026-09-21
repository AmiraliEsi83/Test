import { StrategyPlugin, StrategyConfig, StrategyContext, StrategyEvaluation } from './types.js';
import { Signal, SignalCondition, formatPrice } from '@harsi/shared';
import { ema, atr } from '@harsi/market-data';

export const BreakoutTrendStrategy: StrategyPlugin = {
  id: 'breakout-trend',
  name: 'Breakout + Trend Confirmation',
  badge: 'Breakout Engine',
  summary:
    'Institutional breakout strategy designed to capture directional momentum following session range compression. Combines 50-period trend filter, prior session High/Low breakout, ATR expansion, and volume confirmation.',
  rules: [
    'Trend Filter: 50-period EMA slope and price location confirm directional bias.',
    'Range Barrier: Measures 20-period swing high and swing low.',
    'Breakout Condition: Price closes cleanly through the key high/low level.',
    'Energy Confirmation: ATR expanding above 1.15× 20-period baseline.',
    'Volume Spike: Bar volume exceeds 1.25× 20-bar rolling average volume.',
    'Conservative R:R: Stop loss tucked behind breakout bar swing, Take profit at 2.0× ATR.',
  ],
  defaultConfig: {
    id: 'breakout-trend',
    enabled: true,
    symbols: ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD', 'ETHUSD', 'SPY', 'QQQ'],
    timeframe: '15m',
    maxSignalsPerDay: 3,
    cooldownMinutes: 60,
    allowedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    parameters: {
      trendEmaPeriod: 50,
      lookbackBars: 20,
      atrMultiplierSl: 1.5,
      atrMultiplierTp: 2.2,
      minVolumeMultiplier: 1.2,
      minAtrExpansion: 1.1,
    },
  },

  evaluate(ctx: StrategyContext, config: StrategyConfig): StrategyEvaluation {
    const params = { ...this.defaultConfig.parameters, ...config.parameters };
    const candles = ctx.candles;

    if (!candles || candles.length < params.trendEmaPeriod + 5) {
      return {
        strategyId: this.id,
        strategyName: this.name,
        symbol: ctx.symbol,
        signal: null,
        score: 50,
        conditions: [
          {
            name: 'Data Readiness',
            passed: false,
            detail: `Need at least ${params.trendEmaPeriod + 5} candles for trend calculations`,
          },
        ],
      };
    }

    const closes = candles.map((c) => c.close);
    const trendEma = ema(closes, params.trendEmaPeriod);
    const atrValues = atr(candles, 14);
    const idx = closes.length - 1;
    const currentPrice = ctx.currentPrice;
    const currentEma50 = trendEma[idx];
    const prevEma50 = trendEma[idx - 5] || currentEma50;
    const emaSlope = currentEma50 - prevEma50;

    // Lookback swing highs and lows (excluding current bar)
    const lookbackSlice = candles.slice(idx - params.lookbackBars, idx);
    const swingHigh = Math.max(...lookbackSlice.map((c) => c.high));
    const swingLow = Math.min(...lookbackSlice.map((c) => c.low));

    // Volume analysis
    const currentVolume = candles[idx].volume || 100;
    const avgVolume =
      lookbackSlice.reduce((s, c) => s + (c.volume || 100), 0) / lookbackSlice.length || 100;
    const volumeRatio = currentVolume / avgVolume;

    // ATR expansion
    const currentAtr = atrValues[idx] || (candles[idx].high - candles[idx].low);
    const avgAtrSlice = atrValues.slice(-20);
    const baselineAtr = avgAtrSlice.length
      ? avgAtrSlice.reduce((a, b) => a + b, 0) / avgAtrSlice.length
      : currentAtr;
    const atrExpansion = baselineAtr > 0 ? currentAtr / baselineAtr : 1.0;

    const isBullishTrend = currentPrice > currentEma50 && emaSlope >= 0;
    const isBearishTrend = currentPrice < currentEma50 && emaSlope <= 0;
    const isBullishBreakout = currentPrice > swingHigh;
    const isBearishBreakout = currentPrice < swingLow;
    const isVolumeConfirmed = volumeRatio >= params.minVolumeMultiplier;
    const isAtrConfirmed = atrExpansion >= params.minAtrExpansion;

    const cooldownPassed =
      !ctx.lastFiredTimestamp || Date.now() - ctx.lastFiredTimestamp > config.cooldownMinutes * 60 * 1000;

    const conditions: SignalCondition[] = [];
    let signal: Signal | null = null;
    let score = 50;

    if (isBullishBreakout || isBullishTrend) {
      conditions.push({
        name: `Higher-Timeframe Trend (EMA 50)`,
        passed: isBullishTrend,
        detail: `Price (${formatPrice(ctx.symbol, currentPrice)}) above EMA 50 (${formatPrice(ctx.symbol, currentEma50)}) with upward slope`,
      });
      conditions.push({
        name: `Range High Breakout (${params.lookbackBars}-bar High)`,
        passed: isBullishBreakout,
        detail: isBullishBreakout
          ? `Broke cleanly above ${params.lookbackBars}-bar resistance (${formatPrice(ctx.symbol, swingHigh)})`
          : `Below resistance barrier (${formatPrice(ctx.symbol, swingHigh)})`,
      });
      conditions.push({
        name: `ATR Volatility Expansion`,
        passed: isAtrConfirmed,
        detail: `ATR expansion: ${atrExpansion.toFixed(2)}x (Threshold: ${params.minAtrExpansion}x)`,
      });
      conditions.push({
        name: `Volume Surge Confirmation`,
        passed: isVolumeConfirmed,
        detail: `Volume: ${currentVolume} (${volumeRatio.toFixed(2)}x 20-bar average)`,
      });

      const passedCount = conditions.filter((c) => c.passed).length;
      score = Math.round(50 + (passedCount / conditions.length) * 45);

      if (isBullishTrend && isBullishBreakout && isAtrConfirmed && cooldownPassed && config.enabled) {
        const slDistance = Math.max(currentAtr * params.atrMultiplierSl, currentPrice - swingLow * 0.999);
        const tpDistance = Math.max(currentAtr * params.atrMultiplierTp, slDistance * 1.5);
        const stopLoss = Number((currentPrice - slDistance).toFixed(5));
        const takeProfit = Number((currentPrice + tpDistance).toFixed(5));
        const rr = (tpDistance / slDistance).toFixed(2);

        signal = {
          id: `sig_breakout_${Date.now()}_buy`,
          strategyId: this.id,
          strategyName: this.name,
          symbol: ctx.symbol,
          timeframe: config.timeframe,
          side: 'BUY',
          price: currentPrice,
          entry: currentPrice,
          stopLoss,
          takeProfit,
          riskReward: `1:${rr}`,
          timestamp: Date.now(),
          status: 'ACTIVE',
          reason: `BREAKOUT BUY: Clear close above ${params.lookbackBars}-bar swing high with EMA 50 trend confirmation, ATR expansion ${atrExpansion.toFixed(2)}x, and volume surge.`,
          conditions,
          metadata: {
            swingHigh,
            swingLow,
            ema50: currentEma50,
            volumeRatio,
            atrExpansion,
          },
        };
      }
    } else {
      conditions.push({
        name: `Higher-Timeframe Trend (EMA 50)`,
        passed: isBearishTrend,
        detail: `Price (${formatPrice(ctx.symbol, currentPrice)}) below EMA 50 (${formatPrice(ctx.symbol, currentEma50)}) with downward slope`,
      });
      conditions.push({
        name: `Range Low Breakdown (${params.lookbackBars}-bar Low)`,
        passed: isBearishBreakout,
        detail: isBearishBreakout
          ? `Broke cleanly below ${params.lookbackBars}-bar support (${formatPrice(ctx.symbol, swingLow)})`
          : `Above support barrier (${formatPrice(ctx.symbol, swingLow)})`,
      });
      conditions.push({
        name: `ATR Volatility Expansion`,
        passed: isAtrConfirmed,
        detail: `ATR expansion: ${atrExpansion.toFixed(2)}x (Threshold: ${params.minAtrExpansion}x)`,
      });
      conditions.push({
        name: `Volume Surge Confirmation`,
        passed: isVolumeConfirmed,
        detail: `Volume: ${currentVolume} (${volumeRatio.toFixed(2)}x 20-bar average)`,
      });

      const passedCount = conditions.filter((c) => c.passed).length;
      score = Math.round(50 - (passedCount / conditions.length) * 45);

      if (isBearishTrend && isBearishBreakout && isAtrConfirmed && cooldownPassed && config.enabled) {
        const slDistance = Math.max(currentAtr * params.atrMultiplierSl, swingHigh * 1.001 - currentPrice);
        const tpDistance = Math.max(currentAtr * params.atrMultiplierTp, slDistance * 1.5);
        const stopLoss = Number((currentPrice + slDistance).toFixed(5));
        const takeProfit = Number((currentPrice - tpDistance).toFixed(5));
        const rr = (tpDistance / slDistance).toFixed(2);

        signal = {
          id: `sig_breakout_${Date.now()}_sell`,
          strategyId: this.id,
          strategyName: this.name,
          symbol: ctx.symbol,
          timeframe: config.timeframe,
          side: 'SELL',
          price: currentPrice,
          entry: currentPrice,
          stopLoss,
          takeProfit,
          riskReward: `1:${rr}`,
          timestamp: Date.now(),
          status: 'ACTIVE',
          reason: `BREAKDOWN SELL: Clear close below ${params.lookbackBars}-bar swing low with EMA 50 trend confirmation, ATR expansion ${atrExpansion.toFixed(2)}x, and volume surge.`,
          conditions,
          metadata: {
            swingHigh,
            swingLow,
            ema50: currentEma50,
            volumeRatio,
            atrExpansion,
          },
        };
      }
    }

    return {
      strategyId: this.id,
      strategyName: this.name,
      symbol: ctx.symbol,
      signal,
      score,
      conditions,
      metadata: {
        swingHigh,
        swingLow,
        ema50: currentEma50,
        volumeRatio,
        atrExpansion,
      },
    };
  },
};

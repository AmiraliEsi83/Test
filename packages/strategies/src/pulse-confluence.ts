import { StrategyPlugin, StrategyConfig, StrategyContext, StrategyEvaluation } from './types.js';
import { Signal, SignalCondition, toPips, formatPrice } from '@harsi/shared';
import { ema, rsi, macd, atr } from '@harsi/market-data';

export const PulseConfluenceStrategy: StrategyPlugin = {
  id: 'pulse-confluence',
  name: 'Pulse Momentum Confluence',
  badge: 'Institutional Momentum',
  summary:
    'Multi-factor momentum confluence engine combining EMA 9/21 trend alignment, RSI location zones, MACD histogram directional expansion, and ATR volatility expansion filters. Executes only when all quantitative factors agree.',
  rules: [
    'Trend Alignment: EMA 9 must lead EMA 21 (Long) or trail EMA 21 (Short).',
    'RSI Location: Bullish continuation (50–68) or oversold bounce (≤32) for long; Bearish continuation (32–50) or overbought fade (≥68) for short.',
    'Impulse Expansion: MACD histogram must be expanding in trade direction.',
    'Volatility Expansion: Current ATR > 1.15× 30-period baseline ATR (avoids low liquidity chop).',
    'Trend Strength: High-timeframe EMA structure confirmed.',
    'Dynamic ATR stops and targets: 1.4× ATR Stop Loss, 2.1× ATR Take Profit (1:1.50 R:R).',
  ],
  defaultConfig: {
    id: 'pulse-confluence',
    enabled: true,
    symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'SPY', 'QQQ'],
    timeframe: '5m',
    maxSignalsPerDay: 4,
    cooldownMinutes: 30,
    allowedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    parameters: {
      emaFast: 9,
      emaSlow: 21,
      rsiPeriod: 14,
      rsiOverbought: 68,
      rsiOversold: 32,
      atrMultiplierSl: 1.4,
      atrMultiplierTp: 2.1,
      minAtrExpansion: 1.05,
    },
  },

  evaluate(ctx: StrategyContext, config: StrategyConfig): StrategyEvaluation {
    const params = { ...this.defaultConfig.parameters, ...config.parameters };
    const candles = ctx.candles;

    if (!candles || candles.length < 35) {
      return {
        strategyId: this.id,
        strategyName: this.name,
        symbol: ctx.symbol,
        signal: null,
        score: 50,
        conditions: [{ name: 'Data Readiness', passed: false, detail: 'Need at least 35 candles to compute indicators' }],
      };
    }

    const closes = candles.map((c) => c.close);
    const emaFastValues = ema(closes, params.emaFast);
    const emaSlowValues = ema(closes, params.emaSlow);
    const rsiValues = rsi(closes, params.rsiPeriod);
    const macdValues = macd(closes);
    const atrValues = atr(candles, 14);

    const idx = closes.length - 1;
    const currentPrice = ctx.currentPrice;
    const e9 = emaFastValues[idx];
    const e21 = emaSlowValues[idx];
    const currentRsi = rsiValues[idx];
    const currentMacdHist = macdValues.hist[idx];
    const prevMacdHist = macdValues.hist[idx - 1] || 0;
    const currentAtr = atrValues[idx] || (candles[idx].high - candles[idx].low);
    const avgAtrSlice = atrValues.slice(-30);
    const baselineAtr = avgAtrSlice.length
      ? avgAtrSlice.reduce((a, b) => a + b, 0) / avgAtrSlice.length
      : currentAtr;
    const atrExpansion = baselineAtr > 0 ? currentAtr / baselineAtr : 1.0;

    // Check Long Conditions
    const isEmaBullish = e9 > e21;
    const isRsiBullish = (currentRsi >= 50 && currentRsi <= params.rsiOverbought) || currentRsi <= params.rsiOversold;
    const isMacdBullish = currentMacdHist > 0 && currentMacdHist >= prevMacdHist;
    const isAtrExpanded = atrExpansion >= params.minAtrExpansion;
    const isTrendBullish = currentPrice >= e21;

    // Check Short Conditions
    const isEmaBearish = e9 < e21;
    const isRsiBearish = (currentRsi <= 50 && currentRsi >= params.rsiOversold) || currentRsi >= params.rsiOverbought;
    const isMacdBearish = currentMacdHist < 0 && currentMacdHist <= prevMacdHist;
    const isTrendBearish = currentPrice <= e21;

    const cooldownPassed =
      !ctx.lastFiredTimestamp || Date.now() - ctx.lastFiredTimestamp > config.cooldownMinutes * 60 * 1000;

    let signal: Signal | null = null;
    let score = 50;
    const conditions: SignalCondition[] = [];

    if (isEmaBullish) {
      // Long conditions checklist
      conditions.push({
        name: `EMA 9 > EMA 21 (${params.emaFast}/${params.emaSlow})`,
        passed: isEmaBullish,
        detail: `EMA 9: ${formatPrice(ctx.symbol, e9)} > EMA 21: ${formatPrice(ctx.symbol, e21)} (Bullish alignment)`,
      });
      conditions.push({
        name: `RSI Location (${currentRsi.toFixed(1)})`,
        passed: isRsiBullish,
        detail: `RSI: ${currentRsi.toFixed(1)} holding bullish momentum band (Target: 50–${params.rsiOverbought})`,
      });
      conditions.push({
        name: 'MACD Impulse Expansion',
        passed: isMacdBullish,
        detail: `MACD Histogram: ${currentMacdHist >= 0 ? '+' : ''}${currentMacdHist.toFixed(5)} (expanding positive)`,
      });
      conditions.push({
        name: `ATR Expansion (${atrExpansion.toFixed(2)}x)`,
        passed: isAtrExpanded,
        detail: `Current ATR: ${formatPrice(ctx.symbol, currentAtr)} vs baseline: ${formatPrice(ctx.symbol, baselineAtr)} (${atrExpansion.toFixed(2)}x)`,
      });
      conditions.push({
        name: 'Price Structure Filter',
        passed: isTrendBullish,
        detail: `Price (${formatPrice(ctx.symbol, currentPrice)}) supported above dynamic EMA baseline`,
      });

      const passedCount = conditions.filter((c) => c.passed).length;
      score = Math.round(50 + (passedCount / conditions.length) * 45);

      if (passedCount >= 4 && cooldownPassed && config.enabled) {
        const slDistance = Math.max(currentAtr * params.atrMultiplierSl, currentPrice * 0.001);
        const tpDistance = Math.max(currentAtr * params.atrMultiplierTp, currentPrice * 0.0015);
        const stopLoss = Number((currentPrice - slDistance).toFixed(5));
        const takeProfit = Number((currentPrice + tpDistance).toFixed(5));
        const rr = (tpDistance / slDistance).toFixed(2);

        signal = {
          id: `sig_pulse_${Date.now()}_buy`,
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
          reason: `PULSE BUY: EMA 9/21 bullish structure, RSI ${currentRsi.toFixed(1)}, MACD impulse positive, ATR expanded ${atrExpansion.toFixed(2)}x.`,
          conditions,
          metadata: {
            ema9: e9,
            ema21: e21,
            rsi: currentRsi,
            macdHist: currentMacdHist,
            atr: currentAtr,
            atrExpansion,
          },
        };
      }
    } else {
      // Short conditions checklist
      conditions.push({
        name: `EMA 9 < EMA 21 (${params.emaFast}/${params.emaSlow})`,
        passed: isEmaBearish,
        detail: `EMA 9: ${formatPrice(ctx.symbol, e9)} < EMA 21: ${formatPrice(ctx.symbol, e21)} (Bearish alignment)`,
      });
      conditions.push({
        name: `RSI Location (${currentRsi.toFixed(1)})`,
        passed: isRsiBearish,
        detail: `RSI: ${currentRsi.toFixed(1)} in bearish trend territory (Target: ${params.rsiOversold}–50)`,
      });
      conditions.push({
        name: 'MACD Impulse Expansion',
        passed: isMacdBearish,
        detail: `MACD Histogram: ${currentMacdHist.toFixed(5)} (expanding negative)`,
      });
      conditions.push({
        name: `ATR Expansion (${atrExpansion.toFixed(2)}x)`,
        passed: isAtrExpanded,
        detail: `Current ATR: ${formatPrice(ctx.symbol, currentAtr)} vs baseline: ${formatPrice(ctx.symbol, baselineAtr)} (${atrExpansion.toFixed(2)}x)`,
      });
      conditions.push({
        name: 'Price Structure Filter',
        passed: isTrendBearish,
        detail: `Price (${formatPrice(ctx.symbol, currentPrice)}) capped below dynamic EMA baseline`,
      });

      const passedCount = conditions.filter((c) => c.passed).length;
      score = Math.round(50 - (passedCount / conditions.length) * 45);

      if (passedCount >= 4 && cooldownPassed && config.enabled) {
        const slDistance = Math.max(currentAtr * params.atrMultiplierSl, currentPrice * 0.001);
        const tpDistance = Math.max(currentAtr * params.atrMultiplierTp, currentPrice * 0.0015);
        const stopLoss = Number((currentPrice + slDistance).toFixed(5));
        const takeProfit = Number((currentPrice - tpDistance).toFixed(5));
        const rr = (tpDistance / slDistance).toFixed(2);

        signal = {
          id: `sig_pulse_${Date.now()}_sell`,
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
          reason: `PULSE SELL: EMA 9/21 bearish structure, RSI ${currentRsi.toFixed(1)}, MACD impulse negative, ATR expanded ${atrExpansion.toFixed(2)}x.`,
          conditions,
          metadata: {
            ema9: e9,
            ema21: e21,
            rsi: currentRsi,
            macdHist: currentMacdHist,
            atr: currentAtr,
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
        ema9: e9,
        ema21: e21,
        rsi: currentRsi,
        macdHist: currentMacdHist,
        atr: currentAtr,
        atrExpansion,
      },
    };
  },
};

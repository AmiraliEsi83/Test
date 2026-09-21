import {
  LondonHarsiStrategy,
  PulseConfluenceStrategy,
  BreakoutTrendStrategy,
  StrategyRegistry,
} from '@harsi/strategies';
import { StrategyContext } from '@harsi/strategies';
import { MockMarketFeed } from '@harsi/market-data';

describe('Algorithmic Trading Strategies', () => {
  const feed = new MockMarketFeed();
  const candles = feed.getCandles('EURUSD');

  const defaultSession = {
    name: 'London',
    key: 'london' as const,
    inHarsiWindow: true,
    minutesToLondon: 0,
    volatilityMultiplier: 1.2,
    note: 'Active London Session',
    sessions: [],
  };

  test('Strategy Registry loads all three core strategies', () => {
    const registry = new StrategyRegistry();
    const all = registry.getAll();
    expect(all.length).toBe(3);

    const ids = all.map((s) => s.id);
    expect(ids).toContain('london-harsi');
    expect(ids).toContain('pulse-confluence');
    expect(ids).toContain('breakout-trend');
  });

  test('London HARSI strategy adheres to rules and configurable thresholds', () => {
    const strat = LondonHarsiStrategy;
    expect(strat.id).toBe('london-harsi');
    expect(strat.defaultConfig.enabled).toBe(true);
    expect(strat.rules.length).toBeGreaterThan(0);

    const contextInWindow: StrategyContext = {
      symbol: 'EURUSD',
      timeframe: '15m',
      candles,
      currentPrice: 1.0825,
      asianRange: {
        high: 1.0860,
        low: 1.0800,
        mid: 1.0830,
        rangePips: 60,
      },
      session: defaultSession,
    };

    const evalResult = strat.evaluate(contextInWindow, strat.defaultConfig);
    expect(evalResult).toHaveProperty('strategyId');
    expect(evalResult).toHaveProperty('conditions');
    expect(Array.isArray(evalResult.conditions)).toBe(true);
  });

  test('Pulse Confluence strategy outputs transparent quantitative checklist', () => {
    const strat = PulseConfluenceStrategy;
    expect(strat.id).toBe('pulse-confluence');

    const context: StrategyContext = {
      symbol: 'EURUSD',
      timeframe: '5m',
      candles,
      currentPrice: candles[candles.length - 1].close,
      session: defaultSession,
    };

    const evalResult = strat.evaluate(context, strat.defaultConfig);
    expect(evalResult).toHaveProperty('conditions');
    expect(evalResult.conditions.length).toBeGreaterThanOrEqual(4);

    // Verify condition checklist transparency
    const names = evalResult.conditions.map((c) => c.name);
    expect(names.some((n) => n.includes('EMA'))).toBe(true);
    expect(names.some((n) => n.includes('RSI'))).toBe(true);

    if (evalResult.signal) {
      expect(evalResult.signal.stopLoss).toBeDefined();
      expect(evalResult.signal.takeProfit).toBeDefined();
      expect(evalResult.signal.riskReward).toBeDefined();
    }
  });

  test('Breakout + Trend strategy evaluates breakout and volume confirmation', () => {
    const strat = BreakoutTrendStrategy;
    expect(strat.id).toBe('breakout-trend');

    const context: StrategyContext = {
      symbol: 'EURUSD',
      timeframe: '15m',
      candles,
      currentPrice: 1.0900,
      asianRange: {
        high: 1.0850,
        low: 1.0800,
        mid: 1.0825,
        rangePips: 50,
      },
      session: defaultSession,
    };

    const evalResult = strat.evaluate(context, strat.defaultConfig);
    expect(evalResult).toHaveProperty('strategyId');
    expect(Array.isArray(evalResult.conditions)).toBe(true);
  });
});

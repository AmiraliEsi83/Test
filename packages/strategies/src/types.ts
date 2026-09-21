import { Candle, Signal, SignalCondition } from '@harsi/shared';
import { SessionInfo } from '@harsi/market-data';

export interface StrategyContext {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  currentPrice: number;
  session: SessionInfo;
  asianRange?: { high: number; low: number; mid: number; rangePips: number } | null;
  historySignalsCountToday?: number;
  lastFiredTimestamp?: number;
}

export interface StrategyConfig {
  id: string;
  enabled: boolean;
  symbols: string[];
  timeframe: string;
  parameters: Record<string, any>;
  maxSignalsPerDay: number;
  cooldownMinutes: number;
  allowedDays: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
}

export interface StrategyEvaluation {
  strategyId: string;
  strategyName: string;
  symbol: string;
  signal: Signal | null;
  score: number; // 0 - 100
  conditions: SignalCondition[];
  metadata?: Record<string, any>;
}

export interface StrategyPlugin {
  id: string;
  name: string;
  badge: string;
  summary: string;
  rules: string[];
  defaultConfig: StrategyConfig;
  evaluate(context: StrategyContext, config: StrategyConfig): StrategyEvaluation;
}

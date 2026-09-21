import type { Side, StrategyId } from "@harsi/shared";
import type { Candle } from "../indicators.js";

export interface ConditionCheck {
  label: string;
  detail: string;
  passed: boolean;
}

export interface StrategySignal {
  strategyId: StrategyId;
  side: Side;
  symbol: string;
  timeframe: string;
  entry: number;
  stop: number;
  target: number;
  slPips: number;
  tpPips: number;
  riskReward: number;
  reason: string;
  conditions: ConditionCheck[];
  timestamp: number;
  harsiValue?: number;
}

export interface StrategyContext {
  symbol: string;
  timeframe: string;
  price: number;
  candles: Candle[];
  htfCandles?: Candle[];
  asian?: { high: number; low: number };
  now: Date;
  inHarsiWindow: boolean;
  fired: Record<string, boolean | number>;
  config: Record<string, unknown>;
}

export interface StrategyModule {
  id: StrategyId;
  name: string;
  badge: string;
  summary: string;
  rules: string[];
  defaultConfig: Record<string, unknown>;
  evaluate(ctx: StrategyContext): {
    diagnostics: Record<string, unknown>;
    signal: StrategySignal | null;
  };
}

export const DEFAULT_STRATEGY_CONFIGS: Record<StrategyId, Record<string, unknown>> = {
  "london-harsi": {
    enabled: true,
    symbols: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
    timeframe: "1m",
    session: "london",
    buyMin: -30,
    buyMax: -15,
    sellMin: 15,
    sellMax: 30,
    windowMinutesBefore: 15,
    windowMinutesAfter: 5,
    cooldownSec: 0,
    maxSignalsPerDay: 2,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    slPips: 22,
    tpPips: 34,
  },
  "pulse-confluence": {
    enabled: true,
    symbols: ["EURUSD", "GBPUSD", "XAUUSD", "BTCUSD"],
    timeframe: "5m",
    emaFast: 9,
    emaSlow: 21,
    rsiPeriod: 14,
    rsiLongMin: 50,
    rsiShortMax: 50,
    scoreThreshold: 74,
    edge: 18,
    cooldownSec: 480,
    maxSignalsPerDay: 8,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  "breakout-trend": {
    enabled: true,
    symbols: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "SPY", "QQQ"],
    timeframe: "15m",
    htfEma: 50,
    atrExpand: 1.12,
    volumeConfirm: 1.1,
    cooldownSec: 900,
    maxSignalsPerDay: 4,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    session: "london",
  },
};

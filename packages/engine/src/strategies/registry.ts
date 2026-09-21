import { londonHarsi } from "./london-harsi.js";
import { pulseConfluence } from "./pulse-confluence.js";
import { breakoutTrend } from "./breakout-trend.js";
import { DEFAULT_STRATEGY_CONFIGS, type StrategyModule } from "./types.js";
import type { StrategyId } from "@harsi/shared";

export const STRATEGIES: Record<StrategyId, StrategyModule> = {
  "london-harsi": { ...londonHarsi, defaultConfig: DEFAULT_STRATEGY_CONFIGS["london-harsi"] },
  "pulse-confluence": { ...pulseConfluence, defaultConfig: DEFAULT_STRATEGY_CONFIGS["pulse-confluence"] },
  "breakout-trend": { ...breakoutTrend, defaultConfig: DEFAULT_STRATEGY_CONFIGS["breakout-trend"] },
};

export const STRATEGY_LIST = Object.values(STRATEGIES);

export { DEFAULT_STRATEGY_CONFIGS } from "./types.js";
export * from "./types.js";
export { computeHarsi } from "./london-harsi.js";

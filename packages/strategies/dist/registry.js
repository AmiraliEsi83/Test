import { LondonHarsiStrategy } from './london-harsi.js';
import { PulseConfluenceStrategy } from './pulse-confluence.js';
import { BreakoutTrendStrategy } from './breakout-trend.js';
export class StrategyRegistry {
    strategies = new Map();
    constructor() {
        this.register(LondonHarsiStrategy);
        this.register(PulseConfluenceStrategy);
        this.register(BreakoutTrendStrategy);
    }
    register(strategy) {
        this.strategies.set(strategy.id, strategy);
    }
    get(id) {
        return this.strategies.get(id);
    }
    getAll() {
        return Array.from(this.strategies.values());
    }
}
export const defaultStrategyRegistry = new StrategyRegistry();

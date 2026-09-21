"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultStrategyRegistry = exports.StrategyRegistry = void 0;
const london_harsi_js_1 = require("./london-harsi.js");
const pulse_confluence_js_1 = require("./pulse-confluence.js");
const breakout_trend_js_1 = require("./breakout-trend.js");
class StrategyRegistry {
    strategies = new Map();
    constructor() {
        this.register(london_harsi_js_1.LondonHarsiStrategy);
        this.register(pulse_confluence_js_1.PulseConfluenceStrategy);
        this.register(breakout_trend_js_1.BreakoutTrendStrategy);
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
exports.StrategyRegistry = StrategyRegistry;
exports.defaultStrategyRegistry = new StrategyRegistry();

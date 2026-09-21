import { StrategyPlugin } from './types.js';
import { LondonHarsiStrategy } from './london-harsi.js';
import { PulseConfluenceStrategy } from './pulse-confluence.js';
import { BreakoutTrendStrategy } from './breakout-trend.js';

export class StrategyRegistry {
  private strategies: Map<string, StrategyPlugin> = new Map();

  constructor() {
    this.register(LondonHarsiStrategy);
    this.register(PulseConfluenceStrategy);
    this.register(BreakoutTrendStrategy);
  }

  public register(strategy: StrategyPlugin): void {
    this.strategies.set(strategy.id, strategy);
  }

  public get(id: string): StrategyPlugin | undefined {
    return this.strategies.get(id);
  }

  public getAll(): StrategyPlugin[] {
    return Array.from(this.strategies.values());
  }
}

export const defaultStrategyRegistry = new StrategyRegistry();

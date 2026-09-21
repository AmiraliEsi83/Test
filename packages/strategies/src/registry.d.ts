import { StrategyPlugin } from './types.js';
export declare class StrategyRegistry {
    private strategies;
    constructor();
    register(strategy: StrategyPlugin): void;
    get(id: string): StrategyPlugin | undefined;
    getAll(): StrategyPlugin[];
}
export declare const defaultStrategyRegistry: StrategyRegistry;

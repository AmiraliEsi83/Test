import { Candle, Tick } from '@harsi/shared';
export declare class MockMarketFeed {
    private cache;
    private lastTicks;
    constructor();
    private seedAll;
    generateHistory(symbol: string, count?: number): Candle[];
    getCandles(symbol: string): Candle[];
    getLatestTick(symbol: string): Tick;
    nextTick(symbol: string, volatilityBoost?: number): {
        tick: Tick;
        candle: Candle;
    };
}

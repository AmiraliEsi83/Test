import { Candle, BacktestRequest, BacktestResult } from '@harsi/shared';
import { StrategyPlugin } from '@harsi/strategies';
export declare class BacktestingEngine {
    run(strategy: StrategyPlugin, candles: Candle[], request: BacktestRequest): BacktestResult;
}

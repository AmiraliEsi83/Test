import { Candle } from '@harsi/shared';
export declare function ema(values: number[], period: number): number[];
export declare function rsi(values: number[], period?: number): number[];
export declare function macd(values: number[], fast?: number, slow?: number, signalPeriod?: number): {
    line: number[];
    signal: number[];
    hist: number[];
};
export declare function atr(candles: Candle[], period?: number): number[];
export declare function bollingerBands(values: number[], period?: number, stdDevMultiplier?: number): {
    upper: number[];
    middle: number[];
    lower: number[];
};
export interface HarsiResult {
    value: number;
    zone: 'buy' | 'sell' | 'extended-buy' | 'extended-sell' | 'flat';
    mid: number;
    asianHigh: number;
    asianLow: number;
    rangePips: number;
}
export declare function computeHarsi(symbol: string, price: number, asianRange?: {
    high: number;
    low: number;
}): HarsiResult;

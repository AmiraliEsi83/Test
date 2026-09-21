import { Instrument } from './types.js';
export declare const INSTRUMENTS: Record<string, Instrument>;
export declare const INSTRUMENT_LIST: Instrument[];
export declare function getInstrument(symbol: string): Instrument;
export declare function toPips(symbol: string, delta: number): number;
export declare function fromPips(symbol: string, pips: number): number;
export declare function formatPrice(symbol: string, price: number | null | undefined): string;
export declare function calcPnl(symbol: string, side: 'LONG' | 'SHORT' | 'BUY' | 'SELL', entry: number, current: number, lots: number): {
    pnlUsd: number;
    pnlPips: number;
};

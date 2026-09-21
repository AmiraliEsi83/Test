import { MarketSession, Candle } from '@harsi/shared';
export interface SessionInfo {
    name: string;
    key: 'asian' | 'london-prep' | 'london' | 'london-ny-overlap' | 'new-york' | 'sydney' | 'weekend';
    inHarsiWindow: boolean;
    minutesToLondon: number;
    volatilityMultiplier: number;
    note: string;
    sessions: MarketSession[];
}
export declare function getZonedTime(date?: Date, timeZone?: string): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    weekday: string;
};
export declare function getLondonMinutes(date?: Date): number;
export declare function isWeekend(date?: Date): boolean;
export declare function getSessionState(date?: Date, forceLondonWindow?: boolean): SessionInfo;
export declare function extractAsianRange(candles: Candle[]): {
    high: number;
    low: number;
    mid: number;
    rangePips: number;
} | null;

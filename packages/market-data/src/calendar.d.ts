import { EconomicEvent } from '@harsi/shared';
export declare const STATIC_ECONOMIC_EVENTS: EconomicEvent[];
export declare class EconomicCalendarService {
    getEvents(minImpact?: 'ALL' | 'HIGH' | 'MEDIUM'): EconomicEvent[];
    getUpcomingHighImpact(withinMinutes?: number): EconomicEvent[];
}

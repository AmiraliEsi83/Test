"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getZonedTime = getZonedTime;
exports.getLondonMinutes = getLondonMinutes;
exports.isWeekend = isWeekend;
exports.getSessionState = getSessionState;
exports.extractAsianRange = extractAsianRange;
const LONDON_TZ = 'Europe/London';
function getZonedTime(date = new Date(), timeZone = LONDON_TZ) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        weekday: 'short',
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second),
        weekday: parts.weekday,
    };
}
function getLondonMinutes(date = new Date()) {
    const p = getZonedTime(date, LONDON_TZ);
    return p.hour * 60 + p.minute + p.second / 60;
}
function isWeekend(date = new Date()) {
    const p = getZonedTime(date, LONDON_TZ);
    return p.weekday === 'Sat' || p.weekday === 'Sun';
}
function getSessionState(date = new Date(), forceLondonWindow = false) {
    const londonTime = getZonedTime(date, LONDON_TZ);
    const mins = londonTime.hour * 60 + londonTime.minute;
    const weekend = isWeekend(date);
    // Define individual market sessions
    // Sydney: 22:00 - 07:00 UTC (roughly 22:00 - 07:00 London in winter)
    // Tokyo (Asian): 00:00 - 09:00 UTC
    // London: 08:00 - 16:30 UTC
    // New York: 13:00 - 21:00 UTC
    const isSydneyOpen = mins >= 22 * 60 || mins < 7 * 60;
    const isTokyoOpen = mins >= 0 && mins < 9 * 60;
    const isLondonOpen = mins >= 8 * 60 && mins < 16 * 60 + 30;
    const isNyOpen = mins >= 13 * 60 && mins < 21 * 60;
    const marketSessions = [
        {
            name: 'Sydney',
            key: 'sydney',
            openUtcHour: 22,
            closeUtcHour: 7,
            isOpen: isSydneyOpen && !weekend,
            nextOpenMinutes: isSydneyOpen ? 0 : Math.max(0, 22 * 60 - mins),
            nextCloseMinutes: isSydneyOpen ? Math.max(0, (7 * 60) - mins) : 0,
            note: 'Early liquidity & AUD/NZD flow',
        },
        {
            name: 'Tokyo',
            key: 'tokyo',
            openUtcHour: 0,
            closeUtcHour: 9,
            isOpen: isTokyoOpen && !weekend,
            nextOpenMinutes: isTokyoOpen ? 0 : Math.max(0, 24 * 60 - mins),
            nextCloseMinutes: isTokyoOpen ? Math.max(0, 9 * 60 - mins) : 0,
            note: 'Asian range formation for HARSI',
        },
        {
            name: 'London',
            key: 'london',
            openUtcHour: 8,
            closeUtcHour: 16,
            isOpen: isLondonOpen && !weekend,
            nextOpenMinutes: isLondonOpen ? 0 : Math.max(0, 8 * 60 - mins),
            nextCloseMinutes: isLondonOpen ? Math.max(0, 16 * 60 + 30 - mins) : 0,
            note: 'Primary institutional FX & metals volume',
        },
        {
            name: 'New York',
            key: 'new-york',
            openUtcHour: 13,
            closeUtcHour: 21,
            isOpen: isNyOpen && !weekend,
            nextOpenMinutes: isNyOpen ? 0 : Math.max(0, 13 * 60 - mins),
            nextCloseMinutes: isNyOpen ? Math.max(0, 21 * 60 - mins) : 0,
            note: 'US equities, Treasury yields, and macro momentum',
        },
    ];
    if (forceLondonWindow) {
        return {
            name: 'London Prep (T-15)',
            key: 'london-prep',
            inHarsiWindow: true,
            minutesToLondon: 12,
            volatilityMultiplier: 2.2,
            note: 'T-15 London Window Active — Primary HARSI alerts enabled',
            sessions: marketSessions,
        };
    }
    if (weekend) {
        return {
            name: 'Weekend (Closed)',
            key: 'weekend',
            inHarsiWindow: false,
            minutesToLondon: 0,
            volatilityMultiplier: 0.1,
            note: 'Markets closed — Asian session begins Sunday 22:00 UTC',
            sessions: marketSessions,
        };
    }
    // 07:45 to 08:30 London: London Prep / Open window (HARSI Window!)
    if (mins >= 7 * 60 + 45 && mins < 8 * 60 + 30) {
        return {
            name: 'London Prep (T-15)',
            key: 'london-prep',
            inHarsiWindow: true,
            minutesToLondon: Math.max(0, 8 * 60 - mins),
            volatilityMultiplier: 2.25,
            note: 'London Open T-15 window — HARSI primary trigger zone active',
            sessions: marketSessions,
        };
    }
    // 08:30 to 13:00: London Morning
    if (mins >= 8 * 60 + 30 && mins < 13 * 60) {
        return {
            name: 'London Morning',
            key: 'london',
            inHarsiWindow: false,
            minutesToLondon: 0,
            volatilityMultiplier: 1.5,
            note: 'London cash open trend continuation',
            sessions: marketSessions,
        };
    }
    // 13:00 to 16:30: London - New York Overlap (Highest volatility of the day)
    if (mins >= 13 * 60 && mins < 16 * 60 + 30) {
        return {
            name: 'London / NY Overlap',
            key: 'london-ny-overlap',
            inHarsiWindow: false,
            minutesToLondon: 0,
            volatilityMultiplier: 2.4,
            note: 'Dual-centre liquidity overlap — Peak daily volume',
            sessions: marketSessions,
        };
    }
    // 16:30 to 21:00: New York Afternoon
    if (mins >= 16 * 60 + 30 && mins < 21 * 60) {
        return {
            name: 'New York Afternoon',
            key: 'new-york',
            inHarsiWindow: false,
            minutesToLondon: 0,
            volatilityMultiplier: 1.2,
            note: 'US equities close & fixings',
            sessions: marketSessions,
        };
    }
    // 00:00 to 07:45: Asian session
    return {
        name: 'Asian Session',
        key: 'asian',
        inHarsiWindow: false,
        minutesToLondon: Math.max(0, 8 * 60 - mins),
        volatilityMultiplier: 0.8,
        note: 'Asian range establishing base for London open',
        sessions: marketSessions,
    };
}
function extractAsianRange(candles) {
    if (!candles || candles.length < 15)
        return null;
    // Use the last 30-60 candles as session representation or calculate from session candles
    const sessionSlice = candles.slice(-60);
    let high = -Infinity;
    let low = Infinity;
    for (const c of sessionSlice) {
        if (c.high > high)
            high = c.high;
        if (c.low < low)
            low = c.low;
    }
    if (high === -Infinity || low === Infinity)
        return null;
    return {
        high,
        low,
        mid: (high + low) / 2,
        rangePips: 0,
    };
}

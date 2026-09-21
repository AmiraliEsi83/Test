import { EconomicEvent } from '@harsi/shared';

export const STATIC_ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: 'evt-1',
    title: 'US Non-Farm Payrolls (NFP)',
    country: 'United States',
    currency: 'USD',
    time: '13:30 UTC',
    timestamp: Date.now() + 1000 * 60 * 180,
    impact: 'HIGH',
    forecast: '175K',
    previous: '142K',
    affectedSymbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'SPY', 'QQQ'],
  },
  {
    id: 'evt-2',
    title: 'US CPI Inflation Rate (YoY)',
    country: 'United States',
    currency: 'USD',
    time: '12:30 UTC',
    timestamp: Date.now() + 1000 * 60 * 360,
    impact: 'HIGH',
    forecast: '2.5%',
    previous: '2.6%',
    affectedSymbols: ['EURUSD', 'USDJPY', 'SPY', 'QQQ', 'BTCUSD'],
  },
  {
    id: 'evt-3',
    title: 'Bank of England Official Bank Rate',
    country: 'United Kingdom',
    currency: 'GBP',
    time: '11:00 UTC',
    timestamp: Date.now() + 1000 * 60 * 520,
    impact: 'HIGH',
    forecast: '5.00%',
    previous: '5.25%',
    affectedSymbols: ['GBPUSD'],
  },
  {
    id: 'evt-4',
    title: 'ECB Monetary Policy Statement',
    country: 'Eurozone',
    currency: 'EUR',
    time: '12:15 UTC',
    timestamp: Date.now() + 1000 * 60 * 700,
    impact: 'HIGH',
    forecast: '3.50%',
    previous: '3.75%',
    affectedSymbols: ['EURUSD'],
  },
  {
    id: 'evt-5',
    title: 'US Initial Jobless Claims',
    country: 'United States',
    currency: 'USD',
    time: '12:30 UTC',
    timestamp: Date.now() + 1000 * 60 * 840,
    impact: 'MEDIUM',
    forecast: '228K',
    previous: '230K',
    affectedSymbols: ['EURUSD', 'USDJPY', 'SPY'],
  },
  {
    id: 'evt-6',
    title: 'S&P Global US Manufacturing PMI',
    country: 'United States',
    currency: 'USD',
    time: '13:45 UTC',
    timestamp: Date.now() + 1000 * 60 * 1020,
    impact: 'MEDIUM',
    forecast: '48.2',
    previous: '47.9',
    affectedSymbols: ['SPY', 'QQQ'],
  },
];

export class EconomicCalendarService {
  public getEvents(minImpact: 'ALL' | 'HIGH' | 'MEDIUM' = 'ALL'): EconomicEvent[] {
    if (minImpact === 'HIGH') {
      return STATIC_ECONOMIC_EVENTS.filter((e) => e.impact === 'HIGH');
    }
    if (minImpact === 'MEDIUM') {
      return STATIC_ECONOMIC_EVENTS.filter((e) => e.impact === 'HIGH' || e.impact === 'MEDIUM');
    }
    return STATIC_ECONOMIC_EVENTS;
  }

  public getUpcomingHighImpact(withinMinutes: number = 60): EconomicEvent[] {
    const now = Date.now();
    const threshold = now + withinMinutes * 60 * 1000;
    return STATIC_ECONOMIC_EVENTS.filter(
      (e) => e.impact === 'HIGH' && e.timestamp >= now && e.timestamp <= threshold
    );
  }
}

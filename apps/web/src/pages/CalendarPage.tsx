import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useTrading } from '../context/TradingContext';
import {
  Calendar as CalendarIcon,
  Clock,
  Globe2,
  AlertCircle,
  Flag,
  Filter,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { EconomicEvent } from '@harsi/shared';

interface SessionInfo {
  city: string;
  name: string;
  openUtc: string;
  closeUtc: string;
  status: 'OPEN' | 'CLOSED' | 'OPENING_SOON';
  countdown: string;
  overlap: string | null;
}

export const CalendarPage: React.FC = () => {
  const { sessionState, forceLondonWindow, toggleLondonWindow } = useTrading();
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchCalendar = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/market/calendar?impact=${impactFilter}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [impactFilter]);

  // Real world UTC times for 4 major global sessions
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const currentUtcMin = utcHours * 60 + utcMinutes;

  const calculateSession = (openH: number, closeH: number, name: string, city: string, overlapWith: string | null): SessionInfo => {
    const openMin = openH * 60;
    const closeMin = closeH * 60;

    let isOpen = false;
    let minsUntilOpen = 0;

    if (openMin < closeMin) {
      isOpen = currentUtcMin >= openMin && currentUtcMin < closeMin;
      minsUntilOpen = isOpen ? 0 : (openMin - currentUtcMin + 1440) % 1440;
    } else {
      // Crosses midnight (e.g. Sydney 21:00 to 06:00 UTC)
      isOpen = currentUtcMin >= openMin || currentUtcMin < closeMin;
      minsUntilOpen = isOpen ? 0 : (openMin - currentUtcMin + 1440) % 1440;
    }

    const countdownH = Math.floor(minsUntilOpen / 60);
    const countdownM = minsUntilOpen % 60;

    return {
      city,
      name,
      openUtc: `${String(openH).padStart(2, '0')}:00 UTC`,
      closeUtc: `${String(closeH).padStart(2, '0')}:00 UTC`,
      status: isOpen ? 'OPEN' : minsUntilOpen <= 60 ? 'OPENING_SOON' : 'CLOSED',
      countdown: isOpen ? 'Active Trading' : `Opens in ${countdownH}h ${countdownM}m`,
      overlap: isOpen ? overlapWith : null,
    };
  };

  // Sydney: 21:00 - 06:00 UTC
  // Tokyo: 00:00 - 09:00 UTC
  // London: 08:00 - 16:30 UTC
  // New York: 13:00 - 21:00 UTC
  const sessions: SessionInfo[] = [
    calculateSession(21, 6, 'Asian / Sydney', 'Sydney', currentUtcMin >= 0 && currentUtcMin < 360 ? 'Overlaps Tokyo' : null),
    calculateSession(0, 9, 'Asian / Tokyo', 'Tokyo', currentUtcMin >= 480 && currentUtcMin < 540 ? 'Overlaps London Open' : null),
    calculateSession(8, 17, 'European / London', 'London', currentUtcMin >= 780 && currentUtcMin < 1020 ? 'Overlaps New York (High Liquidity)' : null),
    calculateSession(13, 21, 'North American / New York', 'New York', currentUtcMin >= 780 && currentUtcMin < 1020 ? 'Overlaps London (Golden Hours)' : null),
  ];

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-400" />
              Institutional Session & Economic Calendar
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time monitoring of Sydney, Tokyo, London, and New York market overlaps, plus verified macroeconomic risk events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 px-3 rounded bg-[#121622] border border-[#1e2638] text-xs font-mono text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>UTC: {now.toUTCString().slice(17, 25)}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">Local: {now.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* HARSI Window Highlight Banner */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-[#0c1422] to-[#121d30] border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-bold text-white">London HARSI T-15 Mean Reversion Window</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                sessionState?.isLondonWindow
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {sessionState?.isLondonWindow ? 'ACTIVE NOW' : 'DORMANT'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              HARSI calculates Asian session range midpoints (00:00–07:00 UTC) and takes high-probability mean-reversion fades between 07:45 and 08:15 UTC.
            </p>
          </div>

          <button
            onClick={toggleLondonWindow}
            className={`px-3 py-2 rounded text-xs font-bold border transition ${
              forceLondonWindow
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md'
                : 'bg-[#182133] hover:bg-[#1e2a42] text-slate-300 border-[#2a3854]'
            }`}
          >
            {forceLondonWindow ? 'Deactivate London Window Simulation' : 'Simulate London T-15 Window Now'}
          </button>
        </div>

        {/* Global Sessions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sessions.map((sess) => {
            const isOpen = sess.status === 'OPEN';
            return (
              <div
                key={sess.name}
                className={`terminal-card p-4 bg-[#0e131d] border transition ${
                  isOpen ? 'border-emerald-500/50 shadow-md shadow-emerald-500/5' : 'border-[#1b2232]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{sess.city}</h3>
                    <div className="text-[11px] text-slate-400">{sess.name}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isOpen
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {sess.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Trading Hours:</span>
                    <span className="text-white">{sess.openUtc} - {sess.closeUtc}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Status:</span>
                    <span className={isOpen ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {sess.countdown}
                    </span>
                  </div>
                  {sess.overlap && (
                    <div className="mt-2 p-1.5 rounded bg-cyan-950/40 border border-cyan-800/40 text-[10px] text-cyan-300 font-sans flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>{sess.overlap}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Economic Calendar Section */}
        <div className="terminal-card bg-[#0e131d] overflow-hidden">
          <div className="p-4 border-b border-[#1b2232] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400" />
                Scheduled High-Impact Macroeconomic Events
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automated risk engine pauses strategy order execution ±10 minutes around Tier-1 events to prevent slippage.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#121622] p-1 rounded border border-[#1e2638] text-xs">
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setImpactFilter(filter)}
                  className={`px-2.5 py-1 rounded font-semibold text-[11px] transition ${
                    impactFilter === filter
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>TIME (UTC)</th>
                  <th>COUNTRY</th>
                  <th>EVENT</th>
                  <th>IMPACT</th>
                  <th>AFFECTED SYMBOLS</th>
                  <th>FORECAST</th>
                  <th>PREVIOUS</th>
                  <th>STRATEGY ACTION</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      No events matching impact filter.
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => {
                    const isHigh = evt.impact === 'HIGH';
                    const isMed = evt.impact === 'MEDIUM';

                    return (
                      <tr key={evt.id}>
                        <td className="font-mono text-white font-bold">{evt.time}</td>
                        <td className="font-semibold text-slate-300">
                          <span className="px-1.5 py-0.5 rounded bg-[#171f30] text-[10px] font-mono border border-[#24314c]">
                            {evt.country}
                          </span>
                        </td>
                        <td className="font-semibold text-white max-w-xs">{evt.title || (evt as any).event}</td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isHigh
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isMed
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {evt.impact}
                          </span>
                        </td>
                        <td className="font-mono text-cyan-300 text-xs">
                          {evt.affectedSymbols?.join(', ')}
                        </td>
                        <td className="font-mono text-slate-300">{evt.forecast || '—'}</td>
                        <td className="font-mono text-slate-400">{evt.previous || '—'}</td>
                        <td className="text-xs">
                          {isHigh ? (
                            <span className="text-rose-400 font-mono font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Pause Execution ±10m
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">Standard Filter</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

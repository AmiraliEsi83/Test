import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrading } from '../../context/TradingContext';
import {
  ShieldAlert,
  Wifi,
  WifiOff,
  Bell,
  Clock,
  Layers,
  Power,
  ChevronDown,
  User,
  Zap,
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const { user, plan, logout } = useAuth();
  const {
    sessionState,
    account,
    wsConnected,
    forceLondonWindow,
    toggleLondonWindow,
    triggerEmergencyStop,
  } = useTrading();

  return (
    <header className="h-14 bg-[#0d111a] border-b border-[#1e2638] px-4 flex items-center justify-between gap-4 z-40 select-none">
      {/* Brand & Market Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
            H
          </div>
          <div>
            <div className="font-extrabold text-sm text-white tracking-wider flex items-center gap-1.5">
              HARSI <span className="text-emerald-400 font-mono text-xs">TERMINAL</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">v1.0.0 Institutional</div>
          </div>
        </div>

        <div className="hidden md:flex items-center h-6 w-px bg-[#1e2638]" />

        {/* Live Session Status */}
        {sessionState && (
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium">{sessionState.name}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 font-mono text-[11px]">{sessionState.note}</span>
          </div>
        )}
      </div>

      {/* Middle Controls: Demo Window Toggle & Paper/Live Mode */}
      <div className="flex items-center gap-3">
        {/* Toggle London Window for instant testing */}
        <button
          onClick={toggleLondonWindow}
          title="Toggle T-15 London Window simulation for testing HARSI signals"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition ${
            forceLondonWindow
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-[#141a27] text-slate-400 border-[#1e2638]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>London T-15 Window: {forceLondonWindow ? 'ACTIVE (TEST)' : 'REAL CLOCK'}</span>
        </button>

        {/* Mode Pill: PAPER vs LIVE */}
        <div className="flex items-center bg-[#111622] p-0.5 rounded border border-[#1e2638]">
          <span className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            PAPER MODE
          </span>
          <span
            className="px-2.5 py-1 text-xs text-slate-500 cursor-not-allowed"
            title="Live broker execution requires Pro subscription and connected broker adapter"
          >
            LIVE
          </span>
        </div>

        {/* STOP ALL AUTOMATION Emergency Button */}
        <button
          onClick={triggerEmergencyStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600/20 text-rose-400 border border-rose-500/40 text-xs font-bold hover:bg-rose-600/30 transition shadow-sm"
          title="Emergency circuit breaker: Disables all automated strategy execution immediately"
        >
          <Power className="w-3.5 h-3.5" />
          <span className="hidden md:inline">EMERGENCY STOP</span>
        </button>
      </div>

      {/* Right Controls: WebSocket, User Profile & Subscription */}
      <div className="flex items-center gap-3">
        {/* WS Status */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400" title="WebSocket Data Stream">
          {wsConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className="hidden sm:inline">{wsConnected ? 'LIVE WS' : 'CONNECTING'}</span>
        </div>

        {/* Subscription Plan Badge */}
        <span
          className={`text-xs px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${
            plan === 'PRO'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {plan}
        </span>

        {/* User Pill */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-[#1e2638]">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{user.name}</div>
              <div className="text-[10px] text-slate-400">{user.email}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-[#1a2130] text-slate-400 hover:text-white transition"
              title="Sign Out"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <a
            href="/login"
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            Sign In
          </a>
        )}
      </div>
    </header>
  );
};

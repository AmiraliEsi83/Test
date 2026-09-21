import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Cpu,
  Shield,
  Layers,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  BarChart2,
  Terminal,
  Clock,
  Radio,
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@harsi/shared';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Public Header */}
      <header className="h-16 border-b border-[#1b2232] px-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">
            H
          </div>
          <span className="font-extrabold text-base tracking-wider text-white">
            HARSI <span className="text-emerald-400 font-mono text-xs">AI TERMINAL</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <a href="#strategies" className="hover:text-white transition">Strategies</a>
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
          <a href="#security" className="hover:text-white transition">Security</a>
          <a href="#faq" className="hover:text-white transition">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            to="/dashboard"
            className="btn-primary text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <span>Launch Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Production Algo Engine · Institutional Mean-Reversion & Confluence
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Precision Algorithmic Trading with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Transparent Logic
          </span>
        </h1>

        <p className="mt-6 text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Execute institutional London HARSI mean-reversion, multi-factor Pulse confluence, and breakout momentum with complete quantitative transparency. No black-box promises—just verifiable rules, rigorous risk management, and first-class paper execution.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="btn-primary px-6 py-3 text-sm flex items-center gap-2 shadow-xl shadow-emerald-500/20"
          >
            <Terminal className="w-4 h-4" />
            <span>Open Live Terminal</span>
          </Link>

          <Link
            to="/login"
            className="btn-secondary px-6 py-3 text-sm flex items-center gap-2"
          >
            <span>Sign In to Account</span>
          </Link>
        </div>

        {/* Live Terminal Preview Frame */}
        <div className="mt-14 w-full rounded-xl border border-[#232d42] bg-[#0c1017] p-2 shadow-2xl shadow-black/80 overflow-hidden">
          <div className="h-7 bg-[#131824] rounded-t-lg px-4 flex items-center justify-between border-b border-[#1f283a] text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-slate-300 ml-2 font-bold">HARSI TERMINAL · EUR/USD 15m</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">LONDON T-15 WINDOW: ACTIVE</span>
              <span className="badge-paper text-[10px]">PAPER DESK $100K</span>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-[#10141f] p-4 rounded-lg border border-[#1b2232]">
              <div className="text-xs text-slate-400 font-semibold uppercase">London HARSI</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">BUY @ 1.08420</div>
              <div className="text-xs text-slate-300 mt-2">
                Asian midpoint equilibrium: 1.08614 · HARSI: -19.4 pips · SL: 22p / TP: 34p
              </div>
            </div>

            <div className="bg-[#10141f] p-4 rounded-lg border border-[#1b2232]">
              <div className="text-xs text-slate-400 font-semibold uppercase">Pulse Confluence</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">Score: 88/100</div>
              <div className="text-xs text-slate-300 mt-2">
                EMA 9 &gt; 21 ✓ · RSI: 58.4 ✓ · MACD impulse ✓ · ATR expansion 1.28x ✓
              </div>
            </div>

            <div className="bg-[#10141f] p-4 rounded-lg border border-[#1b2232]">
              <div className="text-xs text-slate-400 font-semibold uppercase">Institutional Risk Manager</div>
              <div className="text-xl font-bold font-mono text-white mt-1">Circuit Breakers Arm</div>
              <div className="text-xs text-slate-300 mt-2">
                Max 1.0% risk/trade · Daily stop limit $2,500 · 3 consecutive loss auto-pause
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Deep Dive */}
      <section id="strategies" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#171e2c]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400">
            Algorithmic Foundations
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-2">Built on Institutional Mechanics</h2>
          <p className="text-sm text-slate-400 mt-3">
            Every strategy runs on transparent, verifiable market physics—not opaque hype.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* London HARSI */}
          <div className="terminal-card p-6 bg-[#0f1420] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">London HARSI Mean-Reversion</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Measures price distance from the Asian session midpoint (00:00–07:45 London). In the 15-minute window before the London cash open, extreme deviations (-15 to -30 pips for long, +15 to +30 pips for short) trigger institutional mean-reversion entries.
              </p>
              <div className="mt-4 pt-4 border-t border-[#1b2336] space-y-1.5 text-xs text-slate-300 font-mono">
                <div>• Asian Session Baseline</div>
                <div>• Strict T-15 Open Execution Window</div>
                <div>• 22 pips SL / 34 pips TP Structure</div>
              </div>
            </div>
          </div>

          {/* Pulse Confluence */}
          <div className="terminal-card p-6 bg-[#0f1420] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Pulse Momentum Confluence</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                A quantitative momentum stack requiring unison between directional structure (EMA 9 vs 21), momentum continuation (RSI 50–68 or oversold bounce), MACD histogram expansion, and ATR volatility expansion.
              </p>
              <div className="mt-4 pt-4 border-t border-[#1b2336] space-y-1.5 text-xs text-slate-300 font-mono">
                <div>• Transparent 5-Factor Checklist</div>
                <div>• Dynamic ATR Stops (1.4× SL / 2.1× TP)</div>
                <div>• Volatility Filter against Dead Markets</div>
              </div>
            </div>
          </div>

          {/* Breakout + Trend */}
          <div className="terminal-card p-6 bg-[#0f1420] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Breakout + Trend Confirmation</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Captures high-probability expansions following range contraction. Confirms higher-timeframe EMA 50 trend slope, breaks prior session swing high/low, and requires volume surge and expanding ATR.
              </p>
              <div className="mt-4 pt-4 border-t border-[#1b2336] space-y-1.5 text-xs text-slate-300 font-mono">
                <div>• Multi-Timeframe Trend Filter</div>
                <div>• Session Range Barrier Breakouts</div>
                <div>• Volume Surge Confirmation Check</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#171e2c]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400">
            Subscription Tiers
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-2">Transparent Pricing</h2>
          <p className="text-sm text-slate-400 mt-3">
            Start with paper trading, scale to institutional automation when ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(SUBSCRIPTION_PLANS).map((p) => (
            <div
              key={p.id}
              className={`p-6 rounded-xl border flex flex-col justify-between ${
                (p as any).popular
                  ? 'bg-[#121826] border-emerald-500/60 shadow-xl shadow-emerald-500/10'
                  : 'bg-[#0f1420] border-[#1e2638]'
              }`}
            >
              <div>
                {(p as any).popular && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                    Recommended
                  </span>
                )}
                <h3 className="text-lg font-bold text-white mt-1">{p.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-extrabold font-mono text-white">${p.price}</span>
                  <span className="text-xs text-slate-400">/{p.interval}</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  to="/signup"
                  className={`w-full py-2.5 rounded font-bold text-xs flex items-center justify-center transition ${
                    (p as any).popular ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  Choose {p.name}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#171e2c]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5" />
              Institutional Security Architecture
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Zero Client Secrets · Enterprise Risk Protections
            </h2>
            <p className="text-sm text-slate-400 mt-4 leading-relaxed">
              Broker API keys are never stored in browser localStorage or transmitted to client JavaScript. All orders pass through the server-side Risk Manager pipeline before hitting broker adapters.
            </p>

            <div className="mt-6 space-y-3 text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Encrypted server-side credential vault</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Hard risk limits: position size, daily drawdown, consecutive loss limit</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Instant master emergency circuit breaker ('STOP ALL AUTOMATION')</span>
              </div>
            </div>
          </div>

          <div className="terminal-card p-6 bg-[#0b0e14] font-mono text-xs text-slate-300 space-y-2 border border-[#232d42]">
            <div className="text-slate-500">// Execution Pipeline Architecture</div>
            <div className="text-emerald-400">Strategy Engine</div>
            <div className="text-slate-500 pl-4">↓ (Emits Signal with transparent metrics)</div>
            <div className="text-cyan-400 pl-4">Risk Manager</div>
            <div className="text-slate-500 pl-8">↓ (Checks position limits, equity risk, daily stop)</div>
            <div className="text-indigo-400 pl-8">Order Manager</div>
            <div className="text-slate-500 pl-12">↓ (Encrypted server routing)</div>
            <div className="text-amber-400 pl-12">Broker Adapter [Paper / Alpaca / OANDA / IBKR]</div>
          </div>
        </div>
      </section>

      {/* Prominent Risk Disclaimer */}
      <footer className="border-t border-[#1b2232] bg-[#05070b] py-12 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="font-bold uppercase tracking-wider text-slate-400">
            Mandatory Institutional Risk Disclaimer
          </div>
          <p className="leading-relaxed">
            Trading foreign exchange, precious metals, contracts for difference (CFDs), equities, and cryptocurrencies carries significant financial risk and is not suitable for all investors. Quantitative signals, algorithmic indicators, and backtest results presented on this platform are for analytical, educational, and research purposes only and do not constitute financial advice or guarantees of future performance. Past performance is no guarantee of future results. Never trade with capital you cannot afford to lose.
          </p>
          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-[#121724] text-[11px]">
            <div>© 2026 HARSI AI Trading Platform. All rights reserved.</div>
            <div className="flex items-center gap-4 mt-2 sm:mt-0">
              <Link to="/login" className="hover:text-white">Sign In</Link>
              <Link to="/dashboard" className="hover:text-white">Live Terminal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

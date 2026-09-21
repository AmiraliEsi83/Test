import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { useTrading } from '../context/TradingContext';
import { UpgradeModal } from '../components/modals/UpgradeModal';
import {
  Workflow,
  ShieldAlert,
  Power,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Save,
  RefreshCw,
} from 'lucide-react';

interface StrategyAutomationSetting {
  alerts: boolean;
  paperAutoExecute: boolean;
  liveAutoExecute: boolean;
  confirmedLiveRisk?: boolean;
}

export const AutomationPage: React.FC = () => {
  const { token, plan } = useAuth();
  const { triggerEmergencyStop } = useTrading();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Automation state
  const [masterEmergencyStop, setMasterEmergencyStop] = useState(false);
  const [strategies, setStrategies] = useState<Record<string, StrategyAutomationSetting>>({
    'london-harsi': {
      alerts: true,
      paperAutoExecute: true,
      liveAutoExecute: false,
      confirmedLiveRisk: false,
    },
    'pulse-confluence': {
      alerts: true,
      paperAutoExecute: false,
      liveAutoExecute: false,
      confirmedLiveRisk: false,
    },
    'breakout-trend': {
      alerts: true,
      paperAutoExecute: false,
      liveAutoExecute: false,
      confirmedLiveRisk: false,
    },
  });

  // Modal confirmation for live execution
  const [pendingLiveStrat, setPendingLiveStrat] = useState<string | null>(null);

  const fetchAutomation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/automation', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.automation) {
          setMasterEmergencyStop(data.automation.masterEmergencyStop ?? false);
          if (data.automation.strategies) {
            setStrategies((prev) => ({
              ...prev,
              ...data.automation.strategies,
            }));
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomation();
  }, [token]);

  const handleToggle = (stratId: string, field: 'alerts' | 'paperAutoExecute' | 'liveAutoExecute') => {
    if (field === 'liveAutoExecute') {
      if (plan !== 'PRO') {
        setShowUpgradeModal(true);
        return;
      }

      // If turning ON live auto-execute, require explicit confirmation dialog
      const current = strategies[stratId]?.liveAutoExecute;
      if (!current) {
        setPendingLiveStrat(stratId);
        return;
      }
    }

    setStrategies((prev) => ({
      ...prev,
      [stratId]: {
        ...prev[stratId],
        [field]: !prev[stratId]?.[field],
      },
    }));
  };

  const confirmLiveExecution = (stratId: string) => {
    setStrategies((prev) => ({
      ...prev,
      [stratId]: {
        ...prev[stratId],
        liveAutoExecute: true,
        confirmedLiveRisk: true,
      },
    }));
    setPendingLiveStrat(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/automation/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          strategies,
          masterEmergencyStop,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save automation settings');
      }

      setSuccessMsg('Automation pipeline configuration saved successfully.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      await triggerEmergencyStop();
      setMasterEmergencyStop(true);
      setSuccessMsg('EMERGENCY STOP ENGAGED: All automated executions aborted and locked.');
      fetchAutomation();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const strategyDefinitions = [
    {
      id: 'london-harsi',
      name: 'London HARSI Mean-Reversion',
      desc: 'Monitors the Asian session range midpoint during the T-15 London opening window and executes on HARSI threshold breaches.',
      riskTier: 'Moderate High',
    },
    {
      id: 'pulse-confluence',
      name: 'Pulse Momentum Confluence',
      desc: 'Evaluates aligned EMA trends (9/21/50), RSI momentum, MACD histogram transitions, and ATR expansion filters.',
      riskTier: 'Moderate Low',
    },
    {
      id: 'breakout-trend',
      name: 'Breakout + Trend Confirmation',
      desc: 'Executes on decisive breakouts beyond previous session extremes with higher-timeframe trend alignment and volatility surge.',
      riskTier: 'Balanced',
    },
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
              <Workflow className="w-5 h-5 text-emerald-400" />
              Algorithmic Automation Controls
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure real-time signal dispatch, paper simulation auto-fill, and live broker order routing per strategy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEmergencyStop}
              className="flex items-center gap-2 px-4 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-900/30 transition animate-pulse"
            >
              <Power className="w-4 h-4" />
              STOP ALL AUTOMATION
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-4"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Master Stop Banner */}
        {masterEmergencyStop && (
          <div className="p-4 rounded-lg bg-rose-500/15 border-2 border-rose-500/50 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-extrabold text-rose-300 uppercase tracking-wide">
                  Master Emergency Stop is Active
                </h2>
                <p className="text-xs text-rose-200/80 mt-1">
                  All automated strategy signal execution is globally suspended. No paper or live orders will be placed until reset.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setMasterEmergencyStop(false);
                setSuccessMsg('Master emergency stop disengaged.');
              }}
              className="px-3 py-1.5 rounded bg-rose-900/60 hover:bg-rose-900 text-white text-xs font-bold border border-rose-400 transition"
            >
              Resume Automation
            </button>
          </div>
        )}

        {/* Messages */}
        {successMsg && (
          <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Strategy Automation Table */}
        <div className="terminal-card overflow-hidden bg-[#0e131d]">
          <div className="p-4 border-b border-[#1b2232] flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Per-Strategy Execution Pipeline
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Live automation strictly gated behind Risk Manager & Pro tier
            </span>
          </div>

          <div className="divide-y divide-[#161c29]">
            {strategyDefinitions.map((strat) => {
              const rule = strategies[strat.id] || {
                alerts: true,
                paperAutoExecute: false,
                liveAutoExecute: false,
              };

              return (
                <div key={strat.id} className="p-5 hover:bg-[#111624] transition space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{strat.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#192233] text-slate-300 border border-[#222c42]">
                          Risk: {strat.riskTier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl">{strat.desc}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-500">Pipeline ID</span>
                      <div className="text-xs font-mono text-emerald-400">{strat.id}</div>
                    </div>
                  </div>

                  {/* Toggle Controls Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {/* 1. Alerts */}
                    <div
                      onClick={() => handleToggle(strat.id, 'alerts')}
                      className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                        rule.alerts
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#141a27] border-[#1f283d] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="text-xs font-bold">Signal Alerts</div>
                          <div className="text-[10px] text-slate-400">Browser & Terminal feed</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={rule.alerts}
                        onChange={() => {}}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {/* 2. Paper Auto-Execute */}
                    <div
                      onClick={() => handleToggle(strat.id, 'paperAutoExecute')}
                      className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                        rule.paperAutoExecute
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                          : 'bg-[#141a27] border-[#1f283d] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Workflow className="w-4 h-4 text-indigo-400" />
                        <div>
                          <div className="text-xs font-bold">Paper Auto-Execute</div>
                          <div className="text-[10px] text-slate-400">Virtual balance simulation</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={rule.paperAutoExecute}
                        onChange={() => {}}
                        className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {/* 3. Live Auto-Execute */}
                    <div
                      onClick={() => handleToggle(strat.id, 'liveAutoExecute')}
                      className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                        rule.liveAutoExecute
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : 'bg-[#141a27] border-[#1f283d] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {plan === 'PRO' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-400" />
                        )}
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>Live Broker Execution</span>
                            {plan !== 'PRO' && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">
                                PRO ONLY
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">Real capital order submission</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={rule.liveAutoExecute}
                        onChange={() => {}}
                        disabled={plan !== 'PRO'}
                        className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Safety & Execution Flow Diagram */}
        <div className="terminal-card p-5 bg-[#0e131d]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Execution Pipeline Architecture & Risk Hierarchy
          </h3>
          <div className="p-4 rounded-lg bg-[#121622] border border-[#1b2232] font-mono text-xs text-slate-300">
            <div className="flex flex-wrap items-center justify-center gap-2 text-center">
              <span className="px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                1. Strategy Signal
              </span>
              <span className="text-slate-500">→</span>
              <span className="px-3 py-1.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                2. Automation Engine
              </span>
              <span className="text-slate-500">→</span>
              <span className="px-3 py-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                3. Risk Manager (7 Rules)
              </span>
              <span className="text-slate-500">→</span>
              <span className="px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                4. Order Manager
              </span>
              <span className="text-slate-500">→</span>
              <span className="px-3 py-1.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                5. Broker Adapter (Paper/Live)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Every automated order is screened by max risk %, daily loss circuit breaker, consecutive loss limit, and drawdown limits before reaching the broker.
            </p>
          </div>
        </div>
      </main>

      {/* Confirmation Modal for Live Execution */}
      {pendingLiveStrat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="terminal-card max-w-md w-full p-6 bg-[#0e131d] border border-rose-500/50 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-lg bg-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Enable Live Automated Execution?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to enable automated order routing with real capital for strategy{' '}
              <strong className="text-white font-mono">{pendingLiveStrat}</strong>.
            </p>

            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-200 space-y-1">
              <div>⚠️ Market orders will execute on your connected live broker account automatically.</div>
              <div>⚠️ Stop loss orders are placed simultaneously but slippage can occur in volatile conditions.</div>
              <div>⚠️ You assume full responsibility for financial gains or losses.</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPendingLiveStrat(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmLiveExecution(pendingLiveStrat)}
                className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition"
              >
                I Understand & Confirm Live Risk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
};

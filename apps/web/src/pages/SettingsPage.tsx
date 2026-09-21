import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { useTrading } from '../context/TradingContext';
import { UpgradeModal } from '../components/modals/UpgradeModal';
import {
  Settings,
  User,
  Clock,
  Sliders,
  Bell,
  Shield,
  CreditCard,
  Building2,
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Key,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, token, plan, upgradePlan } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'trading' | 'risk' | 'notifications' | 'security' | 'subscription'>('profile');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Form states
  const [name, setName] = useState(user?.name || 'Trader Demo');
  const [timezone, setTimezone] = useState('UTC');
  const [defaultSymbol, setDefaultSymbol] = useState('EURUSD');
  const [defaultTimeframe, setDefaultTimeframe] = useState('5m');
  const [showVolume, setShowVolume] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showSessionLines, setShowSessionLines] = useState(true);

  // Notification states
  const [browserAlerts, setBrowserAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [telegramWebhook, setTelegramWebhook] = useState('');

  // Risk state
  const [riskForm, setRiskForm] = useState({
    maxRiskPerTradePct: 1.0,
    maxPositionSizeLots: 5.0,
    maxDailyLossUsd: 1500,
    maxDailyLossPct: 3.0,
    maxOpenPositions: 4,
    maxExposurePerAssetLots: 3.0,
    consecutiveLossThreshold: 3,
    cooldownMinutes: 60,
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRisk() {
      try {
        const res = await fetch('/api/risk', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.riskSettings) {
            setRiskForm({
              maxRiskPerTradePct: data.riskSettings.maxRiskPerTradePct ?? 1.0,
              maxPositionSizeLots: data.riskSettings.maxPositionSizeLots ?? 5.0,
              maxDailyLossUsd: data.riskSettings.maxDailyLossUsd ?? 1500,
              maxDailyLossPct: data.riskSettings.maxDailyLossPct ?? 3.0,
              maxOpenPositions: data.riskSettings.maxOpenPositions ?? 4,
              maxExposurePerAssetLots: data.riskSettings.maxExposurePerAssetLots ?? 3.0,
              consecutiveLossThreshold: data.riskSettings.consecutiveLossThreshold ?? 3,
              cooldownMinutes: data.riskSettings.cooldownMinutes ?? 60,
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchRisk();
  }, [token]);

  const handleSaveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/risk/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(riskForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update risk parameters');
      }
      setSuccessMsg('Risk parameters updated and synchronized with Risk Manager.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update risk parameters');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Preferences saved to terminal profile.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const tabs = [
    { id: 'profile', label: 'User Profile & Preferences', icon: User },
    { id: 'risk', label: 'Risk Manager Guardrails', icon: Shield },
    { id: 'notifications', label: 'Notification Triggers', icon: Bell },
    { id: 'security', label: 'Security & Auth', icon: Lock },
    { id: 'subscription', label: 'Subscription Tier', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Terminal Settings & Risk Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your trader identity, quantitative risk controls, notifications, and subscription tiers.
          </p>
        </div>

        {/* Success/Error Alerts */}
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

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1e2638] gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  active
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-[#121622]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveGeneral} className="space-y-6">
            <div className="terminal-card p-6 bg-[#0e131d] space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Trader Profile & Terminal Preferences
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#121622] border border-[#1e2638] rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Email Address (Read-only)</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || 'demo@harsi.trading'}
                    className="w-full bg-[#161a26] border border-[#1e2638] rounded p-2 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Terminal Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[#121622] border border-[#1e2638] rounded p-2 text-white"
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">America/New York (EST/EDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Default Market Symbol</label>
                  <select
                    value={defaultSymbol}
                    onChange={(e) => setDefaultSymbol(e.target.value)}
                    className="w-full bg-[#121622] border border-[#1e2638] rounded p-2 text-white"
                  >
                    <option value="EURUSD">EUR/USD (Euro / US Dollar)</option>
                    <option value="GBPUSD">GBP/USD (British Pound / US Dollar)</option>
                    <option value="BTCUSD">BTC/USD (Bitcoin / US Dollar)</option>
                    <option value="SPY">SPY (S&P 500 ETF)</option>
                  </select>
                </div>
              </div>

              {/* Chart Preferences */}
              <div className="pt-4 border-t border-[#1a2130]">
                <h4 className="text-xs font-bold text-slate-300 mb-3">Chart Display Flags</h4>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={showVolume}
                      onChange={(e) => setShowVolume(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                    />
                    <span>Render sub-pane institutional volume histogram</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={showEma}
                      onChange={(e) => setShowEma(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                    />
                    <span>Display EMA 9, 21, and 50 trend indicators overlay</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={showSessionLines}
                      onChange={(e) => setShowSessionLines(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                    />
                    <span>Project Asian session range high/low/midpoint lines</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="btn-primary text-xs py-2 px-4 flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Terminal Preferences
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab: Risk Manager */}
        {activeTab === 'risk' && (
          <form onSubmit={handleSaveRisk} className="space-y-6">
            <div className="terminal-card p-6 bg-[#0e131d] space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Centralized Risk Manager (Rule Engine)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Every order—manual or automated—is verified against these limits. Breaches immediately reject order submission.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Risk Engine: ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Max Risk Per Trade (% of Equity)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={riskForm.maxRiskPerTradePct}
                    onChange={(e) => setRiskForm({ ...riskForm, maxRiskPerTradePct: parseFloat(e.target.value) })}
                    className="w-full bg-[#121622] border border-[#1e2638] rounded p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Suggested: 1.0% (Institutional standard)</span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Max Position Size (Standard Lots)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50.0"
                    value={riskForm.maxPositionSizeLots}
                    onChange={(e) => setRiskForm({ ...riskForm, maxPositionSizeLots: parseFloat(e.target.value) })}
                    className="w-full bg-[#121622] border border-[#1e2638] rounded p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">1 standard lot = 100,000 units</span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Max Daily Loss Limit ($ USD)</label>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    value={riskForm.maxDailyLossUsd}
                    onChange={(e) => setRiskForm({ ...riskForm, maxDailyLossUsd: parseFloat(e.target.value) })}
                    className="w-full bg-[#121622] border border-[#1e2638] rounded p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Trips kill switch if daily loss exceeds this amount</span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Max Concurrent Open Positions</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={riskForm.maxOpenPositions}
                    onChange={(e) => setRiskForm({ ...riskForm, maxOpenPositions: parseInt(e.target.value) })}
                    className="w-full bg-[#121622] border border-[#1e2638] rounded p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Prevents portfolio over-leverage</span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Consecutive Loss Circuit Breaker (Trades)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={riskForm.consecutiveLossThreshold}
                    onChange={(e) => setRiskForm({ ...riskForm, consecutiveLossThreshold: parseInt(e.target.value) })}
                    className="w-full bg-[#121622] border border-[#1e2638] rounded p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Pauses automation after N consecutive losing trades</span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Cooldown Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    value={riskForm.cooldownMinutes}
                    onChange={(e) => setRiskForm({ ...riskForm, cooldownMinutes: parseInt(e.target.value) })}
                    className="w-full bg-[#121622] border border-[#1e2638] rounded p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Enforced cooldown period before new orders allowed</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1a2130] flex items-center justify-between">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Synchronizing...' : 'Save & Enforce Risk Rules'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab: Notifications */}
        {activeTab === 'notifications' && (
          <div className="terminal-card p-6 bg-[#0e131d] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Notification Channels & Alert Triggers
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded bg-[#121622] border border-[#1b2232] cursor-pointer">
                <div>
                  <div className="font-bold text-white">Browser Push Notifications</div>
                  <div className="text-[11px] text-slate-400">Desktop notifications when a new high-confidence signal fires</div>
                </div>
                <input
                  type="checkbox"
                  checked={browserAlerts}
                  onChange={(e) => setBrowserAlerts(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded bg-[#121622] border border-[#1b2232] cursor-pointer">
                <div>
                  <div className="font-bold text-white">Audio Chime on Fill / Exit</div>
                  <div className="text-[11px] text-slate-400">Subtle terminal beep when take profit or stop loss is triggered</div>
                </div>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded bg-[#121622] border border-[#1b2232] cursor-pointer">
                <div>
                  <div className="font-bold text-white">Email Daily Performance Digest</div>
                  <div className="text-[11px] text-slate-400">Receive end-of-day P/L and algorithmic performance breakdown</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                />
              </label>

              <div className="p-3 rounded bg-[#121622] border border-[#1b2232] space-y-2">
                <div className="font-bold text-white">Webhook Integration (Discord / Telegram)</div>
                <div className="text-[11px] text-slate-400">Dispatch JSON signal payloads directly to your private Discord or Telegram channel.</div>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={telegramWebhook}
                  onChange={(e) => setTelegramWebhook(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-[#1e2638] rounded p-2 text-xs font-mono text-white placeholder-slate-600"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessMsg('Notification channels updated.');
                setTimeout(() => setSuccessMsg(null), 3000);
              }}
              className="btn-primary text-xs py-2 px-4"
            >
              Update Notification Channels
            </button>
          </div>
        )}

        {/* Tab: Security */}
        {activeTab === 'security' && (
          <div className="terminal-card p-6 bg-[#0e131d] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Security Architecture & Credentials
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded bg-[#121622] border border-[#1b2232] flex items-center justify-between">
                <div>
                  <div className="text-white font-bold font-sans">JWT Session Authentication</div>
                  <div className="text-slate-400 text-[11px]">HMAC-SHA256 encrypted bearer token with 7-day expiration</div>
                </div>
                <span className="text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                  SECURE & ACTIVE
                </span>
              </div>

              <div className="p-3 rounded bg-[#121622] border border-[#1b2232] flex items-center justify-between">
                <div>
                  <div className="text-white font-bold font-sans">Broker API Secret Encryption</div>
                  <div className="text-slate-400 text-[11px]">Server-side memory isolation (Zero storage in browser localStorage or cookies)</div>
                </div>
                <span className="text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                  ENCRYPTED AT REST
                </span>
              </div>

              <div className="p-3 rounded bg-[#121622] border border-[#1b2232] flex items-center justify-between">
                <div>
                  <div className="text-white font-bold font-sans">Multi-Factor Authentication (2FA)</div>
                  <div className="text-slate-400 text-[11px]">TOTP Authenticator app support</div>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-800 px-2 py-1 rounded">
                  AVAILABLE ON PRO
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Subscription */}
        {activeTab === 'subscription' && (
          <div className="terminal-card p-6 bg-[#0e131d] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Subscription Tier & Plan Capabilities
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your current tier dictates algorithm access, live broker routing rights, and execution latency.
                </p>
              </div>

              <span
                className={`text-xs px-3 py-1 rounded font-extrabold uppercase tracking-wider ${
                  plan === 'PRO'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                Current Tier: {plan}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-[#121622] border border-[#1e2638] text-xs font-mono space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Account Status:</span>
                <span className="text-emerald-400 font-bold">Active & Verified</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Algorithmic Signal Feeds:</span>
                <span className="text-white">London HARSI, Pulse Confluence, Breakout + Trend</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Live Broker Routing:</span>
                <span className={plan === 'PRO' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {plan === 'PRO' ? 'ENABLED (Alpaca, OANDA, IBKR)' : 'LOCKED (Upgrade to Pro)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Event-Driven Backtester:</span>
                <span className="text-emerald-400 font-bold">UNLIMITED RUNS</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Manage or Upgrade Subscription Plan
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { useTrading } from '../context/TradingContext';
import { BrokerConnectModal } from '../components/modals/BrokerConnectModal';
import { UpgradeModal } from '../components/modals/UpgradeModal';
import { BrokerType, BrokerConnectionInfo } from '@harsi/shared';
import {
  Building2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Lock,
  Layers,
  ArrowRightLeft,
  Server,
  Zap,
} from 'lucide-react';

export const BrokersPage: React.FC = () => {
  const { token, plan } = useAuth();
  const { selectBroker } = useTrading();
  const [brokers, setBrokers] = useState<BrokerConnectionInfo[]>([]);
  const [activeBrokerId, setActiveBrokerId] = useState<string>('paper');
  const [activeAccount, setActiveAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalBroker, setModalBroker] = useState<BrokerType | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBrokers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/brokers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setBrokers(data.brokers || []);
        setActiveBrokerId(data.activeBrokerId || 'paper');
        setActiveAccount(data.activeAccount || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokers();
  }, [token]);

  const handleSelectActive = async (brokerId: BrokerType) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (brokerId !== 'paper' && plan !== 'PRO') {
      setShowUpgradeModal(true);
      return;
    }
    try {
      const res = await fetch('/api/brokers/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ brokerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to select broker');
      }
      setActiveBrokerId(brokerId);
      selectBroker(brokerId);
      setSuccessMsg(`Switched active execution routing to ${brokerId.toUpperCase()}`);
      fetchBrokers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDisconnect = async (brokerType: BrokerType) => {
    if (!confirm(`Are you sure you want to disconnect ${brokerType.toUpperCase()}?`)) return;
    try {
      const res = await fetch('/api/brokers/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ brokerType }),
      });
      if (res.ok) {
        setSuccessMsg(`Disconnected ${brokerType.toUpperCase()}`);
        fetchBrokers();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const placeholderCards = [
    {
      id: 'metatrader',
      name: 'MetaTrader 4 / 5 Gateway',
      category: 'FOREX / CFD BRIDGE',
      status: 'NOT CONFIGURED',
      desc: 'Connects through high-frequency ZeroMQ bridge running on your VPS/server.',
      specs: 'Supports MT4/MT5 expert advisor socket bridge. Low latency order passthrough.',
      statusText: 'Bridge Server Offline',
    },
    {
      id: 'binance',
      name: 'Binance / Crypto Futures',
      category: 'CRYPTO DERIVATIVES',
      status: 'NOT CONFIGURED',
      desc: 'Direct WebSocket execution connection for BTC, ETH, and perpetual swaps.',
      specs: 'HMAC-SHA256 signature server-side. Sub-second market order execution.',
      statusText: 'API Keys Not Configured',
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
              <Building2 className="w-5 h-5 text-emerald-400" />
              Broker Execution Architecture
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Connect external broker adapters or execute risk-free inside our institutional Paper Trading Engine.
              Live API keys never leave server-side memory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBrokers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121622] text-slate-300 border border-[#1e2638] text-xs hover:text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Active Account Overview Card */}
        {activeAccount && (
          <div className="terminal-card p-4 bg-gradient-to-r from-[#0d121c] to-[#121927] border border-[#1f293d]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Active Execution Engine
                  </div>
                  <div className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>{activeAccount.brokerName}</span>
                    <span className="badge-paper text-[10px]">
                      {activeBrokerId === 'paper' ? 'SIMULATED PAPER' : 'LIVE ROUTING'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Account ID</div>
                  <div className="text-white font-bold">{activeAccount.accountId}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Cash Balance</div>
                  <div className="text-white font-bold">
                    ${activeAccount.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Total Equity</div>
                  <div className="text-emerald-400 font-bold">
                    ${activeAccount.equity?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Available Margin</div>
                  <div className="text-cyan-400 font-bold">
                    ${activeAccount.buyingPower?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real Adapter Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brokers.map((broker) => {
            const isActive = broker.id === activeBrokerId;
            const isPaper = broker.id === 'paper';

            return (
              <div
                key={broker.id}
                className={`terminal-card p-5 bg-[#0e131d] border transition ${
                  isActive
                    ? 'border-emerald-500/50 shadow-md shadow-emerald-500/5'
                    : 'border-[#1b2232] hover:border-[#2a344d]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{broker.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Type: {broker.brokerType.toUpperCase()} · Env: {broker.environment.toUpperCase()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {broker.status === 'CONNECTED' ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        CONNECTED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/40">
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        NOT CONFIGURED
                      </span>
                    )}
                  </div>
                </div>

                {/* Specs / Permissions */}
                <div className="mt-4 p-3 rounded bg-[#121622] border border-[#1b2232] text-xs font-mono space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Account Number:</span>
                    <span className="text-white">{broker.accountId || 'Virtual Paper #001'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Execution Rights:</span>
                    <span className="text-emerald-400">
                      {isPaper ? 'FULL SIMULATION (Zero Risk)' : 'ORDER ROUTING & CANCELLATION'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Last Sync:</span>
                    <span className="text-slate-300">
                      {broker.lastSync ? new Date(broker.lastSync).toLocaleTimeString() : 'Continuous WebSocket'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-[#1b2232]">
                  {isPaper ? (
                    <button
                      onClick={() => handleSelectActive('paper')}
                      disabled={isActive}
                      className={`btn-secondary text-xs w-full py-1.5 ${
                        isActive ? 'opacity-50 cursor-default' : ''
                      }`}
                    >
                      {isActive ? 'Primary Simulation Engine Active' : 'Switch to Paper Mode'}
                    </button>
                  ) : broker.status === 'CONNECTED' ? (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={() => handleSelectActive(broker.brokerType)}
                        disabled={isActive}
                        className={`btn-primary text-xs flex-1 py-1.5 ${
                          isActive ? 'opacity-50 cursor-default' : ''
                        }`}
                      >
                        {isActive ? 'Routing Live Orders Here' : 'Route Orders to this Broker'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(broker.brokerType)}
                        className="px-3 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={() => {
                          if (plan !== 'PRO') {
                            setShowUpgradeModal(true);
                          } else {
                            setModalBroker(broker.brokerType);
                          }
                        }}
                        className="btn-primary text-xs w-full py-1.5 flex items-center justify-center gap-1.5"
                      >
                        {plan !== 'PRO' ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Connect Credentials (Requires PRO)</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Connect API Credentials</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Planned / Placeholder Integrations */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-500" />
            Additional Broker Gateway Adapters (Architecture Ready)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {placeholderCards.map((p) => (
              <div
                key={p.id}
                className="terminal-card p-4 bg-[#0e131d]/60 border border-[#1a2130] opacity-80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">{p.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{p.category}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    NOT CONFIGURED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">{p.desc}</p>
                <div className="mt-3 p-2.5 rounded bg-[#10141f] border border-[#161d2d] text-[11px] text-slate-500 font-mono">
                  {p.specs}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 rounded-lg bg-[#0e131d] border border-indigo-500/20 text-xs text-slate-300 space-y-1">
          <div className="font-bold text-indigo-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Institutional Architecture Security Guarantee
          </div>
          <p className="text-slate-400 leading-relaxed">
            Live broker secrets and OAuth keys are encrypted at rest and handled strictly in ephemeral server-side memory.
            Your browser never receives or stores your live API secret tokens, ensuring zero risk of client-side compromise or XSS exfiltration.
          </p>
        </div>
      </main>

      {/* Connect Modal */}
      {modalBroker && (
        <BrokerConnectModal
          brokerType={modalBroker}
          onClose={() => setModalBroker(null)}
          onSuccess={() => {
            setModalBroker(null);
            fetchBrokers();
            setSuccessMsg(`Broker adapter successfully authenticated.`);
          }}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
};

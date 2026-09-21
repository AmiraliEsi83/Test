import React, { useState } from 'react';
import { BrokerType } from '@harsi/shared';
import { X, Lock, Key, Server, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BrokerConnectModalProps {
  brokerType: BrokerType | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BrokerConnectModal: React.FC<BrokerConnectModalProps> = ({
  brokerType,
  onClose,
  onSuccess,
}) => {
  const { token, plan } = useAuth();
  const [env, setEnv] = useState<'sandbox' | 'live'>('sandbox');
  const [keyId, setKeyId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('5000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!brokerType || brokerType === 'paper') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, any> = {
        brokerType,
        credentials: {
          env,
          keyId,
          secretKey,
          accountId,
          apiToken: secretKey, // for Oanda
          host,
          port,
        },
      };

      const res = await fetch('/api/brokers/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Connection failed');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const getBrokerTitle = () => {
    if (brokerType === 'alpaca') return 'Alpaca Markets API';
    if (brokerType === 'oanda') return 'OANDA v20 REST API';
    if (brokerType === 'ibkr') return 'Interactive Brokers Client Portal';
    return brokerType;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 max-w-md">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Connect {getBrokerTitle()}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {plan !== 'PRO' ? (
          <div className="my-4 p-4 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
            <span className="font-bold">Pro Subscription Required: </span>
            Direct live broker adapter execution requires an Institutional Pro tier plan. Please upgrade your account in the subscription tab.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {error && (
              <div className="p-2.5 rounded bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* Environment */}
            <div>
              <label className="text-xs text-slate-300 block mb-1">Environment</label>
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value as any)}
                className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-white"
              >
                <option value="sandbox">Sandbox / Practice (Recommended)</option>
                <option value="live">Live Brokerage Account</option>
              </select>
            </div>

            {/* Broker-specific fields */}
            {brokerType === 'alpaca' && (
              <>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">APCA-API-KEY-ID</label>
                  <input
                    type="text"
                    required
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    placeholder="PK..."
                    className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">APCA-API-SECRET-KEY</label>
                  <input
                    type="password"
                    required
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white"
                  />
                </div>
              </>
            )}

            {brokerType === 'oanda' && (
              <>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Account ID</label>
                  <input
                    type="text"
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="001-004-1234567-001"
                    className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Bearer API Token</label>
                  <input
                    type="password"
                    required
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white"
                  />
                </div>
              </>
            )}

            {brokerType === 'ibkr' && (
              <>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">IBKR Account Number</label>
                  <input
                    type="text"
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="U1234567"
                    className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Gateway Host</label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="127.0.0.1"
                      className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Port</label>
                    <input
                      type="text"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="5000"
                      className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#171e2c] flex items-start gap-2 text-[11px] text-slate-400">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Zero Client Storage Policy: Credentials are encrypted and stored strictly on the server backend. Never returned to frontend JavaScript.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2638]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                {loading ? 'Authenticating...' : 'Connect Broker'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

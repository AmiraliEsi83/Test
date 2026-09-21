import React, { useState } from 'react';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '@harsi/shared';
import { useAuth } from '../../context/AuthContext';
import { X, Check, Zap } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { plan, upgradePlan } = useAuth();
  const [loading, setLoading] = useState<SubscriptionTier | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (targetTier: SubscriptionTier) => {
    setLoading(targetTier);
    try {
      await upgradePlan(targetTier);
      onClose();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 max-w-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#1e2638]">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Institutional Subscription Plans</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {Object.values(SUBSCRIPTION_PLANS).map((p) => {
            const isCurrent = plan === p.id;
            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  (p as any).popular
                    ? 'bg-[#151c2c] border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-[#0f1420] border-[#1e2638]'
                }`}
              >
                <div>
                  {(p as any).popular && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                      Most Popular
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-white mt-1">{p.name}</h4>
                  <div className="mt-2 mb-3">
                    <span className="text-2xl font-extrabold font-mono text-white">${p.price}</span>
                    <span className="text-xs text-slate-400">/{p.interval}</span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-300">
                    {p.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  {isCurrent ? (
                    <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(p.id as SubscriptionTier)}
                      disabled={loading === p.id}
                      className="w-full btn-primary text-xs"
                    >
                      {loading === p.id ? 'Upgrading...' : `Select ${p.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

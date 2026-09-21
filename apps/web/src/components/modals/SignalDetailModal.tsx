import React from 'react';
import { Signal, formatPrice } from '@harsi/shared';
import { X, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, ShieldAlert, Cpu } from 'lucide-react';

interface SignalDetailModalProps {
  signal: Signal | null;
  onClose: () => void;
  onExecute?: (sig: Signal) => void;
}

export const SignalDetailModal: React.FC<SignalDetailModalProps> = ({
  signal,
  onClose,
  onExecute,
}) => {
  if (!signal) return null;

  const isBuy = signal.side === 'BUY';

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e2638]">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{signal.strategyName}</span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                    isBuy ? 'badge-buy' : 'badge-sell'
                  }`}
                >
                  {signal.side}
                </span>
              </h2>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {signal.symbol} · {signal.timeframe} · {new Date(signal.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1a2233] text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trade Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-[#0b0e14] p-3 rounded border border-[#1b2232]">
            <div className="text-[11px] text-slate-400">Entry Price</div>
            <div className="text-sm font-bold font-mono text-white mt-1">
              {formatPrice(signal.symbol, signal.entry)}
            </div>
          </div>

          <div className="bg-[#0b0e14] p-3 rounded border border-[#1b2232]">
            <div className="text-[11px] text-slate-400">Stop Loss</div>
            <div className="text-sm font-bold font-mono text-rose-400 mt-1">
              {formatPrice(signal.symbol, signal.stopLoss)}
            </div>
          </div>

          <div className="bg-[#0b0e14] p-3 rounded border border-[#1b2232]">
            <div className="text-[11px] text-slate-400">Take Profit</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
              {formatPrice(signal.symbol, signal.takeProfit)}
            </div>
          </div>

          <div className="bg-[#0b0e14] p-3 rounded border border-[#1b2232]">
            <div className="text-[11px] text-slate-400">Risk / Reward</div>
            <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
              {signal.riskReward}
            </div>
          </div>
        </div>

        {/* Reason Narrative */}
        <div className="mb-4 p-3 bg-[#131926] rounded border border-[#202b40] text-xs text-slate-200 leading-relaxed">
          <span className="font-bold text-emerald-400">Executive Rationale: </span>
          {signal.reason}
        </div>

        {/* Transparent Quantitative Condition Checklist */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Quantitative Conditions Checklist ({signal.conditions?.length || 0} Criteria)
          </h3>

          <div className="space-y-2">
            {signal.conditions?.map((c, i) => (
              <div
                key={i}
                className="p-2.5 rounded bg-[#0b0e14] border border-[#171e2c] flex items-start gap-2.5"
              >
                {c.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{c.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        c.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {c.passed ? 'CONFIRMED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Institutional Risk Disclaimer */}
        <div className="mb-4 text-[10px] text-slate-500 font-mono leading-normal border-t border-[#1e2638] pt-3">
          Institutional Notice: Algorithmic alerts represent quantitative probability models. Not an investment guarantee. All live execution subject to personal risk limits and stop losses.
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Close
          </button>
          {onExecute && (
            <button
              onClick={() => {
                onExecute(signal);
                onClose();
              }}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              Execute Paper Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

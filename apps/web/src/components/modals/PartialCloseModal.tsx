import React, { useState } from 'react';
import { Position } from '@harsi/shared';
import { X, Check } from 'lucide-react';

interface PartialCloseModalProps {
  position: Position | null;
  onClose: () => void;
  onConfirm: (id: string, lots: number) => Promise<void>;
}

export const PartialCloseModal: React.FC<PartialCloseModalProps> = ({
  position,
  onClose,
  onConfirm,
}) => {
  if (!position) return null;

  const [closingLots, setClosingLots] = useState<number>(Number((position.lots / 2).toFixed(2)));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm(position.id, closingLots);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const setPercent = (pct: number) => {
    setClosingLots(Number((position.lots * pct).toFixed(2)));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-5 max-w-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
          <h3 className="text-sm font-bold text-white">
            Partial Close · {position.symbol} ({position.lots} lots)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Quick Percentage</label>
            <div className="grid grid-cols-3 gap-2">
              {[0.25, 0.5, 0.75].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPercent(pct)}
                  className="py-1 rounded bg-[#161c2b] border border-[#232d42] text-xs font-mono text-slate-300 hover:bg-[#20293d]"
                >
                  {pct * 100}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Lots to Close</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={position.lots}
              value={closingLots}
              onChange={(e) => setClosingLots(parseFloat(e.target.value) || 0.01)}
              className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="text-xs font-mono text-slate-400 bg-[#0c1017] p-2 rounded">
            Remaining lots after execution:{' '}
            <span className="text-white font-bold">
              {Math.max(0, position.lots - closingLots).toFixed(2)} lots
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
              disabled={submitting}
              className="btn-primary text-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              {submitting ? 'Executing...' : `Close ${closingLots} Lots`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

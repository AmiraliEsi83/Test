import React, { useState } from 'react';
import { Position, formatPrice } from '@harsi/shared';
import { X, Check } from 'lucide-react';

interface ModifyPositionModalProps {
  position: Position | null;
  onClose: () => void;
  onSave: (id: string, sl?: number, tp?: number) => Promise<void>;
}

export const ModifyPositionModal: React.FC<ModifyPositionModalProps> = ({
  position,
  onClose,
  onSave,
}) => {
  if (!position) return null;

  const [sl, setSl] = useState<string>(position.stopLoss ? String(position.stopLoss) : '');
  const [tp, setTp] = useState<string>(position.takeProfit ? String(position.takeProfit) : '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(
        position.id,
        sl ? parseFloat(sl) : undefined,
        tp ? parseFloat(tp) : undefined
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-5 max-w-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
          <h3 className="text-sm font-bold text-white">
            Modify Position · {position.symbol} ({position.side})
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="text-xs font-mono text-slate-400">
            Entry: {formatPrice(position.symbol, position.entryPrice)} | Current:{' '}
            {formatPrice(position.symbol, position.currentPrice)}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Stop Loss</label>
            <input
              type="number"
              step="0.0001"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder="Stop loss price"
              className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Take Profit</label>
            <input
              type="number"
              step="0.0001"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              placeholder="Take profit price"
              className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
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
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Update Levels'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

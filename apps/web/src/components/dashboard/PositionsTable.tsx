import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Position, formatPrice } from '@harsi/shared';
import { X, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Edit2 } from 'lucide-react';

interface PositionsTableProps {
  onPartialClose?: (pos: Position) => void;
  onModify?: (pos: Position) => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ onPartialClose, onModify }) => {
  const { positions, closePosition } = useTrading();
  const [closingId, setClosingId] = useState<string | null>(null);

  const handleClose = async (id: string) => {
    setClosingId(id);
    try {
      await closePosition(id);
    } finally {
      setClosingId(null);
    }
  };

  if (!positions.length) {
    return (
      <div className="terminal-card p-8 text-center bg-[#0e131d]">
        <div className="text-slate-500 text-sm">No open positions</div>
        <div className="text-xs text-slate-600 mt-1">
          Submit an order via the Order Ticket or wait for an automated strategy signal.
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-card overflow-x-auto bg-[#0e131d]">
      <table className="terminal-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Side</th>
            <th>Size</th>
            <th>Entry</th>
            <th>Current</th>
            <th>Stop Loss</th>
            <th>Take Profit</th>
            <th>P/L ($)</th>
            <th>Strategy</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const isLong = pos.side === 'LONG';
            const isProfit = pos.unrealizedPnl >= 0;

            return (
              <tr key={pos.id} className="font-mono text-xs">
                {/* Asset */}
                <td className="font-bold text-white flex items-center gap-1.5 py-3">
                  <span>{pos.symbol}</span>
                  <span className="badge-paper text-[10px]">PAPER</span>
                </td>

                {/* Side */}
                <td>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      isLong ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {pos.side}
                  </span>
                </td>

                {/* Lots */}
                <td className="text-slate-200">{pos.lots} lots</td>

                {/* Entry Price */}
                <td className="text-slate-300">{formatPrice(pos.symbol, pos.entryPrice)}</td>

                {/* Current Price */}
                <td className="text-white font-bold">{formatPrice(pos.symbol, pos.currentPrice)}</td>

                {/* Stop Loss */}
                <td className="text-rose-400">{formatPrice(pos.symbol, pos.stopLoss) || '—'}</td>

                {/* Take Profit */}
                <td className="text-emerald-400">{formatPrice(pos.symbol, pos.takeProfit) || '—'}</td>

                {/* P/L */}
                <td className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                  <span className="text-[10px] ml-1 text-slate-500">
                    ({pos.unrealizedPnlPips > 0 ? '+' : ''}{pos.unrealizedPnlPips.toFixed(1)}p)
                  </span>
                </td>

                {/* Strategy */}
                <td>
                  <span className="text-slate-400 text-[11px] capitalize">
                    {pos.strategyId ? pos.strategyId.replace('-', ' ') : 'Manual Ticket'}
                  </span>
                </td>

                {/* Actions */}
                <td>
                  <div className="flex items-center gap-1.5">
                    {onModify && (
                      <button
                        onClick={() => onModify(pos)}
                        title="Modify Stop Loss / Take Profit"
                        className="p-1 rounded bg-[#1b2333] hover:bg-[#253046] text-slate-300 hover:text-white transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onPartialClose && (
                      <button
                        onClick={() => onPartialClose(pos)}
                        title="Partial Close (e.g. 50%)"
                        className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold hover:bg-indigo-500/30 transition"
                      >
                        Partial
                      </button>
                    )}

                    <button
                      onClick={() => handleClose(pos.id)}
                      disabled={closingId === pos.id}
                      className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold hover:bg-rose-500/30 transition flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      {closingId === pos.id ? '...' : 'Close'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

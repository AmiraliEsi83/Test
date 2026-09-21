import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { getInstrument, formatPrice } from '@harsi/shared';
import { ArrowUpRight, ArrowDownRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const OrderTicket: React.FC = () => {
  const { symbol, lastTick, placeOrder } = useTrading();
  const inst = getInstrument(symbol);

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [lots, setLots] = useState<number>(0.5);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentPrice = lastTick?.price || inst.basePrice;
  const estimatedMargin = Math.round(lots * 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const order = await placeOrder({
        symbol,
        side,
        type: orderType,
        lots: Number(lots),
        price: currentPrice,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      });

      setSuccess(`Paper order filled: ${side} ${lots} ${symbol} @ ${order.filledPrice}`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="terminal-card p-3 bg-[#0e131d] h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1b2232]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Order Ticket · {symbol}
          </span>
          <span className="text-xs font-mono font-bold text-white">
            {formatPrice(symbol, currentPrice)}
          </span>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-rose-500/15 border border-rose-500/30 rounded text-xs text-rose-300 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-3 p-2 bg-emerald-500/15 border border-emerald-500/30 rounded text-xs text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Side Selector (BUY / SELL) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                side === 'BUY'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-[#141a27] text-slate-400 hover:text-white border border-[#1e2638]'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              BUY / LONG
            </button>

            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                side === 'SELL'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-[#141a27] text-slate-400 hover:text-white border border-[#1e2638]'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              SELL / SHORT
            </button>
          </div>

          {/* Lots Size */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Position Size (Lots)</span>
              <span className="font-mono text-slate-300">{lots} Lots</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[0.1, 0.2, 0.5, 1.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLots(val)}
                  className={`py-1 text-xs font-mono rounded border transition ${
                    lots === val
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                      : 'bg-[#131824] text-slate-400 border-[#1e2638]'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="20"
              value={lots}
              onChange={(e) => setLots(parseFloat(e.target.value) || 0.1)}
              className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* SL / TP Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Stop Loss</label>
              <input
                type="number"
                step="0.0001"
                placeholder="Optional"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-[#121622] border border-[#1e2638] rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Take Profit</label>
              <input
                type="number"
                step="0.0001"
                placeholder="Optional"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full bg-[#121622] border border-[#1e2638] rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Summary / Estimates */}
          <div className="p-2.5 rounded bg-[#0b0e14] border border-[#171e2c] space-y-1 text-[11px] font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Req. Margin:</span>
              <span className="text-white">${estimatedMargin}</span>
            </div>
            <div className="flex justify-between">
              <span>Execution Mode:</span>
              <span className="text-indigo-400 font-bold">PAPER DESK</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded font-bold text-xs uppercase tracking-wider transition ${
              side === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {loading ? 'Executing...' : `Execute ${side} ${lots} ${symbol}`}
          </button>
        </form>
      </div>
    </div>
  );
};

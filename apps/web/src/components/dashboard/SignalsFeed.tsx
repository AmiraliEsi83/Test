import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Signal, formatPrice } from '@harsi/shared';
import { Radio, ArrowUpRight, ArrowDownRight, Info, Play } from 'lucide-react';

export const SignalsFeed: React.FC = () => {
  const { signals, setSelectedSignal, placeOrder } = useTrading();

  const handleExecute = async (sig: Signal) => {
    try {
      await placeOrder({
        symbol: sig.symbol,
        side: sig.side,
        type: 'MARKET',
        lots: 0.5,
        price: sig.price,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit,
        strategyId: sig.strategyId,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="terminal-card overflow-hidden flex flex-col bg-[#0e131d]">
      <div className="px-3 py-2.5 border-b border-[#1e2638] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Institutional Signal Radar
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {signals.length} Signals
        </span>
      </div>

      <div className="divide-y divide-[#171e2c] overflow-y-auto max-h-[380px]">
        {!signals.length ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Awaiting session triggers... Signals will display here in real time.
          </div>
        ) : (
          signals.map((sig) => {
            const isBuy = sig.side === 'BUY';

            return (
              <div
                key={sig.id}
                className="p-3 hover:bg-[#131924] transition flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold font-mono px-1.5 py-0.5 rounded text-[11px] flex items-center gap-0.5 ${
                        isBuy ? 'badge-buy' : 'badge-sell'
                      }`}
                    >
                      {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {sig.side}
                    </span>
                    <span className="font-bold text-white font-mono">{sig.symbol}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {sig.timeframe} · {sig.strategyName}
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400 font-mono flex items-center gap-3">
                    <span>Entry: {formatPrice(sig.symbol, sig.entry)}</span>
                    <span className="text-rose-400">SL: {formatPrice(sig.symbol, sig.stopLoss)}</span>
                    <span className="text-emerald-400">TP: {formatPrice(sig.symbol, sig.takeProfit)}</span>
                    <span className="text-slate-500">R:R {sig.riskReward}</span>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                    {sig.reason}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setSelectedSignal(sig)}
                    className="p-1.5 rounded bg-[#1b2333] hover:bg-[#253046] text-slate-300 hover:text-white transition"
                    title="View Algorithm Explanation"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleExecute(sig)}
                    className="px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-600/30 transition flex items-center gap-1"
                    title="Execute Paper Order"
                  >
                    <Play className="w-3 h-3" />
                    Trade
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

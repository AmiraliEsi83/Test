import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { INSTRUMENT_LIST, formatPrice } from '@harsi/shared';
import { Bookmark, TrendingUp } from 'lucide-react';

export const Watchlist: React.FC = () => {
  const { symbol, setSymbol, lastTick } = useTrading();

  return (
    <div className="terminal-card overflow-hidden flex flex-col h-full bg-[#0e131d]">
      <div className="px-3 py-2.5 border-b border-[#1e2638] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Market Watchlist
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">8 Instruments</span>
      </div>

      <div className="divide-y divide-[#171e2c] overflow-y-auto max-h-[380px]">
        {INSTRUMENT_LIST.map((inst) => {
          const isSelected = symbol === inst.symbol;
          const currentPrice =
            isSelected && lastTick?.price ? lastTick.price : inst.basePrice;

          return (
            <button
              key={inst.symbol}
              onClick={() => setSymbol(inst.symbol)}
              className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition ${
                isSelected
                  ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                  : 'hover:bg-[#131924]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold text-xs ${
                      isSelected ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    {inst.label}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1c2436] text-slate-400 uppercase">
                    {inst.kind}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Spread: {inst.spread}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-xs font-bold text-white">
                  {formatPrice(inst.symbol, currentPrice)}
                </div>
                <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-end gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" />
                  +0.35%
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

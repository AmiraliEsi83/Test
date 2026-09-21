import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { TrendingUp, TrendingDown, DollarSign, Shield, Percent } from 'lucide-react';

export const PortfolioSummary: React.FC = () => {
  const { account, positions } = useTrading();

  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const isPositiveUnrealized = totalUnrealized >= 0;
  const isPositiveToday = account.todayPnl >= 0;

  return (
    <div className="terminal-card p-3 bg-[#0e131d]">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1b2232]">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Portfolio Health & Margins
          </span>
          <span className="badge-paper text-[10px]">PAPER ACCOUNT</span>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Open Positions: <span className="font-bold text-white">{positions.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {/* Equity */}
        <div className="bg-[#121722] p-2.5 rounded border border-[#1e2638]">
          <div className="text-[11px] font-medium text-slate-400">Equity</div>
          <div className="text-sm font-bold font-mono text-white mt-0.5">
            ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Balance */}
        <div className="bg-[#121722] p-2.5 rounded border border-[#1e2638]">
          <div className="text-[11px] font-medium text-slate-400">Cash Balance</div>
          <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
            ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Buying Power */}
        <div className="bg-[#121722] p-2.5 rounded border border-[#1e2638]">
          <div className="text-[11px] font-medium text-slate-400">Buying Power</div>
          <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
            ${account.buyingPower.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
        </div>

        {/* Unrealized P/L */}
        <div className="bg-[#121722] p-2.5 rounded border border-[#1e2638]">
          <div className="text-[11px] font-medium text-slate-400">Unrealized P/L</div>
          <div
            className={`text-sm font-bold font-mono mt-0.5 flex items-center gap-1 ${
              isPositiveUnrealized ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositiveUnrealized ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isPositiveUnrealized ? '+' : ''}${totalUnrealized.toFixed(2)}
          </div>
        </div>

        {/* Realized P/L */}
        <div className="bg-[#121722] p-2.5 rounded border border-[#1e2638]">
          <div className="text-[11px] font-medium text-slate-400">Realized P/L</div>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
            +${account.realizedPnl.toFixed(2)}
          </div>
        </div>

        {/* Today's P/L */}
        <div className="bg-[#121722] p-2.5 rounded border border-[#1e2638]">
          <div className="text-[11px] font-medium text-slate-400">Today P/L</div>
          <div
            className={`text-sm font-bold font-mono mt-0.5 ${
              isPositiveToday ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositiveToday ? '+' : ''}${account.todayPnl.toFixed(2)}
          </div>
        </div>

        {/* Total Return */}
        <div className="bg-[#121722] p-2.5 rounded border border-[#1e2638]">
          <div className="text-[11px] font-medium text-slate-400">Total Return</div>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
            +{account.totalReturnPct.toFixed(2)}%
          </div>
        </div>

        {/* Open Risk */}
        <div className="bg-[#121722] p-2.5 rounded border border-[#1e2638]">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400" />
            Open Risk
          </div>
          <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
            {account.openRiskPct.toFixed(2)}%
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-[#121722] p-2.5 rounded border border-[#1e2638]">
          <div className="text-[11px] font-medium text-slate-400">Drawdown</div>
          <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
            {account.maxDrawdownPct.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
};

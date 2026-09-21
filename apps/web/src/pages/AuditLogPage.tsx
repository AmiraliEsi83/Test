import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Filter,
  Search,
  Activity,
} from 'lucide-react';
import { AuditLogEntry } from '@harsi/shared';

export const AuditLogPage: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = categoryFilter === 'ALL' ? '/api/audit' : `/api/audit?category=${categoryFilter}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [categoryFilter, token]);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.category.toLowerCase().includes(term)
    );
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'WARN':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'RISK':
        return 'text-rose-400';
      case 'ORDER':
      case 'TRADE':
        return 'text-emerald-400';
      case 'BROKER':
        return 'text-cyan-400';
      case 'AUTOMATION':
        return 'text-indigo-400';
      case 'AUTH':
        return 'text-amber-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#080b10] flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Algorithmic Execution & Risk Audit Trail
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Cryptographically timestamped ledger tracking every automated order submission, risk limit verification, broker sync, and system event.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121622] text-slate-300 border border-[#1e2638] text-xs hover:text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Log
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="terminal-card p-4 bg-[#0e131d] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search audit actions, details, rule triggers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#121622] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#121622] p-1 rounded border border-[#1e2638] text-xs">
            {['ALL', 'RISK', 'ORDER', 'BROKER', 'AUTOMATION', 'AUTH', 'SYSTEM'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded font-semibold text-[11px] transition ${
                  categoryFilter === cat
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Table */}
        <div className="terminal-card bg-[#0e131d] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>LEVEL</th>
                  <th>CATEGORY</th>
                  <th>ACTION EVENT</th>
                  <th>DETAILS & EXECUTION CONTEXT</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      No audit events matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#121724]">
                      <td className="font-mono text-slate-400 text-xs whitespace-nowrap">
                        {new Date(log.timestamp || (log as any).createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getLevelBadge(
                            log.level
                          )}`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td>
                        <span className={`font-mono text-xs font-bold ${getCategoryColor(log.category)}`}>
                          {log.category}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-white font-semibold">
                        {log.action}
                      </td>
                      <td className="font-mono text-xs text-slate-300 max-w-xl break-words">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, UserCheck, Shield } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, quickDemoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role: 'TRADER' | 'PRO') => {
    setError(null);
    setLoading(true);
    try {
      await quickDemoLogin(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0f] flex items-center justify-center p-4">
      <div className="terminal-card p-8 max-w-md w-full bg-[#0d121c] border-[#1e273a] shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 mx-auto mb-3">
            H
          </div>
          <h1 className="text-xl font-bold text-white">Sign In to HARSI Terminal</h1>
          <p className="text-xs text-slate-400 mt-1">
            Access live markets, algorithms, and paper trading desk
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-[#111724] border border-[#1e2638] rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-emerald-400 hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#111724] border border-[#1e2638] rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Demo Logins for frictionless testing */}
        <div className="mt-6 pt-6 border-t border-[#1a2334]">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
            Quick Testing Accounts
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemo('TRADER')}
              disabled={loading}
              className="p-2 rounded bg-[#131926] hover:bg-[#1a2336] border border-[#232f48] text-left transition"
            >
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                Trader Plan
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">trader@harsi.ai</div>
            </button>

            <button
              onClick={() => handleDemo('PRO')}
              disabled={loading}
              className="p-2 rounded bg-[#131926] hover:bg-[#1a2336] border border-[#232f48] text-left transition"
            >
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                Pro Plan
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">pro@harsi.ai</div>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-emerald-400 font-bold hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};

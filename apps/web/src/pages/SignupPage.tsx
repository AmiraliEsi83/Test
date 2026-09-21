import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ArrowRight } from 'lucide-react';
import { SubscriptionTier } from '@harsi/shared';

export const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<SubscriptionTier>('TRADER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(name, email, password, plan);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
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
          <h1 className="text-xl font-bold text-white">Create Institutional Account</h1>
          <p className="text-xs text-slate-400 mt-1">
            Access algorithmic strategy alerts and paper trading
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Amirali"
                className="w-full bg-[#111724] border border-[#1e2638] rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

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
            <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
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

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Initial Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as any)}
              className="w-full bg-[#111724] border border-[#1e2638] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="FREE">Free Starter ($0/mo)</option>
              <option value="TRADER">Trader Pro ($49/mo - Recommended)</option>
              <option value="PRO">Institutional Pro ($149/mo)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 mt-2"
          >
            <span>{loading ? 'Creating Account...' : 'Get Started'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

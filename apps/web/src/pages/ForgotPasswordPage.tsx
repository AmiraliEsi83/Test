import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#070a0f] flex items-center justify-center p-4">
      <div className="terminal-card p-8 max-w-md w-full bg-[#0d121c] border-[#1e273a] shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter your email to receive password reset instructions
          </p>
        </div>

        {submitted ? (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-xs font-bold text-white">Reset Email Dispatched</div>
            <p className="text-xs text-slate-300">
              If an account with <span className="font-mono text-emerald-400">{email}</span> exists, you will receive a secure recovery link.
            </p>
            <div className="pt-3">
              <Link to="/login" className="btn-primary text-xs inline-block">
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Account Email</label>
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

            <button
              type="submit"
              className="w-full btn-primary py-2.5 text-xs font-bold mt-2"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

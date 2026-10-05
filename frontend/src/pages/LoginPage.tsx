import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  Trophy,
  Shield,
  Users,
  User,
  Gavel,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  Sparkles,
  KeyRound
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const isProduction = import.meta.env.VITE_APP_MODE === 'production';

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      error('Please enter both username/email and password');
      return;
    }
    try {
      setLoading(true);
      const user = await login(email, password);
      success(`Welcome back, ${user.name}!`);

      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'TEAM_LEADER') navigate('/team');
      else if (user.role === 'JUDGE') navigate('/judge');
      else if (user.role === 'PARTICIPANT') navigate('/participant');
      else navigate('/');
    } catch (err: any) {
      error(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen w-full bg-[#070908] text-white flex flex-col justify-between overflow-x-hidden font-bento select-none relative">
      {/* Dynamic Ambient Gold Bokeh Background */}
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-radial from-amber-500/5 via-transparent to-black/80 pointer-events-none" />

      {/* Top Header */}
      <header className="w-full z-20 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md shrink-0">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Sparkles className="w-4 h-4 text-slate-950 font-bold" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm sm:text-base tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400">
              ESPERANZA 9.0
            </span>
            <span className="text-[9px] text-amber-400/80 font-bold tracking-widest uppercase -mt-0.5">
              Nexus Veritatis
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Login Card Centerpiece */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center relative z-10">
        <div className="bg-black/60 rounded-3xl p-6 sm:p-8 border border-amber-500/30 backdrop-blur-xl shadow-2xl shadow-amber-500/10 space-y-6">
          
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-500 items-center justify-center shadow-lg shadow-amber-500/20 mb-1">
              <Lock className="w-7 h-7 text-slate-950" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Portal Access
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Festival Competition Management System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-amber-300/80 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-amber-400/60" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin, diraya, judge1..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:bg-black/40 focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-amber-300/80 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-amber-400/60" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:bg-black/40 focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials (Hidden in Production Mode) */}
          {!isProduction && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
                Development Role Tokens (1-Click Fill)
              </p>

              {/* Core Roles */}
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => quickLogin('admin', 'admin123')}
                  className="flex flex-col p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 hover:border-amber-400/30 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Shield className="w-3 h-3 text-rose-400" />
                    <span className="font-bold text-[11px]">Admin</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => quickLogin('diraya', 'diraya123')}
                  className="flex flex-col p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 hover:border-amber-400/30 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Users className="w-3 h-3 text-emerald-400" />
                    <span className="font-bold text-[11px]">Diraya</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">diraya</span>
                </button>

                <button
                  type="button"
                  onClick={() => quickLogin('rivaya', 'rivaya123')}
                  className="flex flex-col p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 hover:border-amber-400/30 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Users className="w-3 h-3 text-amber-400" />
                    <span className="font-bold text-[11px]">Rivaya</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">rivaya</span>
                </button>
              </div>

              {/* Judges */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => quickLogin('judge1', 'judge123')}
                  className="flex flex-col p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 hover:border-amber-400/30 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Gavel className="w-3 h-3 text-purple-400" />
                    <span className="font-bold text-[11px]">Stage Judge</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">judge1</span>
                </button>

                <button
                  type="button"
                  onClick={() => quickLogin('offjudge', 'offjudge123')}
                  className="flex flex-col p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 hover:border-amber-400/30 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Gavel className="w-3 h-3 text-indigo-400" />
                    <span className="font-bold text-[11px]">Off-Stage Judge</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">offjudge</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full z-20 px-4 sm:px-6 py-2 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="text-amber-400 font-bold">Project Council.</span>
          <span>ESPERANZA 9.0</span>
        </div>
        <div className="text-[9px] text-slate-400 tracking-wide font-medium">
          ASHARIYYA DA'WA STUDENTS ASSOCIATION
        </div>
      </footer>
    </div>
  );
};

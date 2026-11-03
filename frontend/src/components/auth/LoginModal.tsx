import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { THEME } from '../../theme/theme.js';
import {
  X,
  Mail,
  KeyRound,
  ArrowRight,
  Shield,
  Users,
  Gavel,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
      onClose();

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

  const selectRoleShortcut = (username: string) => {
    setEmail(username);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-[#0A0A0A] rounded-3xl border border-white/[0.12] shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-6 sm:p-7 overflow-hidden z-10 font-bento text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-20"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Brand Header */}
        <div className="text-center space-y-2 mb-6 relative z-10">
          <img
            src="/assets/esperanza-logo.png"
            alt="Esperanza Emblem"
            className="h-12 sm:h-14 w-auto object-contain mx-auto drop-shadow-[0_0_16px_rgba(245,158,11,0.4)] mb-1"
          />
          <img
            src="/assets/esperanza-font-logo.png"
            alt="ESPERANZA"
            className="h-5 sm:h-6 w-auto object-contain mx-auto drop-shadow-[0_2px_12px_rgba(245,158,11,0.35)] select-none"
          />
          <div className="pt-1">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Portal Access
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Festival Competition Management System
            </p>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-3.5 relative z-10">
          <div>
            <label className="block text-[11px] font-bold text-amber-300/80 uppercase tracking-wider mb-1">
              Username or Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-amber-400/60" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin, diraya, judge1..."
                className="w-full pl-10 pr-4 py-2 bg-white/[0.06] border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:bg-black/50 focus:ring-1 focus:ring-amber-400 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-300/80 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-2.5 w-4 h-4 text-amber-400/60" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2 bg-white/[0.06] border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:bg-black/50 focus:ring-1 focus:ring-amber-400 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${THEME.classes.primaryBtn} py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50`}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Role Shortcuts (Fills username only) */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] relative z-10">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 text-center">
            Role Shortcuts
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => selectRoleShortcut('admin')}
              className="p-1.5 rounded-lg bg-[#121212] hover:bg-white/10 text-slate-200 border border-white/[0.08] hover:border-amber-400/30 transition-all font-semibold cursor-pointer truncate"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => selectRoleShortcut('diraya')}
              className="p-1.5 rounded-lg bg-[#121212] hover:bg-white/10 text-[#00E676] border border-white/[0.08] hover:border-[#00E676]/40 transition-all font-bold cursor-pointer truncate"
            >
              Diraya
            </button>
            <button
              type="button"
              onClick={() => selectRoleShortcut('rivaya')}
              className="p-1.5 rounded-lg bg-[#121212] hover:bg-white/10 text-[#FF2A6D] border border-white/[0.08] hover:border-[#FF2A6D]/40 transition-all font-bold cursor-pointer truncate"
            >
              Rivaya
            </button>
            <button
              type="button"
              onClick={() => selectRoleShortcut('judge1')}
              className="p-1.5 rounded-lg bg-[#121212] hover:bg-white/10 text-amber-300 border border-white/[0.08] hover:border-amber-400/30 transition-all font-semibold cursor-pointer truncate"
            >
              Stage Judge
            </button>
            <button
              type="button"
              onClick={() => selectRoleShortcut('offjudge')}
              className="p-1.5 rounded-lg bg-[#121212] hover:bg-white/10 text-amber-300 border border-white/[0.08] hover:border-amber-400/30 transition-all font-semibold cursor-pointer truncate col-span-2"
            >
              Off-Stage Judge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

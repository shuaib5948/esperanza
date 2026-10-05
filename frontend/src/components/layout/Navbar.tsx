import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Trophy,
  LogOut,
  User as UserIcon,
  Shield,
  Radio,
  CheckCircle,
  Menu,
  Search,
  Calendar,
  Bell,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isPublic?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isPublic = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPortalHome = () => {
    if (!user) return '/';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'TEAM_LEADER') return '/team';
    if (user.role === 'JUDGE') return '/judge';
    return '/';
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <header
      className={`sticky top-0 z-30 w-full transition-colors ${
        isPublic
          ? 'bg-[#ffffc5]/85 border-b border-amber-200/70 backdrop-blur-xl shadow-xs'
          : isAdmin
          ? 'bg-[#F8FAFC]/90 border-b border-slate-200/80 backdrop-blur-md lg:pl-64'
          : 'glass-panel border-b border-slate-800 bg-slate-900/80'
      }`}
    >
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        <div className="flex items-center gap-3">
          {user && user.role !== 'JUDGE' && (
            <button
              onClick={onToggleSidebar}
              className={`p-2 rounded-lg ${
                isAdmin
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60 lg:hidden'
                  : isPublic
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 lg:hidden'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Logo on mobile or non-admin portals */}
          {(!isAdmin || !user) && (
            <Link to={getPortalHome()} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#007AFF] via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div>
                <span
                  className={`font-display font-black text-base tracking-wider ${
                    isPublic
                      ? 'text-slate-900'
                      : 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-purple-200'
                  }`}
                >
                  ESPERANZA
                </span>
                <span
                  className={`hidden sm:inline-block ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isPublic
                      ? 'text-[#007AFF] bg-blue-50 border-blue-100'
                      : 'text-indigo-400 bg-indigo-950/60 border-indigo-800/40'
                  }`}
                >
                  2026–27
                </span>
              </div>
            </Link>
          )}

          {/* Admin Modern Search Bar */}
          {isAdmin && (
            <div className="relative w-72 sm:w-80 md:w-96 cursor-pointer">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                readOnly
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                placeholder="Search events, participants, teams..."
                className="w-full pl-10 pr-12 py-2 text-xs font-medium rounded-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:outline-hidden focus:border-emerald-600 shadow-2xs cursor-pointer transition-all"
              />
              <kbd
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm pointer-events-none"
              >
                ⌘ K
              </kbd>
            </div>
          )}
        </div>

        {/* Public navigation shortcuts */}
        {!user && (
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                isPublic
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>Home</span>
            </Link>
            <Link
              to="/schedule"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                isPublic
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>Schedule</span>
            </Link>
            <Link
              to="/leaderboard"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                isPublic
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Leaderboard</span>
            </Link>
            <Link
              to="/verify"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                isPublic
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle className={`w-3.5 h-3.5 ${isPublic ? 'text-[#007AFF]' : 'text-indigo-400'}`} />
              <span>Verify</span>
            </Link>
          </div>
        )}

        {/* Admin Right Elements */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            {/* Festival Date Pill */}
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 text-xs text-slate-700 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <div className="flex flex-col text-left leading-tight">
                <span className="font-bold text-[11px] text-slate-800">Fri, 10 Oct 2026</span>
                <span className="text-[9px] text-slate-400 font-medium">Esperanza Cultural Fest</span>
              </div>
            </div>

            {/* Notification Bell */}
            <button
              title="Notifications"
              className="w-9 h-9 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 relative shadow-2xs transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 border-2 border-white" />
            </button>

            {/* User Dropdown Pill */}
            <div className="flex items-center gap-2 pl-1 cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-[#064E3B] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-800">{user.name || 'Admin'}</span>
                <span className="text-[10px] text-slate-400 font-medium">Festival Administrator</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </div>
          </div>
        )}

        {/* Non-Admin User State */}
        {!isAdmin && (
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className={`text-sm font-semibold ${isPublic ? 'text-slate-800' : 'text-slate-200'}`}>
                    {user.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors border border-transparent hover:border-rose-900/50"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0D472D] hover:bg-[#07321e] shadow-md transition-all cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Portal Login</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

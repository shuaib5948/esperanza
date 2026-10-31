import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { THEME } from '../../theme/theme.js';
import {
  Trophy,
  LogOut,
  User as UserIcon,
  Shield,
  Menu,
  Search,
  Calendar,
  Bell,
  ChevronDown,
  Home,
  Award,
  Camera,
  BookOpen,
  X,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isPublic?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isPublic = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
  const isDarkHome = isPublic && location.pathname === '/';

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (id === 'home' || id === 'hero') {
      if (location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate('/');
      }
      return;
    }

    if (location.pathname === '/') {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <header
      className={`w-full transition-all ${
        isDarkHome
          ? 'absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-[#070503]/90 via-[#070503]/40 to-transparent border-b border-amber-500/15'
          : isPublic
          ? 'sticky top-0 z-30 bg-[#ffffc5]/85 border-b border-amber-200/70 backdrop-blur-xl shadow-xs'
          : isAdmin
          ? 'sticky top-0 z-30 bg-[#F8FAFC]/90 border-b border-slate-200/80 backdrop-blur-md lg:pl-64'
          : 'sticky top-0 z-30 glass-panel border-b border-slate-800 bg-slate-900/80'
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
                  : isDarkHome
                  ? 'text-slate-300 hover:text-white hover:bg-white/10 lg:hidden'
                  : isPublic
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 lg:hidden'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Professional & Classic Text Logo with Original Emblem in Corner */}
          {(!isAdmin || !user) && (
            <Link
              to={getPortalHome()}
              className="flex items-center gap-2.5 sm:gap-3 group select-none transition-transform duration-300 hover:scale-[1.01]"
              title="Esperanza 9.0"
            >
              {/* Original Geometric Emblem */}
              <div className="relative flex items-center justify-center shrink-0">
                <img
                  src="/assets/esperanza-logo.png"
                  alt="Esperanza Emblem"
                  className={`h-7 sm:h-8 w-auto object-contain transition-all duration-300 group-hover:scale-105 ${
                    isDarkHome
                      ? 'drop-shadow-[0_2px_12px_rgba(245,158,11,0.35)]'
                      : 'brightness-0 opacity-85'
                  }`}
                />
              </div>

              {/* Classic Horizontal Text Logo */}
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span
                  className={`font-display font-black text-sm sm:text-base tracking-[0.2em] uppercase transition-colors ${
                    isDarkHome
                      ? 'text-white group-hover:text-amber-100'
                      : isPublic
                      ? 'text-slate-900'
                      : 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-purple-200'
                  }`}
                >
                  ESPERANZA
                </span>
                <span
                  className={`text-xs sm:text-sm font-black tracking-widest transition-colors ${
                    isDarkHome
                      ? 'text-amber-400 drop-shadow-[0_1px_8px_rgba(245,158,11,0.5)] group-hover:text-amber-300'
                      : isPublic
                      ? 'text-amber-600'
                      : 'text-amber-400'
                  }`}
                >
                  9.0
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

        {/* Public In-Page Navigation: Home, Standings, Results, Gallery */}
        {!user && (
          <nav aria-label="Main Navigation" className="hidden md:flex items-center">
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-xs">
              <button
                onClick={() => scrollToSection('home')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer ${
                  isDarkHome
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Home className="w-3.5 h-3.5 text-amber-400" />
                <span>Home</span>
              </button>

              <button
                onClick={() => scrollToSection('about')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer ${
                  isDarkHome
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Manifesto</span>
              </button>

              <button
                onClick={() => scrollToSection('standings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer ${
                  isDarkHome
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Standings</span>
              </button>

              <button
                onClick={() => scrollToSection('results')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer ${
                  isDarkHome
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Results</span>
              </button>

              <button
                onClick={() => scrollToSection('gallery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer ${
                  isDarkHome
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Gallery</span>
              </button>
            </div>
          </nav>
        )}

        {/* Admin Right Elements */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            {/* Festival Date Pill */}
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 text-xs text-slate-700 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
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
              <div className={`w-9 h-9 rounded-full ${THEME.classes.avatarCircle} flex items-center justify-center font-black text-xs shadow-xs`}>
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
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs ${THEME.classes.primaryBtn} transition-all transform hover:scale-[1.02] cursor-pointer`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Portal Login</span>
                  <span className="sm:hidden">Login</span>
                </Link>

                {/* Mobile Menu Toggle Button */}
                {isDarkHome && (
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 md:hidden transition-colors"
                    aria-label="Toggle navigation menu"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Slide-down Navigation Panel for Public Homepage */}
      {isDarkHome && mobileMenuOpen && !user && (
        <div className="md:hidden w-full bg-[#070503]/95 backdrop-blur-2xl border-b border-amber-500/20 px-5 py-4 flex flex-col gap-1.5 transition-all shadow-2xl">
          <button
            onClick={() => scrollToSection('home')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-400 hover:bg-white/5 transition-all text-left"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>[00] HOME</span>
          </button>
          <button
            onClick={() => scrollToSection('about')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-400 hover:bg-white/5 transition-all text-left"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>[01] MANIFESTO</span>
          </button>
          <button
            onClick={() => scrollToSection('standings')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-400 hover:bg-white/5 transition-all text-left"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>[02] TEAM STANDINGS</span>
          </button>
          <button
            onClick={() => scrollToSection('results')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-400 hover:bg-white/5 transition-all text-left"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>[03] RESULT POSTERS</span>
          </button>
          <button
            onClick={() => scrollToSection('gallery')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-400 hover:bg-white/5 transition-all text-left"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>[04] FESTIVAL GALLERY</span>
          </button>
        </div>
      )}
    </header>
  );
};

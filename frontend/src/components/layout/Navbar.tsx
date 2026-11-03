import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { THEME } from '../../theme/theme.js';
import { LoginModal } from '../auth/LoginModal.js';
import {
  Trophy,
  LogOut,
  User as UserIcon,
  Menu,
  ChevronDown,
  Home,
  Award,
  Camera,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isPublic?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isPublic = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-open login modal if ?login=true query param is present
  useEffect(() => {
    if (searchParams.get('login') === 'true') {
      setLoginModalOpen(true);
    }
  }, [searchParams]);

  // Support global open-login-modal custom event
  useEffect(() => {
    const handleOpenModal = () => setLoginModalOpen(true);
    window.addEventListener('open-login-modal', handleOpenModal);
    return () => window.removeEventListener('open-login-modal', handleOpenModal);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCloseLoginModal = () => {
    setLoginModalOpen(false);
    if (searchParams.get('login') === 'true') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('login');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    logout();
    navigate('/');
  };

  const getRoleInfo = () => {
    if (!user) return { label: 'Portal', path: '/', avatarBg: 'bg-amber-400 text-slate-950 font-black', char: 'U' };
    if (user.role === 'ADMIN') {
      return {
        label: 'Admin Portal',
        path: '/admin',
        avatarBg: 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 font-black',
        char: user.name?.charAt(0).toUpperCase() || 'A',
      };
    }
    if (user.role === 'TEAM_LEADER') {
      const u = user as any;
      const isRivaya = u.team_code === 'RIVAYA' || u.teamCode === 'RIVAYA' || user.name?.toLowerCase().includes('rivaya') || user.email?.toLowerCase().includes('rivaya');
      return {
        label: isRivaya ? 'Team Rivaya' : 'Team Diraya',
        path: '/team',
        avatarBg: isRivaya ? 'bg-[#FF2A6D] text-white font-black' : 'bg-[#00E676] text-slate-950 font-black',
        char: isRivaya ? 'RV' : 'DR',
      };
    }
    if (user.role === 'JUDGE') {
      const isOff = user.name?.toLowerCase().includes('off') || user.email?.toLowerCase().includes('off');
      return {
        label: isOff ? 'Offstage Judge' : 'Stage Judge',
        path: '/judge',
        avatarBg: 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 font-black',
        char: isOff ? 'O' : 'S',
      };
    }
    return {
      label: 'Participant Portal',
      path: '/participant',
      avatarBg: 'bg-slate-700 text-white font-black',
      char: user.name?.charAt(0).toUpperCase() || 'P',
    };
  };

  const roleInfo = getRoleInfo();
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
    <>
      <header
        className={`w-full transition-all ${
          isDarkHome
            ? 'absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-[#040404]/90 via-[#040404]/40 to-transparent border-b border-white/[0.08]'
            : 'sticky top-0 z-30 bg-[#0A0A0A]/95 border-b border-white/[0.08] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.8)]'
        }`}
      >
        <div className="flex items-center justify-between px-4 lg:px-8 h-16">
          {/* Left: Brand Logo & Mobile Sidebar Toggle */}
          <div className="flex items-center gap-3">
            {user && user.role !== 'JUDGE' && onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-lg text-amber-200/60 hover:text-white hover:bg-white/10 lg:hidden transition-colors cursor-pointer"
                title="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Official Geometric Emblem & Font Logo */}
            <Link
              to={roleInfo.path}
              className="flex items-center gap-2.5 sm:gap-3 group select-none transition-transform duration-300 hover:scale-[1.01]"
              title="Esperanza 9.0"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <img
                  src="/assets/esperanza-logo.png"
                  alt="Esperanza Emblem"
                  className="h-7 sm:h-8 w-auto object-contain transition-all duration-300 group-hover:scale-105 drop-shadow-[0_2px_12px_rgba(245,158,11,0.35)]"
                />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <img
                  src="/assets/esperanza-font-logo.png"
                  alt="Esperanza"
                  className="h-4 sm:h-4.5 w-auto object-contain brightness-105"
                />
                <span className="text-xs sm:text-sm font-black font-mono tracking-widest text-amber-400">
                  9.0
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Public In-Page Navigation (Always identical on Home Screen) */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center">
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-[#0A0A0A]/90 border border-white/[0.08] backdrop-blur-md shadow-xs">
              <button
                onClick={() => scrollToSection('home')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer text-amber-100/70 hover:text-white hover:bg-white/10"
              >
                <Home className="w-3.5 h-3.5 text-amber-400" />
                <span>Home</span>
              </button>

              <button
                onClick={() => scrollToSection('about')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer text-amber-100/70 hover:text-white hover:bg-white/10"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Manifesto</span>
              </button>

              <button
                onClick={() => scrollToSection('standings')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer text-amber-100/70 hover:text-white hover:bg-white/10"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Standings</span>
              </button>

              <button
                onClick={() => scrollToSection('results')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer text-amber-100/70 hover:text-white hover:bg-white/10"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Results</span>
              </button>

              <button
                onClick={() => scrollToSection('gallery')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide transition-all cursor-pointer text-amber-100/70 hover:text-white hover:bg-white/10"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Gallery</span>
              </button>
            </div>
          </nav>

          {/* Right: Portal Button Place (Profile Icon & Text when Logged In • Login Button when Logged Out) */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center bg-[#121212] border border-white/[0.12] hover:border-amber-400/40 rounded-full p-1 transition-all shadow-xs group">
                  {/* Tap Profile Icon or Text -> Navigates to Respective Module */}
                  <button
                    type="button"
                    onClick={() => navigate(roleInfo.path)}
                    className="flex items-center gap-2 pl-1 pr-2.5 py-0.5 cursor-pointer text-left transition-opacity hover:opacity-90 select-none"
                    title={`Open ${roleInfo.label}`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs shadow-xs shrink-0 ${roleInfo.avatarBg}`}>
                      {roleInfo.char}
                    </div>
                    <div className="hidden sm:flex flex-col leading-tight min-w-0 pr-1">
                      <span className="text-xs font-bold text-white truncate max-w-[110px] sm:max-w-[140px]">
                        {user.name}
                      </span>
                      <span className="text-[10px] font-medium text-amber-300/80 truncate">
                        {roleInfo.label}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Button to Logout */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileDropdownOpen((prev) => !prev);
                    }}
                    className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border-l border-white/[0.08]"
                    title="Account Options"
                    aria-label="Account Options"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#0A0A0A] border border-white/[0.12] rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-white/[0.08]">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-amber-300 font-semibold">{roleInfo.label}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate(roleInfo.path);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left mt-1"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>Open {roleInfo.label}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Logout Account</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs ${THEME.classes.primaryBtn} transition-all transform hover:scale-[1.02] cursor-pointer`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Portal Login</span>
                  <span className="sm:hidden">Login</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Floating Bottom Navigation Island */}
        {isDarkHome && !user && (
          <nav
            aria-label="Mobile Bottom Navigation"
            className="fixed bottom-4 inset-x-3 z-50 md:hidden flex items-center justify-around py-2 px-1.5 rounded-full bg-[#121212]/92 backdrop-blur-2xl border border-amber-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_16px_rgba(245,158,11,0.2)] max-w-sm mx-auto select-none"
          >
            <button
              onClick={() => scrollToSection('home')}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold text-slate-300 hover:text-amber-400 active:scale-90 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>Home</span>
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold text-slate-300 hover:text-amber-400 active:scale-90 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Manifesto</span>
            </button>
            <button
              onClick={() => scrollToSection('standings')}
              className="flex items-center gap-0.5 px-2 py-1 text-[9px] font-bold text-slate-300 hover:text-amber-400 active:scale-90 transition-all cursor-pointer flex-col"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Standings</span>
            </button>
            <button
              onClick={() => scrollToSection('results')}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold text-slate-300 hover:text-amber-400 active:scale-90 transition-all cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Results</span>
            </button>
            <button
              onClick={() => scrollToSection('gallery')}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold text-slate-300 hover:text-amber-400 active:scale-90 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Gallery</span>
            </button>
          </nav>
        )}
      </header>

      {/* Global Login Modal Dialog */}
      <LoginModal isOpen={loginModalOpen} onClose={handleCloseLoginModal} />
    </>
  );
};

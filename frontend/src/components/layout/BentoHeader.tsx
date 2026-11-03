import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Calendar, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { THEME } from '../../theme/theme.js';

interface BentoHeaderProps {
  onToggleSidebar?: () => void;
}

const formatLiveDateTime = (date: Date) => {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  return `${weekday}, ${day} ${month} · ${time}`;
};

export const BentoHeader: React.FC<BentoHeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentDateTime, setCurrentDateTime] = useState<string>(() => formatLiveDateTime(new Date()));
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(formatLiveDateTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const isJudge = user?.role === 'JUDGE';
  const isAdmin = user?.role === 'ADMIN';

  const judgeDisplayName = isJudge
    ? (user?.name?.toLowerCase().includes('off') || user?.email?.toLowerCase().includes('off') ? 'Offstage Judge' : 'Stage Judge')
    : (user?.name || 'Administrator');

  const avatarChar = isJudge
    ? (judgeDisplayName.startsWith('Off') ? 'O' : 'S')
    : (user?.name ? user.name.charAt(0).toUpperCase() : 'A');

  return (
    <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-white/[0.08]">
      {/* Left: Mobile Toggle / Mobile Logo + Desktop Live Date Pill */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 rounded-xl transition-colors shrink-0 text-slate-400 hover:text-white hover:bg-white/5"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Mobile View: Official Esperanza Logo Lockup (Replaces date/time on mobile) */}
        <div className="flex sm:hidden items-center gap-2 select-none">
          <img
            src="/assets/esperanza-logo.png"
            alt="Esperanza"
            className="h-6 w-auto object-contain drop-shadow-[0_0_8px_rgba(245,158,11,0.35)] shrink-0"
          />
          <img
            src="/assets/esperanza-font-logo.png"
            alt="Esperanza"
            className="h-4 w-auto object-contain brightness-105"
          />
        </div>

        {/* Desktop View (>= sm): Judge Header Brand Lockup */}
        {isJudge && (
          <div className="hidden sm:flex items-center gap-2 pr-2 sm:pr-3 border-r border-white/[0.08] shrink-0">
            <img
              src="/assets/esperanza-logo.png"
              alt="Esperanza"
              className="h-6 w-auto object-contain drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]"
            />
            <img
              src="/assets/esperanza-font-logo.png"
              alt="Esperanza"
              className="h-3.5 w-auto object-contain brightness-105"
            />
          </div>
        )}

        {/* Desktop View (>= sm): Real-Time Live Date Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#121212] border border-white/[0.08] text-amber-200 shadow-inner">
          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>{currentDateTime}</span>
        </div>
      </div>

      {/* Right Header: Profile Dropdown */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Profile Pill with Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-1 cursor-pointer select-none rounded-full p-1 transition-colors hover:bg-white/5"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xs ${
              isJudge ? 'bg-amber-400 text-slate-950 font-black' : THEME.classes.avatarCircle
            }`}>
              {avatarChar}
            </div>
            <div className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-white">
                {judgeDisplayName}
              </span>
              <span className="text-[10px] font-medium text-amber-200/60">
                {isJudge ? 'Evaluation Panel' : (user?.email || 'Administrator')}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform text-amber-400/60 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl border border-white/[0.1] bg-[#0A0A0A] text-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 shadow-[0_10px_30px_rgba(0,0,0,0.9)]">
              <div className="p-2.5 border-b border-white/[0.08]">
                <p className="text-xs font-bold truncate text-white">
                  {judgeDisplayName}
                </p>
                <p className="text-[10px] font-medium truncate capitalize text-amber-300">
                  {isJudge ? 'Official Judge' : (user?.role?.toLowerCase() || 'User')}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors mt-1 cursor-pointer text-rose-400 hover:bg-rose-500/15"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Logout Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

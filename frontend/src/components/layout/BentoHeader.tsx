import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Calendar, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

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

  const judgeDisplayName = isJudge
    ? (user?.name?.toLowerCase().includes('off') || user?.email?.toLowerCase().includes('off') ? 'Offstage Judge' : 'Stage Judge')
    : (user?.name || 'Administrator');

  const avatarChar = isJudge
    ? (judgeDisplayName.startsWith('Off') ? 'O' : 'S')
    : (user?.name ? user.name.charAt(0).toUpperCase() : 'A');

  return (
    <div className={`flex items-center justify-between gap-4 pb-2.5 ${isJudge ? 'border-b border-white/15' : 'border-b border-slate-100'}`}>
      {/* Left: Mobile Toggle + Real-Time Live Date Pill */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`lg:hidden p-1.5 rounded-xl transition-colors shrink-0 ${
              isJudge ? 'text-emerald-200 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
          isJudge ? 'bg-white/10 border border-white/20 text-emerald-100 shadow-inner' : 'bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs'
        }`}>
          <Calendar className={`w-3.5 h-3.5 ${isJudge ? 'text-emerald-300' : 'text-[#0D472D]'}`} />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{currentDateTime}</span>
        </div>
      </div>

      {/* Right Header: Profile Dropdown */}
      <div className="flex items-center gap-2.5 shrink-0">

        {/* Profile Pill with Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className={`flex items-center gap-2 pl-1 cursor-pointer select-none rounded-full p-1 transition-colors ${
              isJudge ? 'hover:bg-white/10' : 'hover:bg-slate-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xs ${
              isJudge ? 'bg-white text-[#0D472D]' : 'bg-[#0D472D] text-white'
            }`}>
              {avatarChar}
            </div>
            <div className="hidden md:flex flex-col text-left leading-tight">
              <span className={`text-xs font-bold ${isJudge ? 'text-white' : 'text-slate-900'}`}>
                {judgeDisplayName}
              </span>
              <span className={`text-[10px] font-medium ${isJudge ? 'text-emerald-200/80' : 'text-slate-400'}`}>
                {isJudge ? 'Evaluation Panel' : (user?.email || 'Administrator')}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${profileOpen ? 'rotate-180' : ''} ${isJudge ? 'text-emerald-200' : 'text-slate-400'}`} />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
              isJudge ? 'bg-[#062919] border-emerald-700/60 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}>
              <div className={`p-2.5 border-b ${isJudge ? 'border-emerald-800/80' : 'border-slate-100'}`}>
                <p className={`text-xs font-bold truncate ${isJudge ? 'text-white' : 'text-slate-900'}`}>
                  {judgeDisplayName}
                </p>
                <p className={`text-[10px] font-medium truncate capitalize ${isJudge ? 'text-emerald-300/80' : 'text-slate-400'}`}>
                  {isJudge ? 'Official Judge' : (user?.role?.toLowerCase() || 'User')}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors mt-1 cursor-pointer ${
                  isJudge ? 'text-rose-300 hover:bg-rose-900/40' : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                <LogOut className={`w-4 h-4 ${isJudge ? 'text-rose-300' : 'text-rose-600'}`} />
                <span>Logout Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutGrid,
  CheckSquare,
  Radio,
  Calendar,
  Users,
  Gavel,
  Award,
  Sparkles,
  FileText,
  Megaphone,
  SlidersHorizontal,
  X,
  Tv,
  ArrowUpRight,
  UserCheck,
  ClipboardList,
  BarChart2,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user.role === 'ADMIN';
  const isTeamLeader = user.role === 'TEAM_LEADER';
  const isProduction = import.meta.env.VITE_APP_MODE === 'production';

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-3 xl:top-4 z-50 lg:z-20 h-screen lg:h-[calc(100vh-1.5rem)] xl:h-[calc(100vh-2rem)] w-60 xl:w-64 bg-white lg:rounded-[24px] p-4 flex flex-col justify-between shrink-0 shadow-2xs border border-slate-100/80 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto pr-1">
          {/* Brand Header: Text only with subtitle Ashariyya Da'wa Fest */}
          <div className="flex items-center justify-between px-2 py-1.5 mb-4">
            <div
              className="cursor-pointer"
              onClick={() => {
                navigate(isAdmin ? '/admin' : isTeamLeader ? '/team' : '/');
                onClose();
              }}
            >
              <h1 className="text-xl font-black text-[#0D472D] tracking-tight leading-none">
                Esperanza
              </h1>
              <p className="text-[10px] font-bold text-amber-700 tracking-wide mt-1">
                Ashariyya Da'wa Fest
              </p>
            </div>

            {/* Close Button on Mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links Group */}
          {isAdmin ? (
            <div className="space-y-4">
              {/* MENU Section */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1">
                  MENU
                </span>

                {/* Dashboard */}
                <NavLink
                  to="/admin"
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
                      <span>Dashboard</span>
                    </>
                  )}
                </NavLink>

                {/* Programmes */}
                <NavLink
                  to="/admin/competitions"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <div className="flex items-center gap-3">
                        <CheckSquare className="w-4 h-4" />
                        <span>Programmes</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#E6F4EA] text-[#0D472D]'
                        }`}
                      >
                        60
                      </span>
                    </>
                  )}
                </NavLink>

                {/* Schedule & Lineup */}
                <NavLink
                  to="/admin/schedule"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <Calendar className="w-4 h-4" />
                      <span>Schedule & Lineup</span>
                    </>
                  )}
                </NavLink>

                {/* Participants */}
                <NavLink
                  to="/admin/participants"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <UserCheck className="w-4 h-4" />
                      <span>Participants</span>
                    </>
                  )}
                </NavLink>

                {/* Stage Queue */}
                <NavLink
                  to="/admin/stage-queue"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <div className="flex items-center gap-3">
                        <Radio className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-600 animate-pulse'}`} />
                        <span>Stage Queue</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </>
                  )}
                </NavLink>

                {/* Leaderboard */}
                <NavLink
                  to="/admin/leaderboard"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <div className="flex items-center gap-3">
                        <BarChart2 className="w-4 h-4" />
                        <span>Leaderboard</span>
                      </div>
                      {isProduction && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Soon
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </div>

              {/* ACTIONS Section */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1">
                  ACTIONS
                </span>

                {/* Results */}
                <NavLink
                  to="/admin/results"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <Award className="w-4 h-4" />
                      <span>Results</span>
                    </>
                  )}
                </NavLink>

                {/* Announcements */}
                <NavLink
                  to="/admin/announcements"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <div className="flex items-center gap-3">
                        <Megaphone className="w-4 h-4" />
                        <span>Announcements</span>
                      </div>
                      {isProduction && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Soon
                        </span>
                      )}
                    </>
                  )}
                </NavLink>

                {/* Export CSVs */}
                <NavLink
                  to="/admin/reports"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4" />
                        <span>Export CSVs</span>
                      </div>
                      {isProduction && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Soon
                        </span>
                      )}
                    </>
                  )}
                </NavLink>

                {/* Audit Logs */}
                <NavLink
                  to="/admin/audit-logs"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                      )}
                      <div className="flex items-center gap-3">
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Audit Logs</span>
                      </div>
                      {isProduction && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Soon
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </div>
            </div>
          ) : isTeamLeader ? (
            /* TEAM LEADER MENU */
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1">
                TEAM PORTAL
              </span>
              <NavLink
                to="/team"
                end
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                    isActive
                      ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                    )}
                    <LayoutGrid className="w-4 h-4" />
                    <span>Team Overview</span>
                  </>
                )}
              </NavLink>

              <NavLink
                to="/team/roster"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                    isActive
                      ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                    )}
                    <Users className="w-4 h-4" />
                    <span>Team Roster</span>
                  </>
                )}
              </NavLink>

              <NavLink
                to="/team/registrations"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                    isActive
                      ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                    )}
                    <ClipboardList className="w-4 h-4" />
                    <span>Registrations</span>
                  </>
                )}
              </NavLink>

              <NavLink
                to="/team/announcements"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
                    isActive
                      ? 'bg-[#0D472D] text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0D472D] rounded-r-md -ml-4" />
                    )}
                    <div className="flex items-center gap-3">
                      <Megaphone className="w-4 h-4" />
                      <span>Announcements</span>
                    </div>
                    {isProduction && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Soon
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </div>
          ) : null}
        </div>

        {/* Bottom Section: Stage Kiosk Launcher + User Logout */}
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
          {/* Bottom Stage Kiosk Launcher Card with Wavy Green Background */}
          {isAdmin && (
            <div className="relative rounded-2xl p-3 bg-gradient-to-br from-[#0D472D] to-[#062618] text-white overflow-hidden shadow-xs dark-card">
              <svg
                className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path d="M0 20 Q 30 60 60 20 T 100 40 L 100 100 L 0 100 Z" fill="#157347" opacity="0.4" />
                <path d="M0 50 Q 40 10 80 50 T 100 80 L 100 100 L 0 100 Z" fill="#20c997" opacity="0.2" />
              </svg>

              <div className="relative z-10 flex flex-col items-start">
                <div className="w-6 h-6 rounded-full bg-black/40 border border-white/20 flex items-center justify-center mb-1.5">
                  <Tv className="w-3 h-3 text-white" />
                </div>
                <h4 className="text-xs font-bold font-bento-title text-white">Stage Screen</h4>
                <p className="text-[10px] text-white/70 mb-2 leading-tight">Live single stage display</p>
                <button
                  onClick={() => {
                    navigate('/admin/stage-queue');
                    onClose();
                  }}
                  className="w-full py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center justify-center gap-1 border border-white/15 transition-colors cursor-pointer"
                >
                  <span>Launch Kiosk</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

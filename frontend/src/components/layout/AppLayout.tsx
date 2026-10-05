import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { Sidebar } from './Sidebar.js';
import { BentoHeader } from './BentoHeader.js';
import { useAuth } from '../../context/AuthContext.js';

interface AppLayoutProps {
  requireAuth?: boolean;
  allowedRoles?: string[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ requireAuth = false, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-bento">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Loading Esperanza 2026...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    let fallback = '/';
    if (user.role === 'ADMIN') fallback = '/admin';
    if (user.role === 'TEAM_LEADER') fallback = '/team';
    if (user.role === 'JUDGE') fallback = '/judge';
    if (user.role === 'PARTICIPANT') fallback = '/participant';
    return <Navigate to={fallback} replace />;
  }

  const showSidebar = user && requireAuth && user.role !== 'JUDGE';
  const publicPaths = ['/', '/schedule', '/leaderboard', '/verify', '/login'];
  const isPublicPage = !requireAuth && publicPaths.includes(location.pathname);
  const isAdmin = user?.role === 'ADMIN' && requireAuth;
  const isDashboard = location.pathname === '/admin';
  const isHome = location.pathname === '/';



  const isJudge = user?.role === 'JUDGE';
  const isProduction = import.meta.env.VITE_APP_MODE === 'production';
  const isLoginPage = location.pathname === '/login';

  // 2. Public Pages
  if (isPublicPage || (!user && !requireAuth)) {
    if (isProduction || isLoginPage) {
      return <Outlet />;
    }
    return (
      <div className="min-h-screen flex flex-col bg-[#ffffc5] text-slate-900">
        <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} isPublic={true} />
        <main className={`flex-1 w-full ${isHome ? 'p-0 max-w-none' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'}`}>
          <Outlet />
        </main>
      </div>
    );
  }

  // 3. All Remaining Authenticated Pages (Admin, Team, etc.) -> Unified High-Class Bento Grid Design System
  return (
    <div className={`w-full bg-[#EEF1EE] flex gap-3 xl:gap-4 font-bento text-slate-800 antialiased items-start select-none bento-portal ${
      isJudge ? 'h-screen p-3 overflow-hidden' : 'min-h-screen p-3 xl:p-4'
    }`}>
      {showSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <main
        className={`flex-1 rounded-[24px] flex flex-col min-w-0 ${
          isJudge
            ? 'h-full bg-gradient-to-br from-[#0D472D] via-[#0A3B25] to-[#062919] text-white p-3.5 sm:p-5 shadow-xl border border-emerald-800/40 relative overflow-hidden justify-between'
            : 'bg-white p-5 xl:p-6 gap-5 shadow-2xs border border-slate-100/80 lg:min-h-[calc(100vh-1.5rem)] xl:min-h-[calc(100vh-2rem)]'
        }`}
      >
        <BentoHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <div className={`min-w-0 ${isJudge ? 'flex-1 flex flex-col justify-center overflow-hidden' : 'flex-1 flex flex-col'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

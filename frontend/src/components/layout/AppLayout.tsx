import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { Sidebar } from './Sidebar.js';
import { BentoHeader } from './BentoHeader.js';
import { useAuth } from '../../context/AuthContext.js';
import { MinimalFestivalLoader } from '../ui/MinimalFestivalLoader.js';

interface AppLayoutProps {
  requireAuth?: boolean;
  allowedRoles?: string[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ requireAuth = false, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return <MinimalFestivalLoader />;
  }

  if (requireAuth && !user) {
    return <Navigate to="/?login=true" state={{ from: location }} replace />;
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
  const isLoginPage = location.pathname === '/login';

  // 2. Public Pages
  if (isPublicPage || (!user && !requireAuth)) {
    if (isLoginPage) {
      return <Outlet />;
    }
    return (
      <div className="min-h-screen flex flex-col bg-[#040404] text-slate-100 relative">
        <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} isPublic={true} />
        <main className={`flex-1 w-full ${isHome ? 'p-0 max-w-none' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'}`}>
          <Outlet />
        </main>
      </div>
    );
  }

  // 3. All Authenticated Portals (Admin, Team, Judge, Participant) -> Unified Dark Luxury Bento Grid System
  return (
    <div className={`w-full flex gap-3 xl:gap-4 font-bento antialiased items-start bento-portal bg-[#040404] text-slate-100 p-2 sm:p-3 xl:p-4 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pl-[calc(0.5rem+env(safe-area-inset-left,0px))] pr-[calc(0.5rem+env(safe-area-inset-right,0px))] ${
      isJudge ? 'min-h-screen md:h-screen md:overflow-hidden select-none' : 'min-h-screen'
    }`}>
      {showSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <main
        className={`flex-1 rounded-2xl sm:rounded-[24px] flex flex-col min-w-0 bg-[#0A0A0A] border border-white/[0.08] text-slate-100 p-3.5 sm:p-5 xl:p-6 gap-3.5 sm:gap-5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative overflow-x-hidden ${
          isJudge
            ? 'min-h-full md:h-full justify-between'
            : 'lg:min-h-[calc(100vh-1.5rem)] xl:min-h-[calc(100vh-2rem)]'
        }`}
      >
        <BentoHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <div className={`min-w-0 ${isJudge ? 'flex-1 flex flex-col justify-start md:justify-center overflow-y-auto md:overflow-hidden' : 'flex-1 flex flex-col'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

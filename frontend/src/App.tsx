import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt.js';

import { ComingSoon } from './components/ui/ComingSoon.js';
import { PublicComingSoon } from './components/ui/PublicComingSoon.js';

// Public Pages
import { HomePage } from './pages/HomePage.js';
import { PublicSchedulePage } from './pages/PublicSchedulePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { LiveLeaderboardPage } from './pages/LiveLeaderboardPage.js';
import { CertificateVerifyPage } from './pages/CertificateVerifyPage.js';
import { LiveStageScreenPage } from './pages/LiveStageScreenPage.js';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { CompetitionsManagerPage } from './pages/admin/CompetitionsManagerPage.js';
import { ParticipantsManagerPage } from './pages/admin/ParticipantsManagerPage.js';
import { ScheduleManagerPage } from './pages/admin/ScheduleManagerPage.js';
import { StageQueueControlPage } from './pages/admin/StageQueueControlPage.js';
import { AttendanceManagerPage } from './pages/admin/AttendanceManagerPage.js';
import { ResultsVerificationPage } from './pages/admin/ResultsVerificationPage.js';
import { CertificatesManagerPage } from './pages/admin/CertificatesManagerPage.js';
import { AnnouncementsManagerPage } from './pages/admin/AnnouncementsManagerPage.js';
import { ReportsExportPage } from './pages/admin/ReportsExportPage.js';
import { AuditLogsPage } from './pages/admin/AuditLogsPage.js';
import { ProgrammeListPage } from './pages/admin/ProgrammeListPage.js';
import { AdminLeaderboardPage } from './pages/admin/AdminLeaderboardPage.js';
import { LiveScreenControlPage } from './pages/admin/LiveScreenControlPage.js';

// Team Leader Pages
import { TeamDashboardPage } from './pages/team/TeamDashboardPage.js';
import { TeamRosterPage } from './pages/team/TeamRosterPage.js';
import { TeamRegistrationsPage } from './pages/team/TeamRegistrationsPage.js';

// Judge Pages (Single Unified Tablet Interface)
import { JudgeTabletPortalPage } from './pages/judge/JudgeTabletPortalPage.js';

// Participant Pages
import { ParticipantDashboardPage } from './pages/participant/ParticipantDashboardPage.js';
import { OffStageSubmissionPage } from './pages/participant/OffStageSubmissionPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  const isProduction = import.meta.env.VITE_APP_MODE === 'production';

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <PwaInstallPrompt />
            <Routes>
              {/* Public Routes */}
              <Route element={<AppLayout requireAuth={false} />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/schedule" element={<PublicSchedulePage />} />
                <Route path="/leaderboard" element={<LiveLeaderboardPage />} />
                <Route path="/verify" element={<CertificateVerifyPage />} />
                <Route path="/login" element={<Navigate to="/?login=true" replace />} />
              </Route>

              {/* Standalone Full-Screen Stage Projector Display (No Navbar/Sidebar) */}
              <Route path="/live-screen" element={<LiveStageScreenPage />} />

              {/* Admin Routes */}
              <Route element={<AppLayout requireAuth={true} allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/competitions" element={<CompetitionsManagerPage />} />
                <Route path="/admin/programme-list" element={<Navigate to="/admin/schedule" replace />} />
                <Route path="/admin/participants" element={<ParticipantsManagerPage />} />
                <Route path="/admin/schedule" element={<ScheduleManagerPage />} />
                <Route path="/admin/stage-queue" element={<StageQueueControlPage />} />
                <Route path="/admin/live-screen" element={<LiveScreenControlPage />} />
                <Route path="/admin/attendance" element={<Navigate to="/admin/stage-queue" replace />} />
                <Route path="/admin/judging" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/results" element={<ResultsVerificationPage />} />
                <Route path="/admin/leaderboard" element={<AdminLeaderboardPage />} />
                <Route path="/admin/point-rules" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/certificates" element={<CertificatesManagerPage />} />
                <Route path="/admin/announcements" element={<AnnouncementsManagerPage />} />
                <Route path="/admin/reports" element={<ReportsExportPage />} />
                <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              </Route>

              {/* Team Leader Routes */}
              <Route element={<AppLayout requireAuth={true} allowedRoles={['ADMIN', 'TEAM_LEADER']} />}>
                <Route path="/team" element={<TeamDashboardPage />} />
                <Route path="/team/roster" element={<TeamRosterPage />} />
                <Route path="/team/registrations" element={<TeamRegistrationsPage />} />
                <Route path="/team/announcements" element={<AnnouncementsManagerPage />} />
              </Route>

              {/* Judge Routes (Single Tablet Kiosk) */}
              <Route element={<AppLayout requireAuth={true} allowedRoles={['JUDGE']} />}>
                <Route path="/judge" element={<JudgeTabletPortalPage />} />
                <Route path="/judge/*" element={<Navigate to="/judge" replace />} />
              </Route>

              {/* Participant Routes */}
              <Route element={<AppLayout requireAuth={true} allowedRoles={['PARTICIPANT']} />}>
                <Route path="/participant" element={<ParticipantDashboardPage />} />
                <Route path="/participant/submissions" element={<OffStageSubmissionPage />} />
                <Route path="/participant/certificates" element={<CertificateVerifyPage />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

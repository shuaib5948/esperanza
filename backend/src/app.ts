import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { checkDatabaseHealth } from './database/connection.js';
import authRoutes from './routes/auth.routes.js';
import teamRoutes from './routes/team.routes.js';
import categoryRoutes from './routes/category.routes.js';
import participantRoutes from './routes/participant.routes.js';
import competitionRoutes from './routes/competition.routes.js';
import programmeGroupRoutes from './routes/programme_group.routes.js';
import venueRoutes from './routes/venue.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import registrationRoutes from './routes/registration.routes.js';
import { judgeAdminRouter, judgePortalRouter } from './routes/judge.routes.js';
import resultRoutes from './routes/result.routes.js';
import pointsRoutes from './routes/points.routes.js';
import { stageRouter, attendanceRouter, submissionRouter } from './routes/stage_attendance.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditLogRoutes from './routes/audit_log.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import teamLeaderRoutes from './routes/team_leader.routes.js';

export function createApp(): Express {
  const app = express();

  // Basic security and parsing middlewares
  app.use(helmet());
  
  const configuredOrigins = (config.clientUrl || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          configuredOrigins.includes(origin) ||
          origin === 'http://localhost:5173' ||
          origin === 'http://127.0.0.1:5173' ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again after 15 minutes',
      },
    },
  });
  app.use('/api/v1/auth', authLimiter);

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    const isDbConnected = await checkDatabaseHealth();
    return res.status(isDbConnected ? 200 : 503).json({
      status: isDbConnected ? 'healthy' : 'unhealthy',
      database: isDbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      festival: 'Esperanza 2026–27',
    });
  });

  // Base API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/teams', teamRoutes);
  app.use('/api/v1/participant-categories', categoryRoutes);
  app.use('/api/v1/participants', participantRoutes);
  app.use('/api/v1/competitions', competitionRoutes);
  app.use('/api/v1/programme-groups', programmeGroupRoutes);
  app.use('/api/v1/venues', venueRoutes);
  app.use('/api/v1/schedules', scheduleRoutes);
  app.use('/api/v1/registrations', registrationRoutes);
  app.use('/api/v1/judges', judgeAdminRouter);
  app.use('/api/v1/judge', judgePortalRouter);
  app.use('/api/v1/results', resultRoutes);
  app.use('/api/v1/points', pointsRoutes);
  app.use('/api/v1/stage', stageRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/submissions', submissionRouter);
  app.use('/api/v1/certificates', certificateRoutes);
  app.use('/api/v1/announcements', announcementRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/audit-logs', auditLogRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/team-leader', teamLeaderRoutes);

  // 404 handler for undefined API routes
  app.use('/api/*', (_req, res) => {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested API endpoint was not found',
      },
    });
  });

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}

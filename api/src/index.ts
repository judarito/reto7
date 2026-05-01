import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { performance } from 'perf_hooks';
import { isCloudinaryConfigured } from './services/cloudinary';

import authRoutes from './routes/auth';
import challengesRoutes from './routes/challenges';
import checkInsRoutes from './routes/checkIns';
import feedRoutes from './routes/feed';
import storeRoutes from './routes/store';
import webhooksRoutes from './routes/webhooks';
import leaderboardRoutes from './routes/leaderboard';
import usersRoutes from './routes/users';
import notificationsRoutes from './routes/notifications';
import { ensureDynamicTables } from './services/databaseBootstrap';
import { startNotificationScheduler } from './services/notificationScheduler';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !isCloudinaryConfigured()) {
  throw new Error('Cloudinary must be configured in production');
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use((req, res, next) => {
  const startedAt = performance.now();

  res.on('finish', () => {
    const elapsed = Math.round(performance.now() - startedAt);
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsed}ms)`);
  });

  next();
});

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/check-ins', checkInsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  void ensureDynamicTables()
    .then(() => console.log('Dynamic tables ensured'))
    .catch((error) => console.error('Failed to ensure dynamic tables:', error));
  startNotificationScheduler();
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import challengesRoutes from './routes/challenges';
import checkInsRoutes from './routes/checkIns';
import feedRoutes from './routes/feed';
import storeRoutes from './routes/store';
import webhooksRoutes from './routes/webhooks';
import leaderboardRoutes from './routes/leaderboard';
import usersRoutes from './routes/users';
import notificationsRoutes from './routes/notifications';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

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
});

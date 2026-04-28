import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { NotificationTemplates } from '../services/notificationService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.insert(users).values({
      email,
      passwordHash,
      username,
    }).returning();

    const user = result[0];
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    // Send welcome notification (non-blocking)
    NotificationTemplates.welcome(user.id, user.username).catch(() => {});

    res.status(201).json({ token, user: { id: user.id, username: user.username, totalStreak: user.totalStreak } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.select().from(users).where(eq(users.email, email));
    if (result.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result[0];
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, message: 'Logged in successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/push-token', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { token } = req.body;
    
    if (!token) return res.status(400).json({ error: 'Token is required' });

    await db.update(users).set({ pushToken: token }).where(eq(users.id, userId));
    res.json({ message: 'Push token saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

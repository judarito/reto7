import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { pushTokens, users } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { NotificationTemplates } from '../services/notificationService';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
const emailSchema = z.string().trim().email().max(120);
const passwordSchema = z.string().min(6).max(120);
const usernameSchema = z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_.-]+$/, 'Username contains invalid characters');

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const pushTokenSchema = z.object({
  token: z.string().trim().min(10).max(4096),
  platform: z.string().trim().min(2).max(24).optional(),
  deviceLabel: z.string().trim().min(1).max(120).optional(),
});

router.post('/register', validateBody(registerSchema), async (req, res) => {
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

router.post('/login', validateBody(loginSchema), async (req, res) => {
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

router.post('/push-token', authenticateToken, validateBody(pushTokenSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { token, platform, deviceLabel } = req.body;
    
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const existingToken = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.token, token));

    if (existingToken.length > 0) {
      await db
        .update(pushTokens)
        .set({
          userId,
          platform: platform ?? existingToken[0].platform ?? null,
          deviceLabel: deviceLabel ?? existingToken[0].deviceLabel ?? null,
          updatedAt: new Date(),
        })
        .where(eq(pushTokens.id, existingToken[0].id));
    } else {
      await db.insert(pushTokens).values({
        userId,
        token,
        platform: platform ?? null,
        deviceLabel: deviceLabel ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Keep legacy column in sync during transition.
    await db.update(users).set({ pushToken: token }).where(eq(users.id, userId));

    const userTokenRows = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    res.json({
      message: 'Push token saved successfully',
      tokenCountForUser: userTokenRows.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

import { Router } from 'express';
import { db } from '../db';
import { challenges, trophies, users, userChallenges } from '../db/schema';
import { desc, eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getChallengeIcon, getChallengeLabel, inferChallengeType } from '../utils/challenges';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';

const router = Router();

const settingsSchema = z.object({
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM').optional(),
});

// GET /api/users/me — returns the authenticated user's profile
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const userRecord = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        totalStreak: users.totalStreak,
        streakFreezesInventory: users.streakFreezesInventory,
        streakFreezeGoldInventory: users.streakFreezeGoldInventory,
        streakFreezePlatinumInventory: users.streakFreezePlatinumInventory,
        xp: users.xp,
        level: users.level,
        reminderTime: users.reminderTime,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (userRecord.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userChallengesRows = await db
      .select({
        currentStreak: userChallenges.currentStreak,
        status: userChallenges.status,
      })
      .from(userChallenges)
      .where(eq(userChallenges.userId, userId));

    const earnedTrophies = await db
      .select({
        id: trophies.id,
        challengeId: trophies.challengeId,
        earnedAt: trophies.earnedAt,
        title: challenges.title,
        evidenceDescription: challenges.evidenceDescription,
      })
      .from(trophies)
      .innerJoin(challenges, eq(trophies.challengeId, challenges.id))
      .where(eq(trophies.userId, userId))
      .orderBy(desc(trophies.earnedAt));

    const bestStreak = userChallengesRows.reduce((max, row) => Math.max(max, row.currentStreak ?? 0), 0);

    res.json({
      ...userRecord[0],
      activeChallengesCount: userChallengesRows.filter(c => c.status === 'active').length,
      completedChallengesCount: userChallengesRows.filter(c => c.status === 'completed').length,
      bestStreak,
      trophies: earnedTrophies.map((trophy) => {
        const challengeType = inferChallengeType(trophy.title, trophy.evidenceDescription);
        return {
          id: trophy.id,
          challengeId: trophy.challengeId,
          title: trophy.title,
          earnedAt: trophy.earnedAt.toISOString(),
          challengeType,
          challengeIcon: getChallengeIcon(challengeType),
          challengeLabel: getChallengeLabel(challengeType),
        };
      }),
    });
  } catch (error) {
    console.error('GET /users/me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id — perfil público de otro usuario
router.get('/:id', async (req, res) => {
  try {
    const profileId = Number(req.params.id as string);
    if (Number.isNaN(profileId)) return res.status(400).json({ error: 'Invalid user id' });

    const userRecord = await db
      .select({
        id: users.id,
        username: users.username,
        totalStreak: users.totalStreak,
        xp: users.xp,
        level: users.level,
      })
      .from(users)
      .where(eq(users.id, profileId));

    if (userRecord.length === 0) return res.status(404).json({ error: 'User not found' });

    const userChallengesRows = await db
      .select({ currentStreak: userChallenges.currentStreak, status: userChallenges.status })
      .from(userChallenges)
      .where(eq(userChallenges.userId, profileId));

    const earnedTrophies = await db
      .select({ id: trophies.id, challengeId: trophies.challengeId, earnedAt: trophies.earnedAt, title: challenges.title, evidenceDescription: challenges.evidenceDescription })
      .from(trophies)
      .innerJoin(challenges, eq(trophies.challengeId, challenges.id))
      .where(eq(trophies.userId, profileId))
      .orderBy(desc(trophies.earnedAt));

    const bestStreak = userChallengesRows.reduce((max, row) => Math.max(max, row.currentStreak ?? 0), 0);

    res.json({
      ...userRecord[0],
      activeChallengesCount: userChallengesRows.filter(c => c.status === 'active').length,
      completedChallengesCount: userChallengesRows.filter(c => c.status === 'completed').length,
      bestStreak,
      trophies: earnedTrophies.map((trophy) => ({
        id: trophy.id,
        challengeId: trophy.challengeId,
        title: trophy.title,
        earnedAt: trophy.earnedAt.toISOString(),
        challengeIcon: getChallengeIcon(inferChallengeType(trophy.title, trophy.evidenceDescription)),
        challengeLabel: getChallengeLabel(inferChallengeType(trophy.title, trophy.evidenceDescription)),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/me/settings — actualizar configuración del usuario
router.patch('/me/settings', authenticateToken, validateBody(settingsSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { reminderTime } = req.body;

    if (reminderTime !== undefined) {
      await db.update(users).set({ reminderTime }).where(eq(users.id, userId));
    }

    res.json({ message: 'Settings updated', reminderTime });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

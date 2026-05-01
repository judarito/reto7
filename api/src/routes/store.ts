import { Router } from 'express';
import { db } from '../db';
import { checkIns, users, userChallenges } from '../db/schema';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { eq, and, desc } from 'drizzle-orm';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { deriveChallengeStatus, getDaysSinceLastCheckIn, getStartOfYesterday } from '../utils/streaks';

const router = Router();
const consumeFreezeSchema = z.object({
  challengeId: z.coerce.number().int().positive(),
});

router.post('/consume-freeze', authenticateToken, validateBody(consumeFreezeSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { challengeId } = req.body;

    const userRecord = await db.select().from(users).where(eq(users.id, userId));
    const inventory = userRecord[0]?.streakFreezesInventory || 0;

    if (inventory <= 0) {
      return res.status(400).json({ error: 'No streak freezes available' });
    }

    const userChallenge = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));

    if (userChallenge.length === 0) {
      return res.status(404).json({ error: 'Challenge membership not found' });
    }

    const latestCheckIn = await db
      .select({
        createdAt: checkIns.createdAt,
      })
      .from(checkIns)
      .where(and(eq(checkIns.userId, userId), eq(checkIns.challengeId, challengeId)))
      .orderBy(desc(checkIns.createdAt))
      .limit(1);

    const latestCheckInAt = latestCheckIn[0]?.createdAt ?? null;
    const derivedStatus = deriveChallengeStatus({
      storedStatus: userChallenge[0].status,
      currentStreak: userChallenge[0].currentStreak,
      durationDays: Number.MAX_SAFE_INTEGER,
      lastCheckInAt: latestCheckInAt,
    });

    if (derivedStatus !== 'broken') {
      return res.status(400).json({ error: 'This challenge does not need a streak freeze right now' });
    }

    const daysSinceLastCheckIn = getDaysSinceLastCheckIn(latestCheckInAt);
    if (daysSinceLastCheckIn == null || daysSinceLastCheckIn !== 2) {
      return res.status(400).json({ error: 'A streak freeze can only recover one missed day' });
    }

    await db.update(users).set({ streakFreezesInventory: inventory - 1 }).where(eq(users.id, userId));

    const yesterday = getStartOfYesterday();
    yesterday.setHours(23, 59, 0, 0);

    await db.insert(checkIns).values({
      userId,
      challengeId,
      photoUrl: 'freeze://shield',
      createdAt: yesterday,
    });

    await db
      .update(userChallenges)
      .set({ status: 'active' })
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));

    res.json({ message: 'Streak freeze consumed successfully', newInventory: inventory - 1, restoredStatus: 'active' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

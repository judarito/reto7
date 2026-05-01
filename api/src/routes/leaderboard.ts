import { Router } from 'express';
import { db } from '../db';
import { users, userChallenges } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const challengeIdSchema = z.object({ challenge_id: z.coerce.number().int().positive() });

router.get('/:challenge_id', authenticateToken, validateParams(challengeIdSchema), async (req, res) => {
  try {
    const challengeId = parseInt(req.params.challenge_id as string, 10);

    const leaderboard = await db
      .select({
        id: users.id,
        username: users.username,
        currentStreak: userChallenges.currentStreak,
      })
      .from(userChallenges)
      .innerJoin(users, eq(userChallenges.userId, users.id))
      .where(and(eq(userChallenges.challengeId, challengeId), eq(userChallenges.status, 'active')))
      .orderBy(desc(userChallenges.currentStreak))
      .limit(10);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

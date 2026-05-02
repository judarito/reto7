import { Router } from 'express';
import { db } from '../db';
import { users, userChallenges } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const challengeIdSchema = z.object({ challenge_id: z.coerce.number().int().positive() });

// Ranking por reto (existente)
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

// Ranking global de rachas
router.get('/global/list', authenticateToken, async (req, res) => {
  try {
    const globalLeaderboard = await db
      .select({
        id: users.id,
        username: users.username,
        totalStreak: users.totalStreak,
        level: users.level,
        xp: users.xp,
      })
      .from(users)
      .orderBy(desc(users.totalStreak))
      .limit(50);

    res.json(globalLeaderboard.map((u, i) => ({
      rank: i + 1,
      ...u,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

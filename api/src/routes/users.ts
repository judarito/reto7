import { Router } from 'express';
import { db } from '../db';
import { challenges, trophies, users, userChallenges } from '../db/schema';
import { desc, eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getChallengeIcon, getChallengeLabel, inferChallengeType } from '../utils/challenges';

const router = Router();

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

export default router;

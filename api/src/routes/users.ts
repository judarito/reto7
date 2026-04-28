import { Router } from 'express';
import { db } from '../db';
import { users, userChallenges } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';

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

    // Count active challenges
    const activeChallengesCount = await db
      .select()
      .from(userChallenges)
      .where(eq(userChallenges.userId, userId));

    res.json({
      ...userRecord[0],
      activeChallengesCount: activeChallengesCount.filter(c => c.status === 'active').length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

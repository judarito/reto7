import { Router } from 'express';
import { db } from '../db';
import { users, userChallenges } from '../db/schema';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';

const router = Router();

router.post('/consume-freeze', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({ error: 'challengeId is required' });
    }

    const userRecord = await db.select().from(users).where(eq(users.id, userId));
    const inventory = userRecord[0]?.streakFreezesInventory || 0;

    if (inventory <= 0) {
      return res.status(400).json({ error: 'No streak freezes available' });
    }

    // Decrement inventory
    await db.update(users).set({ streakFreezesInventory: inventory - 1 }).where(eq(users.id, userId));

    // Restore streak (in a real app, this would change a 'broken' status back to 'active' or increment)
    // For MVP, we will just ensure the status is 'active' and maybe give them a +1 bump as if they checked in.
    const userChallenge = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, parseInt(challengeId, 10))));

    if (userChallenge.length > 0) {
      await db
        .update(userChallenges)
        .set({ status: 'active' })
        .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, parseInt(challengeId, 10))));
    }

    res.json({ message: 'Streak freeze consumed successfully', newInventory: inventory - 1 });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

import { Router } from 'express';
import { db } from '../db';
import { checkIns, reactions, users } from '../db/schema';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { eq, desc } from 'drizzle-orm';
import { Expo } from 'expo-server-sdk';
import { NotificationTemplates } from '../services/notificationService';

const router = Router();

router.get('/:challenge_id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const challengeId = parseInt(req.params.challenge_id as string, 10);

    // Get today's check-ins (mocking today for simplicity, getting latest 20)
    const recentCheckIns = await db
      .select({
        id: checkIns.id,
        photoUrl: checkIns.photoUrl,
        createdAt: checkIns.createdAt,
        user: {
          id: users.id,
          username: users.username,
        }
      })
      .from(checkIns)
      .innerJoin(users, eq(checkIns.userId, users.id))
      .where(eq(checkIns.challengeId, challengeId))
      .orderBy(desc(checkIns.createdAt))
      .limit(20);

    // Get reactions for these check-ins
    const checkInIds = recentCheckIns.map(c => c.id);
    let allReactions: any[] = [];
    if (checkInIds.length > 0) {
       allReactions = await db
         .select()
         .from(reactions);
         // ideally where inArray(reactions.checkInId, checkInIds) but we can filter in JS for MVP
    }

    const feed = recentCheckIns.map(checkIn => {
      const checkInReactions = allReactions.filter(r => r.checkInId === checkIn.id);
      
      const reactionCounts = { '🔥': 0, '💪': 0, '👏': 0 };
      checkInReactions.forEach(r => {
        if (r.emojiType in reactionCounts) {
          reactionCounts[r.emojiType as keyof typeof reactionCounts]++;
        }
      });

      return {
        ...checkIn,
        reactions: reactionCounts
      };
    });

    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reactions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { checkInId, emojiType } = req.body;

    if (!checkInId || !emojiType) {
      return res.status(400).json({ error: 'checkInId and emojiType are required' });
    }

    await db.insert(reactions).values({
      checkInId: parseInt(checkInId, 10),
      userId,
      emojiType,
    });

    res.json({ message: 'Reaction added' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/nudge', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { targetUserId } = req.body;
    const senderUsername = (req.user as any)?.username ?? 'Un atleta';

    if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });

    await NotificationTemplates.nudge(parseInt(targetUserId, 10), senderUsername);

    res.json({ message: 'Nudge sent successfully' });
  } catch (error) {
    console.error('Nudge error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

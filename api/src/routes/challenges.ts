import { Router } from 'express';
import { db } from '../db';
import { challenges, userChallenges, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { NotificationTemplates } from '../services/notificationService';

const router = Router();

router.get('/active', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Join userChallenges and challenges
    const activeChallenges = await db
      .select({
        challengeId: challenges.id,
        title: challenges.title,
        durationDays: challenges.durationDays,
        currentStreak: userChallenges.currentStreak,
        status: userChallenges.status
      })
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.status, 'active')));
      
    res.json(activeChallenges);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/global', async (req, res) => {
  try {
    const allChallenges = await db.select().from(challenges).where(eq(challenges.isPrivate, false));
    res.json(allChallenges);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/join', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({ error: 'challengeId is required' });
    }

    // Check if already joined
    const existing = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, parseInt(challengeId, 10))));

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already joined this challenge' });
    }

    await db.insert(userChallenges).values({
      userId,
      challengeId: parseInt(challengeId, 10),
      currentStreak: 0,
      status: 'active'
    });

    res.json({ message: 'Successfully joined the challenge' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create custom challenge
router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title, durationDays, isPrivate, evidenceDescription } = req.body;

    if (!title || !durationDays) {
      return res.status(400).json({ error: 'Title and duration are required' });
    }

    let inviteCode = null;
    if (isPrivate) {
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const newChallenge = await db.insert(challenges).values({
      title,
      durationDays: parseInt(durationDays, 10),
      creatorId: userId,
      isPrivate: isPrivate ? true : false,
      inviteCode,
      evidenceDescription: evidenceDescription?.trim() || null,
    }).returning();

    const challengeId = newChallenge[0].id;

    // Join the creator to their own challenge
    await db.insert(userChallenges).values({
      userId,
      challengeId,
      currentStreak: 0,
      status: 'active'
    });

    res.json({ message: 'Challenge created', inviteCode, challengeId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join by code
router.post('/join-by-code', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const challengeRecord = await db.select().from(challenges).where(eq(challenges.inviteCode, inviteCode.toUpperCase()));
    
    if (challengeRecord.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const challengeId = challengeRecord[0].id;

    const existing = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already joined this challenge' });
    }

    await db.insert(userChallenges).values({
      userId,
      challengeId,
      currentStreak: 0,
      status: 'active'
    });

    // Notify the challenge creator
    if (challengeRecord[0].creatorId && challengeRecord[0].creatorId !== userId) {
      const joinerRecord = await db.select({ username: users.username })
        .from(users)
        .where(eq(users.id, userId));
      const joinerName = joinerRecord[0]?.username ?? 'Un atleta';
      await NotificationTemplates.newMemberJoined(
        challengeRecord[0].creatorId,
        joinerName,
        challengeRecord[0].title,
        challengeId
      );
    }

    res.json({ message: 'Successfully joined via invite code', challengeId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Challenge Details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const challengeId = parseInt(req.params.id as string, 10);
    const challengeRecord = await db.select().from(challenges).where(eq(challenges.id, challengeId));
    
    if (challengeRecord.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    res.json(challengeRecord[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

import { Router } from 'express';
import { db } from '../db';
import { checkIns, nudgeEvents, reactions, userChallenges, users } from '../db/schema';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { NotificationTemplates } from '../services/notificationService';
import { validateBody, validateParams } from '../middleware/validate';
import { z } from 'zod';
import { getStartOfToday } from '../utils/challenges';

const router = Router();
const VALID_REACTIONS = new Set(['🔥', '💪', '👏']);
const challengeIdSchema = z.object({ challenge_id: z.coerce.number().int().positive() });
const reactionSchema = z.object({
  checkInId: z.coerce.number().int().positive(),
  emojiType: z.enum(['🔥', '💪', '👏']),
});
const nudgeSchema = z.object({
  targetUserId: z.coerce.number().int().positive(),
  challengeId: z.coerce.number().int().positive(),
});

async function ensureChallengeMembership(userId: number, challengeId: number) {
  const membership = await db
    .select()
    .from(userChallenges)
    .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));

  return membership.length > 0;
}

router.get('/:challenge_id', authenticateToken, validateParams(challengeIdSchema), async (req: AuthRequest, res) => {
  try {
    const challengeId = Number(req.params.challenge_id as string);
    const userId = req.user!.id;

    if (Number.isNaN(challengeId)) {
      return res.status(400).json({ error: 'Invalid challenge id' });
    }

    const isMember = await ensureChallengeMembership(userId, challengeId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

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
        .from(reactions)
        .where(inArray(reactions.checkInId, checkInIds));
    }

    const feed = recentCheckIns.map(checkIn => {
      const checkInReactions = allReactions.filter(r => r.checkInId === checkIn.id);
      
      const reactionCounts = { '🔥': 0, '💪': 0, '👏': 0 };
      const viewerReactions = { '🔥': false, '💪': false, '👏': false };
      checkInReactions.forEach(r => {
        if (r.emojiType in reactionCounts) {
          reactionCounts[r.emojiType as keyof typeof reactionCounts]++;
          if (r.userId === userId) {
            viewerReactions[r.emojiType as keyof typeof viewerReactions] = true;
          }
        }
      });

      return {
        ...checkIn,
        reactions: reactionCounts,
        viewerReactions,
      };
    });

    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:challenge_id/danger', authenticateToken, validateParams(challengeIdSchema), async (req: AuthRequest, res) => {
  try {
    const challengeId = Number(req.params.challenge_id as string);
    const userId = req.user!.id;

    if (Number.isNaN(challengeId)) {
      return res.status(400).json({ error: 'Invalid challenge id' });
    }

    const isMember = await ensureChallengeMembership(userId, challengeId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    const members = await db
      .select({
        id: users.id,
        username: users.username,
      })
      .from(userChallenges)
      .innerJoin(users, eq(userChallenges.userId, users.id))
      .where(and(
        eq(userChallenges.challengeId, challengeId),
        eq(userChallenges.status, 'active'),
      ));

    const startOfDay = getStartOfToday();

    const todayCheckIns = await db
      .select({
        userId: checkIns.userId,
      })
      .from(checkIns)
      .where(and(
        eq(checkIns.challengeId, challengeId),
        gte(checkIns.createdAt, startOfDay),
      ));

    const checkedInToday = new Set(todayCheckIns.map((checkIn) => checkIn.userId));
    const usersInDanger = members
      .filter((member) => member.id !== userId && !checkedInToday.has(member.id))
      .map((member) => ({
        id: member.id,
        name: member.username,
        missedDays: 1,
      }));

    res.json(usersInDanger);
  } catch (error) {
    console.error('Danger users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reactions', authenticateToken, validateBody(reactionSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { checkInId, emojiType } = req.body;

    if (!checkInId || !emojiType) {
      return res.status(400).json({ error: 'checkInId and emojiType are required' });
    }

    if (!VALID_REACTIONS.has(emojiType)) {
      return res.status(400).json({ error: 'Unsupported reaction' });
    }

    const checkInRecord = await db
      .select()
      .from(checkIns)
      .where(eq(checkIns.id, checkInId));

    if (checkInRecord.length === 0) {
      return res.status(404).json({ error: 'Check-in not found' });
    }

    const isMember = await ensureChallengeMembership(userId, checkInRecord[0].challengeId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    const existingReaction = await db
      .select()
      .from(reactions)
      .where(and(
        eq(reactions.checkInId, checkInId),
        eq(reactions.userId, userId),
        eq(reactions.emojiType, emojiType),
      ));

    if (existingReaction.length > 0) {
      await db
        .delete(reactions)
        .where(and(
          eq(reactions.checkInId, checkInId),
          eq(reactions.userId, userId),
          eq(reactions.emojiType, emojiType),
        ));

      return res.json({ message: 'Reaction removed', active: false });
    }

    await db.insert(reactions).values({
      checkInId,
      userId,
      emojiType,
    });

    res.json({ message: 'Reaction added', active: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/nudge', authenticateToken, validateBody(nudgeSchema), async (req: AuthRequest, res) => {
  try {
    const { targetUserId, challengeId } = req.body;
    const senderUsername = (req.user as any)?.username ?? 'Un atleta';
    const userId = req.user!.id;

    if (!targetUserId || !challengeId) {
      return res.status(400).json({ error: 'targetUserId and challengeId are required' });
    }

    const parsedChallengeId = challengeId;
    const parsedTargetUserId = targetUserId;

    const isSenderMember = await ensureChallengeMembership(userId, parsedChallengeId);
    const isTargetMember = await ensureChallengeMembership(parsedTargetUserId, parsedChallengeId);

    if (!isSenderMember || !isTargetMember) {
      return res.status(403).json({ error: 'Users must belong to the same challenge' });
    }

    if (userId === parsedTargetUserId) {
      return res.status(400).json({ error: 'You cannot send a nudge to yourself' });
    }

    const startOfDay = getStartOfToday();
    const existingDailyNudges = await db
      .select({ count: sql<number>`count(*)` })
      .from(nudgeEvents)
      .where(and(
        eq(nudgeEvents.senderUserId, userId),
        eq(nudgeEvents.targetUserId, parsedTargetUserId),
        eq(nudgeEvents.challengeId, parsedChallengeId),
        gte(nudgeEvents.createdAt, startOfDay),
      ));

    if (Number(existingDailyNudges[0]?.count ?? 0) > 0) {
      return res.status(429).json({ error: 'Ya enviaste un nudge a esta persona hoy para este reto' });
    }

    await db.insert(nudgeEvents).values({
      senderUserId: userId,
      targetUserId: parsedTargetUserId,
      challengeId: parsedChallengeId,
      createdAt: new Date(),
    });

    await NotificationTemplates.nudge(parsedTargetUserId, senderUsername, parsedChallengeId);

    res.json({ message: 'Nudge sent successfully' });
  } catch (error) {
    console.error('Nudge error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

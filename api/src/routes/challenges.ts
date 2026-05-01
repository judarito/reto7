import { Router } from 'express';
import { db } from '../db';
import { challenges, checkIns, challengeReports, trophies, userChallenges, users } from '../db/schema';
import { eq, and, desc, gte, lt, lte, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { NotificationTemplates } from '../services/notificationService';
import { validateBody, validateParams } from '../middleware/validate';
import { getChallengeIcon, getChallengeLabel, getProgressPercent, getStartOfToday, inferChallengeType } from '../utils/challenges';
import { deriveChallengeStatus, deriveTimelineStatus, TimelineStatus } from '../utils/streaks';
import { validateChallengeContent } from '../services/contentModeration';
import { z } from 'zod';

const router = Router();
const challengeIdSchema = z.object({ id: z.coerce.number().int().positive() });
const createSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(200).nullable().optional(),
  durationDays: z.coerce.number().int().min(1).max(365),
  isPrivate: z.boolean().optional().default(false),
  evidenceDescription: z.string().trim().max(240).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  maxParticipants: z.coerce.number().int().min(2).max(1000).nullable().optional(),
});
const joinSchema = z.object({
  challengeId: z.coerce.number().int().positive(),
});
const joinByCodeSchema = z.object({
  inviteCode: z.string().trim().min(4).max(12),
});
const reportSchema = z.object({
  reason: z.enum(['offensive', 'dangerous', 'discriminatory', 'other']),
  details: z.string().trim().max(500).nullable().optional(),
});
const scheduleSchema = z.object({
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

router.get('/active', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const memberships = await db
      .select({
        challengeId: challenges.id,
        title: challenges.title,
        durationDays: challenges.durationDays,
        evidenceDescription: challenges.evidenceDescription,
        currentStreak: userChallenges.currentStreak,
        status: userChallenges.status,
        creatorId: challenges.creatorId,
        creatorUsername: users.username,
      })
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .leftJoin(users, eq(challenges.creatorId, users.id))
      .where(eq(userChallenges.userId, userId))
      .orderBy(desc(userChallenges.currentStreak));

    const startOfDay = getStartOfToday();
    const todayCheckIns = await db
      .select({
        challengeId: checkIns.challengeId,
      })
      .from(checkIns)
      .where(and(eq(checkIns.userId, userId), gte(checkIns.createdAt, startOfDay)));

    const latestCheckIns = await db
      .select({
        challengeId: checkIns.challengeId,
        createdAt: checkIns.createdAt,
      })
      .from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.createdAt));

    const checkedInToday = new Set(todayCheckIns.map((entry) => entry.challengeId));
    const latestCheckInByChallenge = new Map<number, Date>();
    latestCheckIns.forEach((entry) => {
      if (!latestCheckInByChallenge.has(entry.challengeId)) {
        latestCheckInByChallenge.set(entry.challengeId, entry.createdAt);
      }
    });

    const normalizedChallenges = memberships.map((challenge) => {
      const latestCheckInAt = latestCheckInByChallenge.get(challenge.challengeId) ?? null;
      const normalizedStatus = deriveChallengeStatus({
        storedStatus: challenge.status,
        currentStreak: challenge.currentStreak,
        durationDays: challenge.durationDays,
        lastCheckInAt: latestCheckInAt,
      });

      const challengeType = inferChallengeType(challenge.title, challenge.evidenceDescription);
      return {
        ...challenge,
        status: normalizedStatus,
        challengeType,
        challengeIcon: getChallengeIcon(challengeType),
        challengeLabel: getChallengeLabel(challengeType),
        checkedInToday: checkedInToday.has(challenge.challengeId),
        daysRemaining: Math.max(challenge.durationDays - (challenge.currentStreak ?? 0), 0),
        progressPercent: getProgressPercent(challenge.currentStreak ?? 0, challenge.durationDays),
      };
    });

    for (const challenge of normalizedChallenges) {
      const original = memberships.find((entry) => entry.challengeId === challenge.challengeId);
      if (original && original.status !== challenge.status) {
        await db
          .update(userChallenges)
          .set({ status: challenge.status })
          .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challenge.challengeId)));
      }
    }

    res.json(normalizedChallenges);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/global', async (req, res) => {
  try {
    const allChallenges = await db.select().from(challenges).where(eq(challenges.isPrivate, false));

    // Mapa de usuarios para resolver creadores
    const allUsers = await db.select({ id: users.id, username: users.username }).from(users);
    const userMap = new Map<number, string>();
    allUsers.forEach((u) => userMap.set(u.id, u.username));

    const activeMemberships = await db
      .select({
        challengeId: userChallenges.challengeId,
        userId: userChallenges.userId,
        username: users.username,
        status: userChallenges.status,
      })
      .from(userChallenges)
      .innerJoin(users, eq(userChallenges.userId, users.id));

    const activeParticipantsByChallenge = new Map<number, { id: number; username: string }[]>();
    activeMemberships.forEach((membership) => {
      if (membership.status !== 'active') return;

      const participants = activeParticipantsByChallenge.get(membership.challengeId) ?? [];
      participants.push({
        id: membership.userId,
        username: membership.username,
      });
      activeParticipantsByChallenge.set(membership.challengeId, participants);
    });

    res.json(allChallenges.map((challenge) => {
      const challengeType = inferChallengeType(challenge.title, challenge.evidenceDescription);
      const activeParticipants = activeParticipantsByChallenge.get(challenge.id) ?? [];
      return {
        ...challenge,
        challengeType,
        challengeIcon: getChallengeIcon(challengeType),
        challengeLabel: getChallengeLabel(challengeType),
        activeParticipantsCount: activeParticipants.length,
        activeParticipants: activeParticipants.slice(0, 6),
        creatorUsername: challenge.creatorId ? userMap.get(challenge.creatorId) ?? null : null,
      };
    }));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/join', authenticateToken, validateBody(joinSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { challengeId } = req.body;

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

    res.json({ message: 'Successfully joined the challenge' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create custom challenge
router.post('/create', authenticateToken, validateBody(createSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title, description, durationDays, isPrivate, evidenceDescription, startsAt, endsAt, maxParticipants } = req.body;

    // --- Content moderation ---
    const moderation = await validateChallengeContent({ title, description, evidenceDescription });
    if (moderation.flagged) {
      return res.status(422).json({
        error: 'El reto no cumple con nuestras normas de contenido',
        reason: moderation.reason,
        details: moderation.details,
      });
    }

    let inviteCode = null;
    if (isPrivate) {
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const effectiveStartsAt = startsAt ? new Date(startsAt) : null;
    const effectiveEndsAt = endsAt ? new Date(endsAt) : null;

    const newChallenge = await db.insert(challenges).values({
      title,
      durationDays,
      description: description?.trim() || null,
      creatorId: userId,
      isPrivate: isPrivate ? true : false,
      inviteCode,
      evidenceDescription: evidenceDescription?.trim() || null,
      startsAt: effectiveStartsAt,
      endsAt: effectiveEndsAt,
      maxParticipants: maxParticipants ?? null,
    }).returning();

    const challengeId = newChallenge[0].id;

    // Join the creator to their own challenge
    const timelineStatus = deriveTimelineStatus({ startsAt: effectiveStartsAt, endsAt: effectiveEndsAt });
    await db.insert(userChallenges).values({
      userId,
      challengeId,
      currentStreak: 0,
      status: timelineStatus === 'pending' ? 'active' : 'active',
      joinedAt: new Date(),
    });

    res.json({ message: 'Challenge created', inviteCode, challengeId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join by code
router.post('/join-by-code', authenticateToken, validateBody(joinByCodeSchema), async (req: AuthRequest, res) => {
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

router.get('/:id/history', authenticateToken, validateParams(challengeIdSchema), async (req: AuthRequest, res) => {
  try {
    const challengeId = Number(req.params.id as string);
    const userId = req.user!.id;

    const membership = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));

    if (membership.length === 0) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    const challengeRecord = await db.select().from(challenges).where(eq(challenges.id, challengeId));
    if (challengeRecord.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const userCheckIns = await db
      .select({
        createdAt: checkIns.createdAt,
        photoUrl: checkIns.photoUrl,
      })
      .from(checkIns)
      .where(and(eq(checkIns.userId, userId), eq(checkIns.challengeId, challengeId)))
      .orderBy(desc(checkIns.createdAt))
      .limit(30);

    const completionRecord = await db
      .select({
        earnedAt: trophies.earnedAt,
      })
      .from(trophies)
      .where(and(eq(trophies.userId, userId), eq(trophies.challengeId, challengeId)));

    const history = userCheckIns.map((entry) => ({
      date: entry.createdAt.toISOString(),
      photoUrl: entry.photoUrl,
    }));

    res.json({
      challengeId,
      title: challengeRecord[0].title,
      durationDays: challengeRecord[0].durationDays,
      currentStreak: membership[0].currentStreak ?? 0,
      status: membership[0].status ?? 'active',
      completedAt: completionRecord[0]?.earnedAt?.toISOString() ?? null,
      history,
    });
  } catch (error) {
    console.error('Challenge history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Challenge Details
router.get('/:id', authenticateToken, validateParams(challengeIdSchema), async (req, res) => {
  try {
    const challengeId = Number(req.params.id as string);
    const challengeRecord = await db.select().from(challenges).where(eq(challenges.id, challengeId));
    
    if (challengeRecord.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = challengeRecord[0];

    // Obtener username del creador
    let creatorUsername: string | null = null;
    if (challenge.creatorId) {
      const creator = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, challenge.creatorId));
      creatorUsername = creator[0]?.username ?? null;
    }

    const activeParticipants = await db
      .select({
        id: users.id,
        username: users.username,
        currentStreak: userChallenges.currentStreak,
      })
      .from(userChallenges)
      .innerJoin(users, eq(userChallenges.userId, users.id))
      .where(and(eq(userChallenges.challengeId, challengeId), eq(userChallenges.status, 'active')))
      .orderBy(desc(userChallenges.currentStreak));

    const challengeType = inferChallengeType(challenge.title, challenge.evidenceDescription);
    res.json({
      ...challenge,
      challengeType,
      challengeIcon: getChallengeIcon(challengeType),
      challengeLabel: getChallengeLabel(challengeType),
      activeParticipantsCount: activeParticipants.length,
      activeParticipants,
      creatorUsername,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Nuevos endpoints Fase 1-2 ---

// POST /validate — validar contenido sin crear reto
router.post('/validate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, description, evidenceDescription } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const moderation = await validateChallengeContent({ title, description, evidenceDescription });
    res.json(moderation);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /upcoming — retos programados próximos
router.get('/upcoming', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const allUsers = await db.select({ id: users.id, username: users.username }).from(users);
    const userMap = new Map<number, string>();
    allUsers.forEach((u) => userMap.set(u.id, u.username));

    const upcomingChallenges = await db
      .select({
        id: challenges.id,
        title: challenges.title,
        durationDays: challenges.durationDays,
        description: challenges.description,
        evidenceDescription: challenges.evidenceDescription,
        startsAt: challenges.startsAt,
        endsAt: challenges.endsAt,
        isPrivate: challenges.isPrivate,
        inviteCode: challenges.inviteCode,
        creatorId: challenges.creatorId,
      })
      .from(challenges)
      .where(and(
        sql`${challenges.startsAt} IS NOT NULL`,
        sql`${challenges.startsAt} > ${now.getTime()}`,
        eq(challenges.isPrivate, false),
      ))
      .orderBy(sql`${challenges.startsAt} ASC`)
      .limit(20);

    const enriched = upcomingChallenges.map((c) => {
      const challengeType = inferChallengeType(c.title, c.evidenceDescription);
      return {
        ...c,
        challengeType,
        challengeIcon: getChallengeIcon(challengeType),
        challengeLabel: getChallengeLabel(challengeType),
        daysUntilStart: c.startsAt
          ? Math.ceil((c.startsAt.getTime() - now.getTime()) / 86400000)
          : null,
        creatorUsername: c.creatorId ? userMap.get(c.creatorId) ?? null : null,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /past — retos cerrados/completados del usuario
router.get('/past', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const pastChallenges = await db
      .select({
        challengeId: challenges.id,
        title: challenges.title,
        durationDays: challenges.durationDays,
        evidenceDescription: challenges.evidenceDescription,
        currentStreak: userChallenges.currentStreak,
        status: userChallenges.status,
      })
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .where(eq(userChallenges.userId, userId))
      .orderBy(desc(userChallenges.currentStreak));

    const now = new Date();
    const past = pastChallenges.filter((c) => {
      if (c.status === 'completed' || c.status === 'failed') return true;
      // También retos cuya fecha fin ya pasó
      return false; // filtered below with derived status
    });

    // Use derived status for all
    const enriched = pastChallenges
      .filter((c) => {
        const status = deriveChallengeStatus({
          storedStatus: c.status,
          currentStreak: c.currentStreak,
          durationDays: c.durationDays,
          lastCheckInAt: null,
        });
        return status === 'completed' || status === 'broken';
      })
      .map((c) => {
        const challengeType = inferChallengeType(c.title, c.evidenceDescription);
        const derivedStatus = deriveChallengeStatus({
          storedStatus: c.status,
          currentStreak: c.currentStreak,
          durationDays: c.durationDays,
          lastCheckInAt: null,
        });
        return {
          ...c,
          status: derivedStatus,
          challengeType,
          challengeIcon: getChallengeIcon(challengeType),
          challengeLabel: getChallengeLabel(challengeType),
        };
      });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/report — reportar reto inapropiado
router.post('/:id/report', authenticateToken, validateParams(challengeIdSchema), validateBody(reportSchema), async (req: AuthRequest, res) => {
  try {
    const challengeId = Number(req.params.id as string);
    const userId = req.user!.id;
    const { reason, details } = req.body;

    const challengeRecord = await db.select().from(challenges).where(eq(challenges.id, challengeId));
    if (challengeRecord.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    await db.insert(challengeReports).values({
      challengeId,
      reporterUserId: userId,
      reason,
      details: details?.trim() || null,
      isResolved: false,
      createdAt: new Date(),
    });

    res.json({ message: 'Report submitted. Gracias por ayudarnos a mantener la comunidad segura.' });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /:id/schedule — programar fechas de inicio/cierre
router.patch('/:id/schedule', authenticateToken, validateParams(challengeIdSchema), validateBody(scheduleSchema), async (req: AuthRequest, res) => {
  try {
    const challengeId = Number(req.params.id as string);
    const userId = req.user!.id;
    const { startsAt, endsAt } = req.body;

    const challengeRecord = await db.select().from(challenges).where(eq(challenges.id, challengeId));
    if (challengeRecord.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challengeRecord[0].creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can schedule dates' });
    }

    const effectiveStartsAt = startsAt ? new Date(startsAt) : null;
    const effectiveEndsAt = endsAt ? new Date(endsAt) : null;

    await db.update(challenges).set({
      startsAt: effectiveStartsAt,
      endsAt: effectiveEndsAt,
    }).where(eq(challenges.id, challengeId));

    res.json({ message: 'Dates updated', startsAt: effectiveStartsAt, endsAt: effectiveEndsAt });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

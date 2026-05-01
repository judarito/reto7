import { Router } from 'express';
import multer from 'multer';
import { db } from '../db';
import { challenges, checkIns, trophies, userChallenges, users } from '../db/schema';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { eq, and, gte } from 'drizzle-orm';
import { NotificationTemplates } from '../services/notificationService';
import { isCloudinaryConfigured, uploadCheckInImage } from '../services/cloudinary';
import { getStartOfToday, inferChallengeType } from '../utils/challenges';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const syncStepsSchema = z.object({
  challengeId: z.coerce.number().int().positive(),
  steps: z.coerce.number().int().min(1),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }

    cb(null, true);
  },
});

router.post('/upload', authenticateToken, upload.single('photo'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const challengeId = Number.parseInt(req.body.challengeId, 10);
    
    if (!req.file || Number.isNaN(challengeId)) {
      return res.status(400).json({ error: 'Photo and challengeId are required' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ error: 'Cloudinary storage is not configured on the server' });
    }

    const membership = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));

    if (membership.length === 0) {
      return res.status(403).json({ error: 'You are not part of this challenge' });
    }

    const startOfDay = getStartOfToday();

    const existingToday = await db
      .select()
      .from(checkIns)
      .where(and(
        eq(checkIns.userId, userId),
        eq(checkIns.challengeId, challengeId),
        gte(checkIns.createdAt, startOfDay),
      ));

    if (existingToday.length > 0) {
      return res.status(409).json({
        error: 'You already checked in today for this challenge',
        photoUrl: existingToday[0].photoUrl,
      });
    }

    const challengeRecord = await db.select().from(challenges).where(eq(challenges.id, challengeId));
    if (challengeRecord.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = challengeRecord[0];
    const uploadedAsset = await uploadCheckInImage(req.file.buffer, {
      userId,
      challengeId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    const photoUrl = uploadedAsset.secure_url;
    const nextStreak = (membership[0].currentStreak || 0) + 1;
    const nextStatus = nextStreak >= challenge.durationDays ? 'completed' : 'active';

    await db.insert(checkIns).values({
      userId,
      challengeId,
      photoUrl,
      createdAt: new Date(),
    });

    await db
      .update(userChallenges)
      .set({ currentStreak: nextStreak, status: nextStatus })
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));

    const userRecord = await db.select().from(users).where(eq(users.id, userId));
    if (userRecord.length > 0) {
      await db
        .update(users)
        .set({ totalStreak: (userRecord[0].totalStreak || 0) + 1 })
        .where(eq(users.id, userId));
    }

    if (nextStatus === 'completed') {
      const existingTrophy = await db
        .select()
        .from(trophies)
        .where(and(eq(trophies.userId, userId), eq(trophies.challengeId, challengeId)));

      if (existingTrophy.length === 0) {
        await db.insert(trophies).values({
          userId,
          challengeId,
          earnedAt: new Date(),
        });
      }

      await NotificationTemplates.challengeCompleted(userId, challenge.title, challengeId);
    }

    res.json({ message: 'Check-in successful', photoUrl, currentStreak: nextStreak, status: nextStatus });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'Only image uploads are allowed') {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/sync-steps', authenticateToken, validateBody(syncStepsSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { challengeId, steps } = req.body;

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

    const challenge = challengeRecord[0];
    if (inferChallengeType(challenge.title, challenge.evidenceDescription) !== 'steps') {
      return res.status(400).json({ error: 'This challenge does not support step sync' });
    }

    const startOfDay = getStartOfToday();
    const existingToday = await db
      .select()
      .from(checkIns)
      .where(and(
        eq(checkIns.userId, userId),
        eq(checkIns.challengeId, challengeId),
        gte(checkIns.createdAt, startOfDay),
      ));

    if (existingToday.length > 0) {
      return res.status(409).json({
        error: 'You already checked in today for this challenge',
        photoUrl: existingToday[0].photoUrl,
      });
    }

    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="100%" height="100%" fill="#121212"/><text x="50%" y="42%" dominant-baseline="middle" text-anchor="middle" font-size="120">👟</text><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="64" fill="#39FF14" font-family="Arial, sans-serif" font-weight="700">${steps.toLocaleString()} pasos</text><text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" font-size="38" fill="#FFFFFF" font-family="Arial, sans-serif">${challenge.title}</text></svg>`;
    const photoUrl = `data:image/svg+xml;base64,${Buffer.from(svgMarkup).toString('base64')}`;
    const nextStreak = (membership[0].currentStreak || 0) + 1;
    const nextStatus = nextStreak >= challenge.durationDays ? 'completed' : 'active';

    await db.insert(checkIns).values({
      userId,
      challengeId,
      photoUrl,
      createdAt: new Date(),
    });

    await db
      .update(userChallenges)
      .set({ currentStreak: nextStreak, status: nextStatus })
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));

    const userRecord = await db.select().from(users).where(eq(users.id, userId));
    if (userRecord.length > 0) {
      await db
        .update(users)
        .set({ totalStreak: (userRecord[0].totalStreak || 0) + 1 })
        .where(eq(users.id, userId));
    }

    if (nextStatus === 'completed') {
      const existingTrophy = await db
        .select()
        .from(trophies)
        .where(and(eq(trophies.userId, userId), eq(trophies.challengeId, challengeId)));

      if (existingTrophy.length === 0) {
        await db.insert(trophies).values({
          userId,
          challengeId,
          earnedAt: new Date(),
        });
      }

      await NotificationTemplates.challengeCompleted(userId, challenge.title, challengeId);
    }

    res.json({
      message: 'Steps synced successfully',
      photoUrl,
      currentStreak: nextStreak,
      status: nextStatus,
    });
  } catch (error) {
    console.error('Step sync error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

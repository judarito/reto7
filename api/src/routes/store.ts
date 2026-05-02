import { Router } from 'express';
import { db } from '../db';
import { checkIns, users, userChallenges } from '../db/schema';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { eq, and, desc } from 'drizzle-orm';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { deriveChallengeStatus, getDaysSinceLastCheckIn, getStartOfYesterday } from '../utils/streaks';

const router = Router();

const shieldTypes = ['normal', 'gold', 'platinum'] as const;
const consumeFreezeSchema = z.object({
  challengeId: z.coerce.number().int().positive(),
  shieldType: z.enum(shieldTypes).optional().default('normal'),
});

const GET_SHIELD_COLUMN = (type: string) => {
  switch (type) {
    case 'gold': return 'streakFreezeGoldInventory';
    case 'platinum': return 'streakFreezePlatinumInventory';
    default: return 'streakFreezesInventory';
  }
};

router.post('/consume-freeze', authenticateToken, validateBody(consumeFreezeSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { challengeId, shieldType } = req.body;

    const userRecord = await db.select().from(users).where(eq(users.id, userId));
    const user = userRecord[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const col = GET_SHIELD_COLUMN(shieldType);
    const inventory = (user as any)[col] || 0;
    if (inventory <= 0) return res.status(400).json({ error: `No ${shieldType} streak freezes available` });

    const userChallenge = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));
    if (userChallenge.length === 0) return res.status(404).json({ error: 'Challenge membership not found' });

    const latestCheckIn = await db
      .select({ createdAt: checkIns.createdAt })
      .from(checkIns)
      .where(and(eq(checkIns.userId, userId), eq(checkIns.challengeId, challengeId)))
      .orderBy(desc(checkIns.createdAt))
      .limit(1);

    const latestCheckInAt = latestCheckIn[0]?.createdAt ?? null;

    // Platinum: restaura racha sin importar cuántos días perdidos
    if (shieldType === 'platinum') {
      await db.update(users).set({ streakFreezePlatinumInventory: inventory - 1 }).where(eq(users.id, userId));
      const yesterday = getStartOfYesterday();
      yesterday.setHours(23, 59, 0, 0);
      await db.insert(checkIns).values({ userId, challengeId, photoUrl: 'freeze://platinum', createdAt: yesterday });
      await db.update(userChallenges).set({ status: 'active' }).where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));
      return res.json({ message: 'Platinum shield used. Racha restaurada completamente.', newInventory: inventory - 1, restoredStatus: 'active' });
    }

    // Gold: protege hasta 3 días perdidos
    if (shieldType === 'gold') {
      const daysLost = getDaysSinceLastCheckIn(latestCheckInAt) ?? 1;
      if (daysLost > 3) return res.status(400).json({ error: 'Gold shield can only recover up to 3 missed days' });

      await db.update(users).set({ streakFreezeGoldInventory: inventory - 1 }).where(eq(users.id, userId));
      for (let i = 1; i <= daysLost; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(23, 59, 0, 0);
        await db.insert(checkIns).values({ userId, challengeId, photoUrl: 'freeze://gold', createdAt: d });
      }
      await db.update(userChallenges).set({ status: 'active' }).where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));
      return res.json({ message: `Gold shield used. ${daysLost} día(s) restaurado(s).`, newInventory: inventory - 1, restoredStatus: 'active' });
    }

    // Normal: solo 1 día
    const derivedStatus = deriveChallengeStatus({ storedStatus: userChallenge[0].status, currentStreak: userChallenge[0].currentStreak, durationDays: Number.MAX_SAFE_INTEGER, lastCheckInAt: latestCheckInAt });
    if (derivedStatus !== 'broken') return res.status(400).json({ error: 'No se necesita escudo ahora' });
    const daysSinceLastCheckIn = getDaysSinceLastCheckIn(latestCheckInAt);
    if (daysSinceLastCheckIn == null || daysSinceLastCheckIn !== 2) return res.status(400).json({ error: 'Solo puede recuperar 1 día perdido' });

    await db.update(users).set({ streakFreezesInventory: inventory - 1 }).where(eq(users.id, userId));
    const yesterday = getStartOfYesterday();
    yesterday.setHours(23, 59, 0, 0);
    await db.insert(checkIns).values({ userId, challengeId, photoUrl: 'freeze://shield', createdAt: yesterday });
    await db.update(userChallenges).set({ status: 'active' }).where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));
    res.json({ message: 'Escudo normal usado', newInventory: inventory - 1, restoredStatus: 'active' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

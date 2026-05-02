import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export type AchievementId =
  | 'first_checkin' | 'week_streak' | 'month_streak' | 'three_challenges'
  | 'ten_checkins' | 'social_butterfly' | 'shield_collector' | 'recruiter';

export interface Achievement {
  id: AchievementId;
  title: string;
  icon: string;
  description: string;
  check(user: { id: number; totalStreak: number; streakFreezesInventory: number }): Promise<boolean>;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_checkin',
    title: 'Primer Paso',
    icon: '👣',
    description: 'Completaste tu primer check-in',
    check: async (u) => u.totalStreak >= 1,
  },
  {
    id: 'week_streak',
    title: '7 Días Imparable',
    icon: '📅',
    description: 'Mantén tu racha por 7 días consecutivos',
    check: async (u) => u.totalStreak >= 7,
  },
  {
    id: 'month_streak',
    title: 'Mes Legendario',
    icon: '🔥',
    description: 'Alcanza 30 días de racha total',
    check: async (u) => u.totalStreak >= 30,
  },
  {
    id: 'ten_checkins',
    title: 'Doble Dígito',
    icon: '💪',
    description: '10 check-ins completados',
    check: async (u) => u.totalStreak >= 10,
  },
  {
    id: 'shield_collector',
    title: 'Coleccionista',
    icon: '🛡️',
    description: 'Acumula 5 escudos de racha',
    check: async (u) => u.streakFreezesInventory >= 5,
  },
];

// Actualiza XP y revisa logros. Se llama después de cada check-in.
export async function awardCheckInXp(userId: number): Promise<{ xp: number; level: number; newAchievements: AchievementId[] }> {
  const userRecord = await db.select().from(users).where(eq(users.id, userId));
  if (userRecord.length === 0) throw new Error('User not found');
  const user = userRecord[0];

  const newXp = (user.xp || 0) + 10;
  const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

  await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, userId));

  const newAchievements: AchievementId[] = [];
  const userForCheck = {
    id: user.id,
    totalStreak: user.totalStreak ?? 0,
    streakFreezesInventory: user.streakFreezesInventory ?? 0,
  };
  for (const achievement of ACHIEVEMENTS) {
    const earned = await achievement.check(userForCheck);
    if (earned) newAchievements.push(achievement.id);
  }

  return { xp: newXp, level: newLevel, newAchievements };
}

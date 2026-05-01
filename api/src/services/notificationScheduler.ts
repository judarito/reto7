import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '../db';
import { challenges, checkIns, notifications, userChallenges } from '../db/schema';
import { NotificationTemplates } from './notificationService';
import { deriveChallengeStatus, getDaysSinceLastCheckIn, MembershipStatus } from '../utils/streaks';
import { getStartOfToday } from '../utils/challenges';

const DEFAULT_SWEEP_INTERVAL_MS = 15 * 60 * 1000;

function buildMembershipKey(userId: number, challengeId: number) {
  return `${userId}:${challengeId}`;
}

async function sweepStreakDangerNotifications() {
  const startOfToday = getStartOfToday();

  const activeMemberships = await db
    .select({
      userId: userChallenges.userId,
      challengeId: userChallenges.challengeId,
      currentStreak: userChallenges.currentStreak,
      storedStatus: userChallenges.status,
      challengeTitle: challenges.title,
      durationDays: challenges.durationDays,
    })
    .from(userChallenges)
    .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
    .where(eq(userChallenges.status, 'active'));

  if (activeMemberships.length === 0) {
    return;
  }

  const latestCheckIns = await db
    .select({
      userId: checkIns.userId,
      challengeId: checkIns.challengeId,
      createdAt: checkIns.createdAt,
    })
    .from(checkIns)
    .orderBy(desc(checkIns.createdAt));

  const latestCheckInByMembership = new Map<string, Date>();
  latestCheckIns.forEach((entry) => {
    const key = buildMembershipKey(entry.userId, entry.challengeId);
    if (!latestCheckInByMembership.has(key)) {
      latestCheckInByMembership.set(key, entry.createdAt);
    }
  });

  const todayDangerNotifications = await db
    .select({
      userId: notifications.userId,
      data: notifications.data,
    })
    .from(notifications)
    .where(and(
      eq(notifications.type, 'streak_danger'),
      gte(notifications.createdAt, startOfToday),
    ));

  const alreadyNotifiedToday = new Set<string>();
  todayDangerNotifications.forEach((notification) => {
    try {
      const parsed = notification.data ? JSON.parse(notification.data) as { challengeId?: string | number } : null;
      if (!parsed?.challengeId) return;
      alreadyNotifiedToday.add(buildMembershipKey(notification.userId, Number(parsed.challengeId)));
    } catch {
      // Ignore malformed payloads.
    }
  });

  for (const membership of activeMemberships) {
    const key = buildMembershipKey(membership.userId, membership.challengeId);
    const lastCheckInAt = latestCheckInByMembership.get(key) ?? null;
    const normalizedStatus: MembershipStatus = deriveChallengeStatus({
      storedStatus: membership.storedStatus,
      currentStreak: membership.currentStreak,
      durationDays: membership.durationDays,
      lastCheckInAt,
    });

    if (normalizedStatus !== membership.storedStatus) {
      await db
        .update(userChallenges)
        .set({ status: normalizedStatus })
        .where(and(
          eq(userChallenges.userId, membership.userId),
          eq(userChallenges.challengeId, membership.challengeId),
        ));
    }

    if (normalizedStatus !== 'active') {
      continue;
    }

    if ((membership.currentStreak ?? 0) <= 0) {
      continue;
    }

    const daysSinceLastCheckIn = getDaysSinceLastCheckIn(lastCheckInAt);
    if (daysSinceLastCheckIn !== 1) {
      continue;
    }

    if (alreadyNotifiedToday.has(key)) {
      continue;
    }

    await NotificationTemplates.streakDanger(
      membership.userId,
      membership.challengeTitle,
      membership.challengeId,
    );

    alreadyNotifiedToday.add(key);
  }
}

export function startNotificationScheduler() {
  if (process.env.DISABLE_NOTIFICATION_SCHEDULER === 'true') {
    console.log('Notification scheduler disabled via DISABLE_NOTIFICATION_SCHEDULER');
    return;
  }

  const configuredMinutes = Number.parseInt(process.env.NOTIFICATION_SWEEP_INTERVAL_MINUTES ?? '', 10);
  const intervalMs = Number.isFinite(configuredMinutes) && configuredMinutes > 0
    ? configuredMinutes * 60 * 1000
    : DEFAULT_SWEEP_INTERVAL_MS;

  const runSweep = async () => {
    try {
      await sweepStreakDangerNotifications();
    } catch (error) {
      console.error('Notification scheduler sweep failed:', error);
    }
  };

  void runSweep();
  setInterval(() => {
    void runSweep();
  }, intervalMs);

  console.log(`Notification scheduler started (${Math.round(intervalMs / 60000)} min interval)`);
}

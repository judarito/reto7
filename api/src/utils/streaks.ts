export type MembershipStatus = 'active' | 'completed' | 'broken';
export type TimelineStatus = 'pending' | 'active' | 'completed' | 'closed';

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function getStartOfYesterday() {
  const value = startOfDay(new Date());
  value.setDate(value.getDate() - 1);
  return value;
}

export function getDaysSinceLastCheckIn(lastCheckInAt?: Date | null) {
  if (!lastCheckInAt) return null;

  const today = startOfDay(new Date()).getTime();
  const last = startOfDay(lastCheckInAt).getTime();
  return Math.floor((today - last) / 86400000);
}

/**
 * Deriva el estado del reto basado en fechas de inicio/fin programadas.
 * Si no hay fechas, se considera "active" (el usuario empieza al unirse).
 */
export function deriveTimelineStatus(input: {
  startsAt?: Date | null;
  endsAt?: Date | null;
}): TimelineStatus {
  const now = new Date();

  if (input.startsAt && now < input.startsAt) {
    return 'pending';
  }

  if (input.endsAt && now > input.endsAt) {
    return 'closed';
  }

  return 'active';
}

export function deriveChallengeStatus(input: {
  storedStatus?: string | null;
  currentStreak?: number | null;
  durationDays: number;
  lastCheckInAt?: Date | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}): MembershipStatus {
  if ((input.currentStreak ?? 0) >= input.durationDays || input.storedStatus === 'completed') {
    return 'completed';
  }

  // Si el reto tiene fecha fin y ya pasó → completado
  if (input.endsAt && new Date() > input.endsAt) {
    return 'completed';
  }

  const daysSinceLastCheckIn = getDaysSinceLastCheckIn(input.lastCheckInAt);
  if (daysSinceLastCheckIn != null && daysSinceLastCheckIn >= 2) {
    return 'broken';
  }

  return 'active';
}

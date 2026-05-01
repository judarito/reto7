export type ChallengeType = 'steps' | 'reading' | 'nutrition' | 'mindfulness' | 'photo';

export function inferChallengeType(title: string, evidenceDescription?: string | null): ChallengeType {
  const haystack = `${title} ${evidenceDescription ?? ''}`.toLowerCase();

  if (haystack.includes('paso') || haystack.includes('step') || haystack.includes('walk')) {
    return 'steps';
  }

  if (haystack.includes('leer') || haystack.includes('lectura') || haystack.includes('page') || haystack.includes('página')) {
    return 'reading';
  }

  if (haystack.includes('azúcar') || haystack.includes('sugar') || haystack.includes('comida') || haystack.includes('desayuno')) {
    return 'nutrition';
  }

  if (haystack.includes('medita') || haystack.includes('respira') || haystack.includes('mindful')) {
    return 'mindfulness';
  }

  return 'photo';
}

export function getChallengeIcon(type: ChallengeType): string {
  switch (type) {
    case 'steps':
      return '👟';
    case 'reading':
      return '📚';
    case 'nutrition':
      return '🥗';
    case 'mindfulness':
      return '🧘';
    case 'photo':
    default:
      return '📸';
  }
}

export function getChallengeLabel(type: ChallengeType): string {
  switch (type) {
    case 'steps':
      return 'Pasos';
    case 'reading':
      return 'Lectura';
    case 'nutrition':
      return 'Nutrición';
    case 'mindfulness':
      return 'Bienestar';
    case 'photo':
    default:
      return 'Evidencia';
  }
}

export function getStartOfToday(): Date {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

export function getProgressPercent(currentStreak: number, durationDays: number): number {
  if (durationDays <= 0) return 0;
  return Math.min(100, Math.round((currentStreak / durationDays) * 100));
}

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CURRENT_CHALLENGE_KEY = 'currentChallengeId';
let currentChallengeCache: number | null | undefined;

export async function getCurrentChallengeId(): Promise<number | null> {
  if (currentChallengeCache !== undefined) {
    return currentChallengeCache;
  }

  const rawValue = Platform.OS === 'web'
    ? localStorage.getItem(CURRENT_CHALLENGE_KEY)
    : await SecureStore.getItemAsync(CURRENT_CHALLENGE_KEY);

  if (!rawValue) {
    currentChallengeCache = null;
    return currentChallengeCache;
  }

  const parsed = Number.parseInt(rawValue, 10);
  currentChallengeCache = Number.isNaN(parsed) ? null : parsed;
  return currentChallengeCache;
}

export async function setCurrentChallengeId(challengeId: number): Promise<void> {
  const value = String(challengeId);
  currentChallengeCache = challengeId;

  if (Platform.OS === 'web') {
    localStorage.setItem(CURRENT_CHALLENGE_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(CURRENT_CHALLENGE_KEY, value);
}

export async function clearCurrentChallengeId(): Promise<void> {
  currentChallengeCache = null;

  if (Platform.OS === 'web') {
    localStorage.removeItem(CURRENT_CHALLENGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(CURRENT_CHALLENGE_KEY);
}

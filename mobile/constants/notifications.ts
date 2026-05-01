import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { API_URL } from './api';
import { authHeaders, getToken } from './auth';

type UnreadListener = (count: number) => void;

const listeners = new Set<UnreadListener>();
let unreadCache = 0;
let lastUnreadRefreshAt = 0;
const UNREAD_REFRESH_INTERVAL_MS = 30000;

function emitUnreadCount() {
  listeners.forEach((listener) => listener(unreadCache));
}

async function syncNativeBadge() {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.setBadgeCountAsync(unreadCache);
  } catch {
    // Ignore badge sync failures on unsupported devices.
  }
}

export function getUnreadCountSnapshot() {
  return unreadCache;
}

export function subscribeUnreadCount(listener: UnreadListener) {
  listeners.add(listener);
  listener(unreadCache);

  return () => {
    listeners.delete(listener);
  };
}

export async function setUnreadCount(count: number) {
  unreadCache = Math.max(0, count);
  emitUnreadCount();
  await syncNativeBadge();
}

export async function decrementUnreadCount() {
  await setUnreadCount(Math.max(0, unreadCache - 1));
}

export async function refreshUnreadCount(force = false) {
  const now = Date.now();
  if (!force && now - lastUnreadRefreshAt < UNREAD_REFRESH_INTERVAL_MS) {
    emitUnreadCount();
    return unreadCache;
  }

  try {
    const token = await getToken();
    if (!token) {
      await setUnreadCount(0);
      return 0;
    }

    const response = await fetch(`${API_URL}/notifications`, {
      headers: authHeaders(token),
    });

    if (!response.ok) {
      return unreadCache;
    }

    const data = await response.json();
    lastUnreadRefreshAt = now;
    await setUnreadCount(data.unreadCount ?? 0);
    return unreadCache;
  } catch {
    return unreadCache;
  }
}

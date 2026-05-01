import { useState, useEffect } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { API_URL } from '../constants/api';
import { getToken } from '../constants/auth';
import { refreshUnreadCount } from '../constants/notifications';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

let cachedDevicePushToken: string | null = null;

function getChallengeRouteFromData(data: Record<string, unknown> | undefined) {
  const challengeId = data?.challengeId;
  if (typeof challengeId === 'string' && challengeId.length > 0) {
    return `/challenge/${challengeId}/leaderboard` as const;
  }

  return null;
}

function navigateFromNotificationData(data: Record<string, unknown> | undefined) {
  const route = getChallengeRouteFromData(data);
  if (route) {
    router.push(route);
    return true;
  }

  return false;
}

export async function syncPushTokenWithBackend() {
  if (!cachedDevicePushToken) return;

  try {
    const userToken = await getToken();
    if (!userToken) return;

    await fetch(`${API_URL}/auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        token: cachedDevicePushToken,
        platform: Platform.OS,
        deviceLabel: [Device.brand, Device.modelName].filter(Boolean).join(' ') || Device.deviceName || 'Unknown device',
      }),
    });
  } catch (e) {
    console.error('Failed to sync push token to backend', e);
  }
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        cachedDevicePushToken = token;
        setExpoPushToken(token);
        void syncPushTokenWithBackend();
      }
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;

      const didNavigate = navigateFromNotificationData(
        response.notification.request.content.data as Record<string, unknown> | undefined
      );
      void refreshUnreadCount(true);

      if (!didNavigate) {
        router.push('/(tabs)/notifications');
      }
    });

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void refreshUnreadCount(true);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void refreshUnreadCount(true);
      const didNavigate = navigateFromNotificationData(
        response.notification.request.content.data as Record<string, unknown> | undefined
      );
      if (!didNavigate) {
        router.push('/(tabs)/notifications');
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return expoPushToken;
}

async function registerForPushNotificationsAsync() {
  // Push notifications are not supported on web in Expo Go
  if (Platform.OS === 'web') return undefined;

  let token;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#39FF14',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return undefined;
    }
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } catch (e) {
      console.log('Could not get push token:', e);
      return undefined;
    }
  } else {
    console.log('Push notifications require a physical device');
  }

  return token;
}

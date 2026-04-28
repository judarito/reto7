import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://10.0.2.2:3000/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        sendTokenToBackend(token);
      }
    });
  }, []);

  const sendTokenToBackend = async (token: string) => {
    try {
      const userToken = Platform.OS !== 'web' 
        ? await SecureStore.getItemAsync('userToken') 
        : localStorage.getItem('userToken');

      if (!userToken) return;

      await fetch(`${API_URL}/auth/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ token }),
      });
    } catch (e) {
      console.error('Failed to send push token to backend', e);
    }
  };

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

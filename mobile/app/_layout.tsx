import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { getToken } from '../constants/auth';
import { usePushNotifications } from '../hooks/usePushNotifications';

function AppInitializer() {
  usePushNotifications(); // Register push token on boot
  return null;
}

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = await getToken();
      if (token) {
        router.replace('/(tabs)/dashboard');
      }
    } catch (e) {
      // No token — stay on login
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <AppInitializer />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#121212' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="create-challenge" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { getToken } from '../constants/auth';
import { refreshUnreadCount } from '../constants/notifications';
import { usePushNotifications } from '../hooks/usePushNotifications';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if the splash screen is already being managed.
});

function AppInitializer() {
  usePushNotifications(); // Register push token on boot
  return null;
}

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  useEffect(() => {
    void checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = await getToken();
      if (token) {
        setPendingRedirect('/(tabs)/dashboard');
        void refreshUnreadCount(true);
      }
    } catch {
      // No token — stay on login
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading || !pendingRedirect) return;

    const frame = requestAnimationFrame(() => {
      router.replace(pendingRedirect as '/(tabs)/dashboard');
      setPendingRedirect(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [isLoading, pendingRedirect]);

  useEffect(() => {
    if (isLoading) return;

    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => {
        // Splash may already be hidden in development reloads.
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isLoading]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <AppInitializer />
        <View style={{ flex: 1 }} onLayout={() => {
          if (!isLoading) {
            void SplashScreen.hideAsync().catch(() => {
              // Splash may already be hidden in development reloads.
            });
          }
        }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#121212' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
            <Stack.Screen name="create-challenge" options={{ presentation: 'modal' }} />
          </Stack>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

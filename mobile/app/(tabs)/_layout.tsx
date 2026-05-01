import { Tabs, useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUnreadCountSnapshot, refreshUnreadCount, subscribeUnreadCount } from '../../constants/notifications';

function useUnreadNotifications() {
  const [unread, setUnread] = useState(getUnreadCountSnapshot());

  useEffect(() => subscribeUnreadCount(setUnread), []);

  // Refresh on every focus of any tab
  useFocusEffect(useCallback(() => { void refreshUnreadCount(); }, []));

  return unread;
}

function TabBarIcon({ emoji, color, badge }: { emoji: string; color: string; badge?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, opacity: color === '#39FF14' ? 1 : 0.5 }}>{emoji}</Text>
      {badge != null && badge > 0 && (
        <View style={{
          position: 'absolute', top: -4, right: -8,
          backgroundColor: '#FF5F1F', borderRadius: 8,
          minWidth: 16, height: 16, paddingHorizontal: 3,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: 'white', fontSize: 9, fontWeight: '900' }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const unreadCount = useUnreadNotifications();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#121212',
        borderTopWidth: 1,
        borderTopColor: '#222',
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 5,
        height: 60 + Math.max(insets.bottom, 8),
      },
      tabBarActiveTintColor: '#39FF14',
      tabBarInactiveTintColor: '#666',
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
    }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <TabBarIcon emoji="👥" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color }) => <TabBarIcon emoji="🔍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color }) => <TabBarIcon emoji="🔔" color={color} badge={unreadCount} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabBarIcon emoji="😎" color={color} />,
        }}
      />
    </Tabs>
  );
}

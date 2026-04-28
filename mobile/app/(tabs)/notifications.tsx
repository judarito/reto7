import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { API_URL } from '../../constants/api';
import { getToken, authHeaders } from '../../constants/auth';

interface Notification {
  id: number;
  type: 'nudge' | 'streak_danger' | 'challenge_joined' | 'new_member' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: string; accent: string }> = {
  nudge:           { icon: '⚠️', accent: '#FF5F1F' },
  streak_danger:   { icon: '🔥', accent: '#FF5F1F' },
  challenge_joined:{ icon: '🎉', accent: '#39FF14' },
  new_member:      { icon: '👥', accent: '#39FF14' },
  system:          { icon: '👋', accent: '#888' },
};

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/notifications`, {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: authHeaders(token),
      });
    } catch (e) { /* silent */ }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: authHeaders(token),
      });
    } catch (e) { /* silent */ }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: '#222',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>
            Notificaciones
          </Text>
          {unreadCount > 0 && (
            <View style={{
              backgroundColor: '#FF5F1F', borderRadius: 10, minWidth: 20, height: 20,
              justifyContent: 'center', alignItems: 'center', marginLeft: 10, paddingHorizontal: 5,
            }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 11 }}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={{ color: '#39FF14', fontSize: 12, fontWeight: '700' }}>Marcar todo leído</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} tintColor="#39FF14" />}
        >
          {notifications.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>🔔</Text>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 18, marginBottom: 8 }}>Sin notificaciones</Text>
              <Text style={{ color: '#666', textAlign: 'center', fontSize: 14 }}>
                Cuando alguien te haga un nudge o alguien se una a tus retos, lo verás aquí.
              </Text>
            </View>
          ) : (
            <View style={{ padding: 16 }}>
              {notifications.map((notif) => {
                const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
                return (
                  <TouchableOpacity
                    key={notif.id}
                    onPress={() => !notif.isRead && markAsRead(notif.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{
                      flexDirection: 'row',
                      backgroundColor: notif.isRead ? '#1A1A1A' : '#1E1E1E',
                      borderRadius: 16, padding: 14, marginBottom: 10,
                      borderWidth: 1,
                      borderColor: notif.isRead ? 'rgba(255,255,255,0.05)' : config.accent + '33',
                      borderLeftWidth: notif.isRead ? 1 : 3,
                      borderLeftColor: notif.isRead ? 'rgba(255,255,255,0.05)' : config.accent,
                    }}>
                      {/* Icon */}
                      <View style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: config.accent + '15',
                        justifyContent: 'center', alignItems: 'center',
                        marginRight: 12, flexShrink: 0,
                      }}>
                        <Text style={{ fontSize: 18 }}>{config.icon}</Text>
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <Text style={{
                            color: notif.isRead ? '#ccc' : 'white',
                            fontWeight: notif.isRead ? '600' : '800',
                            fontSize: 14, flex: 1, marginRight: 8,
                          }}>
                            {notif.title}
                          </Text>
                          <Text style={{ color: '#555', fontSize: 11, flexShrink: 0 }}>
                            {formatRelativeTime(notif.createdAt)}
                          </Text>
                        </View>
                        <Text style={{ color: '#888', fontSize: 13, lineHeight: 18 }}>{notif.body}</Text>
                      </View>

                      {/* Unread dot */}
                      {!notif.isRead && (
                        <View style={{
                          position: 'absolute', top: 14, right: 14,
                          width: 8, height: 8, borderRadius: 4,
                          backgroundColor: config.accent,
                        }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

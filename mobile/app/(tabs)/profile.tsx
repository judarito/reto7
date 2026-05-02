import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { API_URL, ApiTimeoutError, fetchWithRetry } from '../../constants/api';
import { getToken, authHeaders, clearToken } from '../../constants/auth';
import { clearCurrentChallengeId } from '../../constants/challenge';
import { TabScreen } from '../../components/TabScreen';
import { TabScrollView } from '../../components/TabScrollView';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  totalStreak: number;
  streakFreezesInventory: number;
  streakFreezeGoldInventory: number;
  streakFreezePlatinumInventory: number;
  activeChallengesCount: number;
  completedChallengesCount: number;
  bestStreak: number;
  xp: number;
  level: number;
  reminderTime: string;
  trophies: {
    id: number;
    challengeId: number;
    title: string;
    earnedAt: string;
    challengeIcon: string;
    challengeLabel: string;
  }[];
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState(false);
  const [reminderInput, setReminderInput] = useState('19:00');

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/'); return; }

      setErrorMessage(null);
      const res = await fetchWithRetry(`${API_URL}/users/me`, { headers: authHeaders(token) });

      if (res.status === 401 || res.status === 403) {
        await clearCurrentChallengeId();
        await clearToken();
        router.replace('/');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data);
      setReminderInput(data.reminderTime ?? '19:00');
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof ApiTimeoutError ? e.message : 'No se pudo cargar el perfil.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await clearCurrentChallengeId();
    await clearToken();
    router.replace('/');
  };

  const saveReminderTime = async () => {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(reminderInput)) {
      setErrorMessage('Formato inválido. Usa HH:MM (ej. 19:00)');
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_URL}/users/me/settings`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ reminderTime: reminderInput }),
      });
      setProfile(p => p ? { ...p, reminderTime: reminderInput } : p);
      setEditingReminder(false);
    } catch { /* silent */ }
  };

  return (
    <TabScreen>
      <TabScrollView
        className="flex-1 px-6 pt-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor="#39FF14" />}
      >
        
        {/* Profile Header */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-gray-700 border-2 border-neonGreen justify-center items-center mb-4">
            <Text className="text-4xl">😎</Text>
          </View>
          <Text className="text-white text-3xl font-black uppercase tracking-widest">
            {loading ? '...' : profile?.username ?? 'Usuario'}
          </Text>
          <Text className="text-gray-500 text-sm mt-1">{profile?.email}</Text>
        </View>

        {errorMessage ? (
          <View className="bg-[#1A1A1A] rounded-2xl border border-red-500/20 p-4 mb-6">
            <Text className="text-red-400 font-bold mb-1">No pudimos actualizar tu perfil</Text>
            <Text className="text-gray-400 text-sm">{errorMessage}</Text>
          </View>
        ) : null}

        {/* Stats Row */}
        <View className="flex-row justify-between mb-10">
          <View className="bg-[#1A1A1A] rounded-3xl p-5 flex-1 mr-2 border border-white/5 items-center">
            <Text className="text-neonOrange text-3xl mb-2">🔥</Text>
            <Text className="text-white text-2xl font-black">
              {loading ? '-' : profile?.activeChallengesCount ?? 0}
            </Text>
            <Text className="text-gray-400 text-xs font-bold uppercase mt-1 text-center">Retos Activos</Text>
          </View>
          <View className="bg-[#1A1A1A] rounded-3xl p-5 flex-1 mx-1 border border-white/5 items-center">
            <Text className="text-white text-3xl mb-2">🏁</Text>
            <Text className="text-white text-2xl font-black">
              {loading ? '-' : profile?.completedChallengesCount ?? 0}
            </Text>
            <Text className="text-gray-400 text-xs font-bold uppercase mt-1 text-center">Completados</Text>
          </View>
          <View className="bg-[#1A1A1A] rounded-3xl p-5 flex-1 ml-2 border border-white/5 items-center">
            <Text className="text-blue-400 text-3xl mb-2">🛡️</Text>
            <Text className="text-white text-2xl font-black">
              {loading ? '-' : profile?.streakFreezesInventory ?? 0}
            </Text>
            <Text className="text-gray-400 text-xs font-bold uppercase mt-1 text-center">Escudo</Text>
          </View>
        </View>

        {/* Multi-escudos */}
        {profile && (
          <View className="bg-[#1A1A1A] rounded-3xl p-4 border border-white/5 mb-5 flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl mb-1">🛡️</Text>
              <Text className="text-white font-black">{profile.streakFreezesInventory}</Text>
              <Text className="text-gray-500 text-[10px] uppercase">Normal</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl mb-1">🛡️✨</Text>
              <Text className="text-yellow-400 font-black">{profile.streakFreezeGoldInventory}</Text>
              <Text className="text-gray-500 text-[10px] uppercase">Oro</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl mb-1">💎</Text>
              <Text className="text-neonGreen font-black">{profile.streakFreezePlatinumInventory}</Text>
              <Text className="text-gray-500 text-[10px] uppercase">Platino</Text>
            </View>
          </View>
        )}

        {/* XP & Level */}
        <View className="bg-[#1A1A1A] rounded-3xl p-5 border border-white/5 mb-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">⭐</Text>
              <View>
                <Text className="text-gray-400 text-xs uppercase tracking-widest">Nivel</Text>
                <Text className="text-white text-3xl font-black">{loading ? '-' : profile?.level ?? 1}</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-gray-500 text-xs uppercase tracking-wider">XP Total</Text>
              <Text className="text-neonGreen text-xl font-black">{loading ? '-' : profile?.xp ?? 0}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#1A1A1A] rounded-3xl p-5 border border-white/5 mb-8">
          <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Resumen</Text>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-gray-500 text-xs uppercase tracking-wider">Racha total</Text>
              <Text className="text-white text-2xl font-black">{loading ? '-' : profile?.totalStreak ?? 0}</Text>
            </View>
            <View>
              <Text className="text-gray-500 text-xs uppercase tracking-wider">Mejor racha</Text>
              <Text className="text-neonGreen text-2xl font-black">{loading ? '-' : profile?.bestStreak ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Trophies Grid */}
        <Text className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-4">Sala de Trofeos</Text>

        {profile?.trophies?.length ? (
          <View className="flex-row flex-wrap justify-between">
            {profile.trophies.map((trophy) => (
              <View
                key={trophy.id}
                className="w-[30%] aspect-square bg-[#1A1A1A] rounded-2xl mb-4 border border-neonGreen/30 bg-neonGreen/10 items-center justify-center"
              >
                <Text className="text-4xl mb-2">{trophy.challengeIcon}</Text>
                <Text className="text-white text-[10px] font-bold text-center px-1" numberOfLines={2}>
                  {trophy.title}
                </Text>
                <Text className="text-neonGreen text-[9px] font-bold mt-1">
                  {new Date(trophy.earnedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 items-center">
            <Text className="text-4xl mb-3">🏆</Text>
            <Text className="text-white font-bold mb-1">Todavía sin trofeos</Text>
            <Text className="text-gray-400 text-sm text-center">Completa un reto para desbloquear tu primera insignia real.</Text>
          </View>
        )}

        {/* Recordatorio push */}
        <View className="bg-[#1A1A1A] rounded-3xl p-5 border border-white/5 mb-5">
          <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">🔔 Recordatorio Diario</Text>
          {editingReminder ? (
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 bg-[#121212] text-white p-3 rounded-xl border border-neonGreen/30 text-lg font-black text-center"
                value={reminderInput}
                onChangeText={setReminderInput}
                placeholder="19:00"
                placeholderTextColor="#555"
                maxLength={5}
              />
              <TouchableOpacity className="ml-3 bg-neonGreen py-3 px-5 rounded-xl" onPress={saveReminderTime}>
                <Text className="text-black font-black text-sm">Guardar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity className="flex-row justify-between items-center" onPress={() => setEditingReminder(true)}>
              <View>
                <Text className="text-gray-500 text-xs">Hora de recordatorio</Text>
                <Text className="text-white text-2xl font-black">{profile?.reminderTime ?? '19:00'}</Text>
              </View>
              <Text className="text-gray-500">✏️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="mt-6 mb-10 border border-red-500/30 py-4 rounded-2xl items-center"
          onPress={handleLogout}
        >
          <Text className="text-red-400 font-bold uppercase tracking-widest">Cerrar Sesión</Text>
        </TouchableOpacity>

      </TabScrollView>
    </TabScreen>
  );
}

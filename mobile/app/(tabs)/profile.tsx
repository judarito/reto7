import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, RefreshControl } from 'react-native';
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
  activeChallengesCount: number;
  completedChallengesCount: number;
  bestStreak: number;
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
            <Text className="text-gray-400 text-xs font-bold uppercase mt-1 text-center">Escudos</Text>
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

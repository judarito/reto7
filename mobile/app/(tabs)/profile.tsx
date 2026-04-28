import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { API_URL } from '../../constants/api';
import { getToken, authHeaders, clearToken } from '../../constants/auth';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  totalStreak: number;
  streakFreezesInventory: number;
  activeChallengesCount: number;
}

const mockTrophies = [
  { id: 1, name: '10K Pasos', icon: '👟', earned: true },
  { id: 2, name: 'Agua', icon: '💧', earned: true },
  { id: 3, name: 'Lectura', icon: '📚', earned: false },
  { id: 4, name: 'Meditación', icon: '🧘', earned: false },
  { id: 5, name: 'Despertar', icon: '🌅', earned: false },
  { id: 6, name: 'Gym 5x', icon: '🏋️', earned: false },
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      const res = await fetch(`${API_URL}/users/me`, { headers: authHeaders(token) });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await clearToken();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
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
            <Text className="text-white text-3xl mb-2">🔥</Text>
            <Text className="text-white text-2xl font-black">
              {loading ? '-' : profile?.totalStreak ?? 0}
            </Text>
            <Text className="text-gray-400 text-xs font-bold uppercase mt-1 text-center">Racha Total</Text>
          </View>
          <View className="bg-[#1A1A1A] rounded-3xl p-5 flex-1 ml-2 border border-white/5 items-center">
            <Text className="text-blue-400 text-3xl mb-2">🛡️</Text>
            <Text className="text-white text-2xl font-black">
              {loading ? '-' : profile?.streakFreezesInventory ?? 0}
            </Text>
            <Text className="text-gray-400 text-xs font-bold uppercase mt-1 text-center">Escudos</Text>
          </View>
        </View>

        {/* Trophies Grid */}
        <Text className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-4">Sala de Trofeos</Text>
        
        <View className="flex-row flex-wrap justify-between">
          {mockTrophies.map((trophy) => (
            <View
              key={trophy.id}
              className={`w-[30%] aspect-square bg-[#1A1A1A] rounded-2xl mb-4 border items-center justify-center ${
                trophy.earned ? 'border-neonGreen/30 bg-neonGreen/10' : 'border-white/5 opacity-40'
              }`}
            >
              <Text className="text-4xl mb-2">{trophy.icon}</Text>
              <Text className="text-white text-[10px] font-bold text-center px-1" numberOfLines={1}>
                {trophy.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="mt-6 mb-10 border border-red-500/30 py-4 rounded-2xl items-center"
          onPress={handleLogout}
        >
          <Text className="text-red-400 font-bold uppercase tracking-widest">Cerrar Sesión</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

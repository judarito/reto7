import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL, fetchWithTimeout } from '../../constants/api';

interface PublicProfile {
  id: number;
  username: string;
  totalStreak: number;
  xp: number;
  level: number;
  activeChallengesCount: number;
  completedChallengesCount: number;
  bestStreak: number;
  trophies: { id: number; title: string; earnedAt: string; challengeIcon: string; challengeLabel: string }[];
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/users/${id}`);
      if (res.ok) setProfile(await res.json());
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#39FF14" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center px-8">
        <Text className="text-5xl mb-4">🔍</Text>
        <Text className="text-white text-xl font-black mb-2">Usuario no encontrado</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-neonGreen font-bold">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const xpForNextLevel = Math.pow(profile.level, 2) * 100;
  const xpProgress = profile.level > 1 ? ((profile.xp % xpForNextLevel) / xpForNextLevel) * 100 : Math.min(100, (profile.xp / 100) * 100);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="px-6 pt-4 pb-4 border-b border-[#222] flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-white text-3xl">‹</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-black tracking-widest uppercase" numberOfLines={1}>
          @{profile.username}
        </Text>
      </View>

      <View className="flex-1 px-6 pt-8">
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-gray-700 border-2 border-neonGreen justify-center items-center mb-3">
            <Text className="text-3xl">😎</Text>
          </View>
          <Text className="text-white text-2xl font-black uppercase tracking-widest">@{profile.username}</Text>
          <View className="mt-2 bg-neonGreen/10 border border-neonGreen/30 px-4 py-1 rounded-full">
            <Text className="text-neonGreen text-xs font-bold">⭐ Nivel {profile.level}</Text>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row justify-between mb-8">
          <View className="bg-[#1A1A1A] rounded-3xl p-5 flex-1 mr-2 border border-white/5 items-center">
            <Text className="text-neonOrange text-3xl mb-2">🔥</Text>
            <Text className="text-white text-2xl font-black">{profile.activeChallengesCount}</Text>
            <Text className="text-gray-400 text-xs font-bold uppercase mt-1 text-center">Activos</Text>
          </View>
          <View className="bg-[#1A1A1A] rounded-3xl p-5 flex-1 mx-1 border border-white/5 items-center">
            <Text className="text-white text-3xl mb-2">🏁</Text>
            <Text className="text-white text-2xl font-black">{profile.completedChallengesCount}</Text>
            <Text className="text-gray-400 text-xs font-bold uppercase mt-1 text-center">Logros</Text>
          </View>
          <View className="bg-[#1A1A1A] rounded-3xl p-5 flex-1 ml-2 border border-white/5 items-center">
            <Text className="text-blue-400 text-3xl mb-2">💪</Text>
            <Text className="text-white text-2xl font-black">{profile.bestStreak}</Text>
            <Text className="text-gray-400 text-xs font-bold uppercase mt-1 text-center">Mejor</Text>
          </View>
        </View>

        {/* Trofeos */}
        {profile.trophies.length > 0 && (
          <>
            <Text className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-4">🏆 Trofeos</Text>
            <View className="flex-row flex-wrap justify-between">
              {profile.trophies.map((trophy) => (
                <View key={trophy.id} className="w-[30%] aspect-square bg-[#1A1A1A] rounded-2xl mb-4 border border-neonGreen/30 bg-neonGreen/10 items-center justify-center">
                  <Text className="text-4xl mb-2">{trophy.challengeIcon}</Text>
                  <Text className="text-white text-[10px] font-bold text-center px-1" numberOfLines={2}>{trophy.title}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

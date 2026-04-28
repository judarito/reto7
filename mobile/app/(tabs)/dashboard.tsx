import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { HealthSyncService } from '../../services/healthSync';
import { API_URL } from '../../constants/api';
import { getToken, authHeaders } from '../../constants/auth';
import { useEffect } from 'react';

interface Challenge {
  challengeId: number;
  title: string;
  durationDays: number;
  currentStreak: number;
  status: string;
  isNumeric?: boolean;
}

interface UserProfile {
  username: string;
  totalStreak: number;
  streakFreezesInventory: number;
  activeChallengesCount: number;
}

function PulsingFlame() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800 }),
        withTiming(1.0, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[
        animatedStyle,
        { fontSize: 110, textShadowColor: 'rgba(255, 95, 31, 0.8)', textShadowRadius: 30, textShadowOffset: { width: 0, height: 0 } }
      ]}
    >
      🔥
    </Animated.Text>
  );
}

export default function DashboardScreen() {
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await getToken();
      if (!token) { router.replace('/'); return; }

      const headers = authHeaders(token);
      const [challengesRes, profileRes] = await Promise.all([
        fetch(`${API_URL}/challenges/active`, { headers }),
        fetch(`${API_URL}/users/me`, { headers }),
      ]);

      if (!challengesRes.ok || !profileRes.ok) throw new Error('Failed to fetch');

      const challengesData = await challengesRes.json();
      const profileData = await profileRes.json();

      const enriched = challengesData.map((c: Challenge) => ({
        ...c,
        isNumeric: c.title.toLowerCase().includes('paso') || c.title.toLowerCase().includes('step'),
      }));

      setActiveChallenges(enriched);
      setProfile(profileData);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSync = async (challengeId: number) => {
    setSyncingId(challengeId);
    await HealthSyncService.syncSteps();
    setSyncingId(null);
    loadData();
  };

  const handleChallengePress = (challenge: Challenge) => {
    if (challenge.status === 'broken') { router.push('/paywall'); return; }
    router.push(`/challenge/${challenge.challengeId}/leaderboard`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#39FF14" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-6 pt-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#39FF14" />}
      >
        {profile && (
          <Text className="text-gray-400 text-base font-bold uppercase tracking-widest mb-2 text-center">
            ¡Hola, {profile.username}! 💪
          </Text>
        )}

        <View className="items-center mb-10 mt-2">
          <View className="flex-row items-center justify-center">
            <PulsingFlame />
            <View className="ml-4">
              <Text className="text-white text-7xl font-black">{profile?.totalStreak ?? 0}</Text>
              <Text className="text-gray-500 text-xs uppercase tracking-widest">Racha Global</Text>
            </View>
          </View>
          {profile && profile.streakFreezesInventory > 0 && (
            <View className="flex-row items-center mt-3 bg-[#1A1A1A] px-4 py-2 rounded-full border border-white/5">
              <Text className="text-blue-400 mr-2">🛡️</Text>
              <Text className="text-gray-300 text-xs font-bold">
                {profile.streakFreezesInventory} Escudo{profile.streakFreezesInventory > 1 ? 's' : ''} disponible{profile.streakFreezesInventory > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <Text className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-4">Tus Retos Activos</Text>

        {activeChallenges.length === 0 ? (
          <View className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5 items-center">
            <Text className="text-4xl mb-3">🎯</Text>
            <Text className="text-white font-bold text-lg mb-2">Sin retos todavía</Text>
            <Text className="text-gray-400 text-sm text-center mb-4">Ve a la pestaña Explorar y únete a tu primer reto</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <View className="bg-neonGreen/20 border border-neonGreen/50 px-6 py-3 rounded-xl">
                <Text className="text-neonGreen font-black uppercase tracking-widest">Explorar Retos 🔍</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {activeChallenges.map((challenge, index) => (
              <View
                key={challenge.challengeId}
                className={`bg-[#1A1A1A] rounded-3xl p-5 border ${
                  challenge.status === 'completed' ? 'border-neonGreen/30' :
                  challenge.status === 'broken' ? 'border-red-500/30' : 'border-white/5'
                } ${index > 0 ? 'mt-4' : ''}`}
              >
                <TouchableOpacity onPress={() => handleChallengePress(challenge)}>
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white text-xl font-bold flex-1 mr-2" numberOfLines={1}>{challenge.title}</Text>
                    <Text className="text-white text-xl">🏆</Text>
                  </View>
                  <View className="flex-row justify-between items-center mb-4">
                    <View className={`px-3 py-1 rounded-full ${
                      challenge.status === 'completed' ? 'bg-neonGreen/20' :
                      challenge.status === 'broken' ? 'bg-red-500/20' : 'bg-white/10'
                    }`}>
                      <Text className={`text-xs font-bold ${
                        challenge.status === 'completed' ? 'text-neonGreen' :
                        challenge.status === 'broken' ? 'text-red-400' : 'text-gray-300'
                      }`}>
                        {challenge.status === 'completed' ? 'Completado ✅' :
                         challenge.status === 'broken' ? '¡Racha Rota! 💔' : 'Pendiente'}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-neonOrange text-sm mr-1">🔥</Text>
                      <Text className="text-gray-300 font-medium">{challenge.currentStreak} días</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {challenge.status !== 'completed' && !challenge.isNumeric && (
                  <TouchableOpacity
                    className="w-full bg-white/10 py-3 rounded-2xl items-center border border-white/10"
                    onPress={() => router.push('/camera')}
                  >
                    <Text className="text-white font-bold tracking-widest uppercase">Subir Prueba 📸</Text>
                  </TouchableOpacity>
                )}

                {challenge.status !== 'completed' && challenge.isNumeric && (
                  <TouchableOpacity
                    className="w-full bg-[#111] py-3 rounded-2xl items-center border border-neonGreen/50 flex-row justify-center"
                    onPress={() => handleSync(challenge.challengeId)}
                    disabled={syncingId === challenge.challengeId}
                  >
                    {syncingId === challenge.challengeId ? (
                      <ActivityIndicator color="#39FF14" />
                    ) : (
                      <Text className="text-neonGreen font-bold tracking-widest uppercase">Sincronizar Reloj ⌚</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}

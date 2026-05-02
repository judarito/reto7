import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { API_URL, ApiTimeoutError, fetchWithRetry } from '../../constants/api';
import { getToken, authHeaders, clearToken } from '../../constants/auth';
import { setCurrentChallengeId, clearCurrentChallengeId } from '../../constants/challenge';
import { TabScreen } from '../../components/TabScreen';
import { TabScrollView } from '../../components/TabScrollView';

interface Challenge {
  challengeId: number;
  title: string;
  durationDays: number;
  evidenceDescription?: string | null;
  currentStreak: number;
  status: string;
  challengeType: 'steps' | 'reading' | 'nutrition' | 'mindfulness' | 'photo';
  challengeIcon: string;
  challengeLabel: string;
  checkedInToday: boolean;
  daysRemaining: number;
  progressPercent: number;
}

interface UserProfile {
  username: string;
  totalStreak: number;
  streakFreezesInventory: number;
  activeChallengesCount: number;
  completedChallengesCount: number;
  bestStreak: number;
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
  }, [scale]);

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(null);
      const [challengesRes, profileRes] = await Promise.all([
        fetchWithRetry(`${API_URL}/challenges/active`, { headers }),
        fetchWithRetry(`${API_URL}/users/me`, { headers }),
      ]);

      // Sesión expirada o token inválido → volver al login
      if (challengesRes.status === 401 || challengesRes.status === 403 ||
          profileRes.status === 401 || profileRes.status === 403) {
        await clearCurrentChallengeId();
        await clearToken();
        router.replace('/');
        return;
      }

      if (!challengesRes.ok || !profileRes.ok) {
        const statusCh = challengesRes.status;
        const statusPr = profileRes.status;
        throw new Error(`Failed to fetch (challenges: ${statusCh}, profile: ${statusPr})`);
      }

      const challengesData = await challengesRes.json();
      const profileData = await profileRes.json();

      setActiveChallenges(challengesData);
      setProfile(profileData);
    } catch (e) {
      console.error('Dashboard load error:', e);
      setErrorMessage(e instanceof ApiTimeoutError ? e.message : 'No se pudo cargar el dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChallengePress = (challenge: Challenge) => {
    void setCurrentChallengeId(challenge.challengeId);
    if (challenge.status === 'broken') {
      router.push({
        pathname: '/paywall',
        params: {
          challengeId: String(challenge.challengeId),
          challengeTitle: challenge.title,
          currentStreak: String(challenge.currentStreak),
        },
      });
      return;
    }
    router.push(`/challenge/${challenge.challengeId}/leaderboard`);
  };

  const handleUploadEvidence = (challenge: Challenge) => {
    void setCurrentChallengeId(challenge.challengeId);
    router.push({
      pathname: '/camera',
      params: {
        challengeId: String(challenge.challengeId),
        challengeTitle: challenge.title,
      },
    });
  };

  if (loading) {
    return (
      <TabScreen className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#39FF14" />
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <TabScrollView
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

        <Text className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-4">Tus Retos</Text>

        {activeChallenges.length === 0 ? (
          <View className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5 items-center">
            <Text className="text-4xl mb-3">🎯</Text>
            <Text className="text-white font-bold text-lg mb-2">{errorMessage ? 'No pudimos cargar tus retos' : 'Sin retos todavía'}</Text>
            <Text className="text-gray-400 text-sm text-center mb-4">
              {errorMessage ? errorMessage : 'Ve a la pestaña Explorar y únete a tu primer reto'}
            </Text>
            {errorMessage ? (
              <TouchableOpacity onPress={() => loadData()}>
                <View className="bg-neonOrange/20 border border-neonOrange/50 px-6 py-3 rounded-xl">
                  <Text className="text-neonOrange font-black uppercase tracking-widest">Reintentar</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
                <View className="bg-neonGreen/20 border border-neonGreen/50 px-6 py-3 rounded-xl">
                  <Text className="text-neonGreen font-black uppercase tracking-widest">Explorar Retos 🔍</Text>
                </View>
              </TouchableOpacity>
            )}
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

                <View className="mb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-400 text-xs uppercase tracking-wider">
                      {challenge.challengeIcon} {challenge.challengeLabel}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {challenge.currentStreak}/{challenge.durationDays} días
                    </Text>
                  </View>
                  <View className="h-2 rounded-full bg-[#111] overflow-hidden">
                    <View
                      className="h-full bg-neonGreen"
                      style={{ width: `${challenge.progressPercent}%` }}
                    />
                  </View>
                  <View className="flex-row justify-between items-center mt-2">
                    <Text className={`text-xs font-bold ${challenge.checkedInToday ? 'text-neonGreen' : 'text-gray-400'}`}>
                      {challenge.checkedInToday ? 'Check-in de hoy listo' : 'Aún pendiente hoy'}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {challenge.daysRemaining} día{challenge.daysRemaining === 1 ? '' : 's'} para completar
                    </Text>
                  </View>
                  {challenge.evidenceDescription ? (
                    <Text className="text-gray-500 text-xs mt-2" numberOfLines={2}>
                      {challenge.evidenceDescription}
                    </Text>
                  ) : null}
                </View>

                {challenge.status !== 'completed' && (
                  <TouchableOpacity
                    className={`w-full py-3 rounded-2xl items-center border ${challenge.checkedInToday ? 'bg-neonGreen/10 border-neonGreen/30' : 'bg-white/10 border-white/10'}`}
                    onPress={() => handleUploadEvidence(challenge)}
                    disabled={challenge.checkedInToday}
                  >
                    <Text className={`font-bold tracking-widest uppercase ${challenge.checkedInToday ? 'text-neonGreen' : 'text-white'}`}>
                      {challenge.checkedInToday ? 'Prueba subida hoy ✅' : 'Subir Prueba 📸'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </TabScrollView>
    </TabScreen>
  );
}

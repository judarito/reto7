import { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Share, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { API_URL } from '../../../constants/api';
import { getToken, authHeaders } from '../../../constants/auth';

interface LeaderboardEntry {
  id: number;
  username: string;
  currentStreak: number;
}

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams();
  const [challenge, setChallenge] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      const token = await getToken();
      if (!token) { router.replace('/'); return; }

      const headers = authHeaders(token);

      const [challengeRes, leaderboardRes, meRes] = await Promise.all([
        fetch(`${API_URL}/challenges/${id}`, { headers }),
        fetch(`${API_URL}/leaderboard/${id}`, { headers }),
        fetch(`${API_URL}/users/me`, { headers }),
      ]);

      if (challengeRes.ok) setChallenge(await challengeRes.json());
      if (leaderboardRes.ok) setLeaderboard(await leaderboardRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentUserId(me.id);
      }
    } catch (e) {
      console.error('Leaderboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!challenge?.inviteCode) return;
    try {
      await Share.share({
        message: `🔥 ¡Únete a mi reto "${challenge.title}" en Reto7! Ingresa este código: ${challenge.inviteCode}`,
      });
    } catch (e: any) {
      console.error(e.message);
    }
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-6 pb-4 border-b border-[#222]">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Text className="text-white text-3xl">‹</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-black tracking-widest uppercase flex-1" numberOfLines={1}>
            {challenge ? challenge.title : 'LEADERBOARD'}
          </Text>
        </View>

        {challenge?.inviteCode && (
          <TouchableOpacity
            className="bg-neonOrange/20 border border-neonOrange/50 py-2 rounded-xl flex-row justify-center items-center mt-2"
            onPress={handleShare}
          >
            <Text className="text-neonOrange mr-2">🔗</Text>
            <Text className="text-neonOrange font-bold text-xs tracking-widest uppercase">
              Invitar Amigos — Código: {challenge.inviteCode}
            </Text>
          </TouchableOpacity>
        )}

        {challenge?.evidenceDescription && (
          <View style={{
            backgroundColor: 'rgba(57,255,20,0.07)',
            borderWidth: 1, borderColor: 'rgba(57,255,20,0.2)',
            borderRadius: 10, padding: 10,
            flexDirection: 'row', alignItems: 'flex-start', marginTop: 8,
          }}>
            <Text style={{ fontSize: 14, marginRight: 8 }}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#39FF14', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                Evidencia diaria requerida
              </Text>
              <Text style={{ color: '#ccc', fontSize: 12 }}>{challenge.evidenceDescription}</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {loading ? (
          <ActivityIndicator color="#39FF14" size="large" className="mt-10" />
        ) : leaderboard.length === 0 ? (
          <View className="items-center mt-20">
            <Text className="text-5xl mb-4">🏆</Text>
            <Text className="text-white font-bold text-lg mb-2">Sin competidores aún</Text>
            <Text className="text-gray-400 text-sm text-center">
              Comparte el código e invita amigos al reto
            </Text>
          </View>
        ) : (
          <View>
            {leaderboard.map((user, index) => {
              const isMe = user.id === currentUserId;
              return (
                <View
                  key={user.id}
                  className={`flex-row items-center p-4 rounded-2xl border mb-3 ${
                    isMe
                      ? 'bg-neonGreen/10 border-neonGreen'
                      : 'bg-[#1A1A1A] border-white/5'
                  }`}
                >
                  <Text className={`font-black text-xl mr-4 w-8 text-center ${isMe ? 'text-neonGreen' : 'text-gray-500'}`}>
                    {getMedalEmoji(index)}
                  </Text>

                  <View className="w-10 h-10 rounded-full bg-gray-600 mr-3 justify-center items-center">
                    <Text className="text-lg">👤</Text>
                  </View>

                  <Text className={`flex-1 font-bold ${isMe ? 'text-neonGreen' : 'text-white'}`}>
                    {user.username.toUpperCase()} {isMe && '(Tú)'}
                  </Text>

                  <View className="flex-row items-center">
                    <Text className="text-neonOrange text-lg mr-1">🔥</Text>
                    <Text className={`font-black text-lg ${isMe ? 'text-neonGreen' : 'text-white'}`}>
                      {user.currentStreak}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}

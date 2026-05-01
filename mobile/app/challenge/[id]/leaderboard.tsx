import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../../constants/api';
import { getToken, authHeaders } from '../../../constants/auth';
import { setCurrentChallengeId } from '../../../constants/challenge';
import { HeaderActionButton } from '../../../components/HeaderActionButton';
import { usePendingAction } from '../../../hooks/usePendingAction';

interface LeaderboardEntry {
  id: number;
  username: string;
  currentStreak: number;
}

interface ChallengeHistory {
  currentStreak: number;
  status: string;
  completedAt: string | null;
  history: { date: string; photoUrl: string }[];
}

interface ActiveParticipant {
  id: number;
  username: string;
  currentStreak: number;
}

interface ChallengeDetails {
  id: number;
  title: string;
  inviteCode?: string | null;
  evidenceDescription?: string | null;
  creatorId?: number | null;
  creatorUsername?: string | null;
  activeParticipantsCount?: number;
  activeParticipants?: ActiveParticipant[];
}

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams();
  const [challenge, setChallenge] = useState<ChallengeDetails | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [history, setHistory] = useState<ChallengeHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const { isPending: leavingScreen, runPendingAction: runLeavingAction } = usePendingAction();

  const loadAll = useCallback(async () => {
    try {
      const parsedChallengeId = Number.parseInt(String(id), 10);
      if (!Number.isNaN(parsedChallengeId)) {
        await setCurrentChallengeId(parsedChallengeId);
      }

      const token = await getToken();
      if (!token) { router.replace('/'); return; }

      const headers = authHeaders(token);

      const [challengeRes, leaderboardRes, meRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/challenges/${id}`, { headers }),
        fetch(`${API_URL}/leaderboard/${id}`, { headers }),
        fetch(`${API_URL}/users/me`, { headers }),
        fetch(`${API_URL}/challenges/${id}/history`, { headers }),
      ]);

      if (challengeRes.ok) setChallenge(await challengeRes.json());
      if (leaderboardRes.ok) setLeaderboard(await leaderboardRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentUserId(me.id);
      }
      if (historyRes.ok) {
        setHistory(await historyRes.json());
      }
    } catch (e) {
      console.error('Leaderboard error:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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

  const activeParticipants = challenge?.activeParticipants ?? [];
  const activeParticipantsCount = challenge?.activeParticipantsCount ?? activeParticipants.length;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="px-6 pt-6 pb-4 border-b border-[#222]">
        <View className="mb-2" style={{ zIndex: 20, elevation: 6 }}>
          <View className="flex-row items-center" style={{ minHeight: 52 }}>
            <View style={{ width: 44, marginRight: 12 }}>
              <HeaderActionButton
                onPress={() => void runLeavingAction(() => router.back())}
                disabled={leavingScreen}
                loading={leavingScreen}
                icon="‹"
              />
            </View>
            <Text className="text-white text-xl font-black tracking-widest uppercase flex-1" numberOfLines={1}>
              {challenge ? challenge.title : 'LEADERBOARD'}
            </Text>
          </View>
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
        {challenge ? (
          <View className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/5 mb-5">
            {/* Creador */}
            {challenge.creatorUsername ? (
              <View className="flex-row items-center mb-4 pb-3 border-b border-white/5">
                <Text className="text-2xl mr-2">👑</Text>
                <View>
                  <Text className="text-gray-500 text-[10px] uppercase tracking-widest">Creado por</Text>
                  <Text className="text-neonGreen text-sm font-bold">@{challenge.creatorUsername}</Text>
                </View>
              </View>
            ) : null}
            <Text className="text-gray-400 text-xs uppercase tracking-widest mb-2">Participantes</Text>
            <Text className="text-white text-2xl font-black mb-3">
              {activeParticipantsCount} {activeParticipantsCount === 1 ? 'persona activa' : 'personas activas'}
            </Text>
            {activeParticipants.length > 0 ? (
              <View className="flex-row flex-wrap">
                {activeParticipants.map((participant) => {
                  const isCreator = challenge.creatorId === participant.id;
                  const isMe = participant.id === currentUserId;

                  return (
                    <View
                      key={participant.id}
                      className={`rounded-full px-3 py-2 mr-2 mb-2 border ${
                        isMe
                          ? 'bg-neonGreen/10 border-neonGreen/30'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <Text className={`text-[11px] font-bold ${isMe ? 'text-neonGreen' : 'text-white'}`}>
                        @{participant.username}
                        {isCreator ? ' • creador' : ''}
                        {isMe ? ' • tú' : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text className="text-gray-500 text-sm">
                Todavía no hay participantes activos en este reto.
              </Text>
            )}
          </View>
        ) : null}

        {history && (
          <View className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/5 mb-5">
            <Text className="text-gray-400 text-xs uppercase tracking-widest mb-3">Tu progreso</Text>
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-gray-500 text-xs uppercase">Racha actual</Text>
                <Text className="text-white text-2xl font-black">{history.currentStreak}</Text>
              </View>
              <View>
                <Text className="text-gray-500 text-xs uppercase">Check-ins recientes</Text>
                <Text className="text-neonGreen text-2xl font-black">{history.history.length}</Text>
              </View>
            </View>
            {history.completedAt ? (
              <Text className="text-neonGreen text-sm font-bold">
                Completaste este reto el {new Date(history.completedAt).toLocaleDateString()}
              </Text>
            ) : (
              <Text className="text-gray-400 text-sm">
                Últimos registros: {history.history.slice(0, 3).map((entry) => new Date(entry.date).toLocaleDateString()).join(' · ') || 'aún sin check-ins'}
              </Text>
            )}
          </View>
        )}

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

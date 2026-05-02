import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import ReactionRow from '../../components/ReactionRow';
import NudgeSection from '../../components/NudgeSection';
import { API_BASE_URL, API_URL, ApiTimeoutError, fetchWithRetry } from '../../constants/api';
import { getToken, authHeaders, clearToken } from '../../constants/auth';
import { getCurrentChallengeId, setCurrentChallengeId, clearCurrentChallengeId } from '../../constants/challenge';
import { TabScreen } from '../../components/TabScreen';
import { TabScrollView } from '../../components/TabScrollView';

interface ChallengeSummary {
  challengeId: number;
  title: string;
}

interface FeedPost {
  id: number;
  photoUrl: string;
  createdAt: string;
  user: { id: number; username: string };
  reactions: { '🔥': number; '💪': number; '👏': number };
  viewerReactions: { '🔥': boolean; '💪': boolean; '👏': boolean };
}

interface Comment {
  id: number;
  text: string;
  createdAt: string;
  userId: number;
  username: string;
}

function CommentSection({ checkInId }: { checkInId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadComments = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/feed/${checkInId}/comments`, { headers: authHeaders(token) });
      if (res.ok) setComments(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleToggle = () => {
    if (!expanded) loadComments();
    setExpanded(!expanded);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/feed/${checkInId}/comments`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        setText('');
        loadComments();
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  return (
    <View className="border-t border-[#333]">
      <TouchableOpacity className="p-3" onPress={handleToggle}>
        <Text className="text-gray-400 text-xs font-bold">
          💬 {comments.length > 0 ? `${comments.length} comentarios` : 'Comentar'}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View className="px-3 pb-3">
          {loading ? <ActivityIndicator color="#39FF14" size="small" /> : null}
          {comments.map((c) => (
            <View key={c.id} className="flex-row mb-2">
              <Text className="text-neonGreen text-xs font-bold mr-2">@{c.username}</Text>
              <Text className="text-gray-300 text-xs flex-1">{c.text}</Text>
            </View>
          ))}
          <View className="flex-row items-center mt-2 border border-white/10 rounded-xl overflow-hidden">
            <TextInput
              className="flex-1 text-white text-xs p-2"
              placeholder="Escribe un comentario..."
              placeholderTextColor="#555"
              value={text}
              onChangeText={setText}
            />
            <TouchableOpacity className="bg-neonGreen px-4 py-2" onPress={handleSend} disabled={sending || !text.trim()}>
              <Text className="text-black font-black text-xs">{sending ? '...' : '→'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function FeedScreen() {
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<ChallengeSummary[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [])
  );

  const loadFeed = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const token = await getToken();
      if (!token) return;

      const headers = authHeaders(token);
      setErrorMessage(null);
      const challengesRes = await fetchWithRetry(`${API_URL}/challenges/active`, { headers });

      if (challengesRes.status === 401 || challengesRes.status === 403) {
        await clearCurrentChallengeId();
        await clearToken();
        router.replace('/');
        return;
      }

      if (!challengesRes.ok) {
        throw new Error('Failed to fetch active challenges');
      }

      const challengesData: ChallengeSummary[] = await challengesRes.json();
      setActiveChallenges(challengesData);

      if (challengesData.length === 0) {
        setSelectedChallengeId(null);
        setFeed([]);
        return;
      }

      const storedChallengeId = await getCurrentChallengeId();
      const storedChallengeStillExists = challengesData.some((challenge) => challenge.challengeId === storedChallengeId);
      const nextChallengeId = storedChallengeStillExists ? storedChallengeId : challengesData[0].challengeId;

      if (!nextChallengeId) {
        setSelectedChallengeId(null);
        setFeed([]);
        return;
      }

      setSelectedChallengeId(nextChallengeId);
      await setCurrentChallengeId(nextChallengeId);

      const res = await fetchWithRetry(`${API_URL}/feed/${nextChallengeId}`, { headers });

      if (!res.ok) throw new Error('Failed to fetch feed');
      const data = await res.json();
      setFeed(data);
    } catch (e) {
      console.error('Feed error:', e);
      setErrorMessage(e instanceof ApiTimeoutError ? e.message : 'No se pudo cargar el feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChallengeSelect = async (challengeId: number) => {
    try {
      setSelectedChallengeId(challengeId);
      await setCurrentChallengeId(challengeId);

      const token = await getToken();
      if (!token) return;

      const res = await fetchWithRetry(`${API_URL}/feed/${challengeId}`, {
        headers: authHeaders(token),
      });

      if (!res.ok) throw new Error('Failed to fetch feed');
      setFeed(await res.json());
    } catch (e) {
      console.error('Challenge switch error:', e);
    }
  };

  const selectedChallenge = activeChallenges.find((challenge) => challenge.challengeId === selectedChallengeId) ?? null;

  const formatTime = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Hace unos minutos';
    if (hours === 1) return 'Hace 1 hora';
    return `Hace ${hours} horas`;
  };

  return (
    <TabScreen>
      <View className="px-6 pt-6 pb-2 border-b border-[#222]">
        <Text className="text-white text-2xl font-black tracking-widest">
          FEED <Text className="text-neonOrange">{selectedChallenge?.title?.toUpperCase() ?? 'SOCIAL'}</Text>
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      ) : (
        <TabScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(true)} tintColor="#39FF14" />}
        >
          {activeChallenges.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
              <View className="flex-row gap-2">
                {activeChallenges.map((challenge) => {
                  const isSelected = challenge.challengeId === selectedChallengeId;
                  return (
                    <TouchableOpacity
                      key={challenge.challengeId}
                      className={`px-4 py-2 rounded-full border ${isSelected ? 'bg-neonGreen/20 border-neonGreen/60' : 'bg-[#1A1A1A] border-white/10'}`}
                      onPress={() => void handleChallengeSelect(challenge.challengeId)}
                    >
                      <Text className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-neonGreen' : 'text-gray-300'}`}>
                        {challenge.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {activeChallenges.length === 0 ? (
            <View className="items-center mt-20">
              <Text className="text-5xl mb-4">🎯</Text>
              <Text className="text-white font-bold text-lg mb-2">{errorMessage ? 'No pudimos abrir el feed' : 'Sin retos activos'}</Text>
              <Text className="text-gray-400 text-sm text-center">
                {errorMessage ? errorMessage : 'Únete a un reto para ver el feed de tu comunidad.'}
              </Text>
              {errorMessage ? (
                <TouchableOpacity className="mt-4" onPress={() => loadFeed()}>
                  <View className="bg-neonOrange/20 border border-neonOrange/50 px-5 py-3 rounded-xl">
                    <Text className="text-neonOrange font-black uppercase tracking-widest">Reintentar</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {activeChallenges.length > 0 && feed.length === 0 ? (
            <View className="items-center mt-20">
              <Text className="text-5xl mb-4">📭</Text>
              <Text className="text-white font-bold text-lg mb-2">Sin publicaciones aún</Text>
              <Text className="text-gray-400 text-sm text-center">
                ¡Sé el primero en subir tu prueba de hoy!
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {feed.map((post) => (
                <View key={post.id} className="w-[48%] mb-6 bg-[#1A1A1A] rounded-2xl overflow-hidden border border-[#333]">
                  <View className="flex-row items-center p-3 border-b border-[#333]">
                    <View className="w-6 h-6 rounded-full bg-gray-600 mr-2 justify-center items-center">
                      <Text className="text-[10px]">👤</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push(`/user/${post.user?.id}`)} className="flex-1">
                      <Text className="text-neonGreen text-xs font-bold" numberOfLines={1}>
                        {post.user?.username?.toUpperCase() ?? 'ATLETA'}
                      </Text>
                    </TouchableOpacity>
                    <Text className="text-gray-500 text-[10px]">
                      {post.createdAt ? formatTime(post.createdAt) : ''}
                    </Text>
                  </View>
                  {post.photoUrl ? (
                    post.photoUrl.startsWith('freeze://') ? (
                      <View className="w-full aspect-[4/5] bg-[#102316] justify-center items-center px-4">
                        <Text className="text-5xl mb-3">🛡️</Text>
                        <Text className="text-neonGreen font-black text-center uppercase tracking-widest">
                          Escudo de racha usado
                        </Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: post.photoUrl.startsWith('http') || post.photoUrl.startsWith('data:') ? post.photoUrl : `${API_BASE_URL}${post.photoUrl}` }}
                        className="w-full aspect-[4/5]"
                        resizeMode="cover"
                      />
                    )
                  ) : (
                    <View className="w-full aspect-[4/5] bg-[#222] justify-center items-center">
                      <Text className="text-4xl">📸</Text>
                    </View>
                  )}
                  <ReactionRow
                    checkInId={post.id}
                    challengeId={selectedChallengeId}
                    initialReactions={post.reactions ?? { '🔥': 0, '💪': 0, '👏': 0 }}
                    initialViewerReactions={post.viewerReactions ?? { '🔥': false, '💪': false, '👏': false }}
                  />
                  <CommentSection checkInId={post.id} />
                </View>
              ))}
            </View>
          )}

          <NudgeSection challengeId={selectedChallengeId} />
        </TabScrollView>
      )}
    </TabScreen>
  );
}

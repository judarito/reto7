import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, SafeAreaView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ReactionRow from '../../components/ReactionRow';
import NudgeSection from '../../components/NudgeSection';
import { API_URL } from '../../constants/api';
import { getToken, authHeaders } from '../../constants/auth';

// Default to challenge 1 (10,000 Pasos) for the feed — in a full app the user picks from their challenges
const FEED_CHALLENGE_ID = 1;

export default function FeedScreen() {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      const res = await fetch(`${API_URL}/feed/${FEED_CHALLENGE_ID}`, {
        headers: authHeaders(token),
      });

      if (!res.ok) throw new Error('Failed to fetch feed');
      const data = await res.json();
      setFeed(data);
    } catch (e) {
      console.error('Feed error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Hace unos minutos';
    if (hours === 1) return 'Hace 1 hora';
    return `Hace ${hours} horas`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-6 pb-2 border-b border-[#222]">
        <Text className="text-white text-2xl font-black tracking-widest">
          FEED <Text className="text-neonOrange">10K PASOS</Text>
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(true)} tintColor="#39FF14" />}
        >
          {feed.length === 0 ? (
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
                    <Text className="text-neonGreen text-xs font-bold flex-1" numberOfLines={1}>
                      {post.user?.username?.toUpperCase() ?? 'ATLETA'}
                    </Text>
                    <Text className="text-gray-500 text-[10px]">
                      {post.createdAt ? formatTime(post.createdAt) : ''}
                    </Text>
                  </View>
                  {post.photoUrl ? (
                    <Image
                      source={{ uri: post.photoUrl.startsWith('http') ? post.photoUrl : `${API_URL.replace('/api', '')}${post.photoUrl}` }}
                      className="w-full aspect-[4/5]"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full aspect-[4/5] bg-[#222] justify-center items-center">
                      <Text className="text-4xl">📸</Text>
                    </View>
                  )}
                  <ReactionRow
                    initialReactions={post.reactions ?? { '🔥': 0, '💪': 0, '👏': 0 }}
                  />
                </View>
              ))}
            </View>
          )}

          <NudgeSection />
          <View className="h-10" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

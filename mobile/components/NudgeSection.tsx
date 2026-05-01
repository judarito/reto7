import { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { API_URL } from '../constants/api';
import { authHeaders, getToken } from '../constants/auth';

interface UserInDanger {
  id: number;
  name: string;
  missedDays: number;
}

function NudgeSection({ challengeId }: { challengeId: number | null }) {
  const [usersInDanger, setUsersInDanger] = useState<UserInDanger[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const loadUsersInDanger = useCallback(async () => {
    if (!challengeId) {
      setUsersInDanger([]);
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/feed/${challengeId}/danger`, {
        headers: authHeaders(token),
      });

      if (!response.ok) throw new Error('Failed to fetch danger users');
      setUsersInDanger(await response.json());
    } catch (error) {
      console.error('Danger users error:', error);
      setUsersInDanger([]);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    void loadUsersInDanger();
  }, [loadUsersInDanger]);

  const handleNudge = async (user: UserInDanger) => {
    if (!challengeId) return;

    try {
      setSendingId(user.id);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/feed/nudge`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ targetUserId: user.id, challengeId }),
      });

      if (!response.ok) {
        throw new Error('Failed to send nudge');
      }

      Alert.alert('Nudge enviado', `Le recordaste a ${user.name} que no deje caer su racha.`);
      setUsersInDanger((prev) => prev.filter((entry) => entry.id !== user.id));
    } catch (error) {
      console.error('Nudge error:', error);
      Alert.alert('Error', 'No se pudo enviar el nudge.');
    } finally {
      setSendingId(null);
    }
  };

  if (!challengeId || (!loading && usersInDanger.length === 0)) {
    return null;
  }

  return (
    <View className="mt-8 bg-[#3A0000] rounded-3xl p-5 border border-red-500/50">
      <View className="flex-row items-center mb-3">
        <Text className="text-red-500 text-lg mr-2">⚠️</Text>
        <Text className="text-white font-black text-lg tracking-widest">EN PELIGRO</Text>
      </View>
      <Text className="text-gray-300 text-sm mb-4">Amigos a punto de perder su racha.</Text>
      
      <View className="space-y-3 gap-3">
        {loading ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#FF5F1F" />
          </View>
        ) : null}
        {usersInDanger.map(user => (
          <View key={user.id} className="flex-row items-center justify-between bg-black/40 p-3 rounded-2xl">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-gray-600 mr-3" />
              <View>
                <Text className="text-white font-bold">{user.name}</Text>
                <Text className="text-red-400 text-xs">{user.missedDays} {user.missedDays === 1 ? 'día' : 'días'} sin subir prueba</Text>
              </View>
            </View>
            <TouchableOpacity 
              className="bg-white/10 px-4 py-2 rounded-xl"
              onPress={() => void handleNudge(user)}
              disabled={sendingId === user.id}
            >
              <Text className="text-white font-bold">{sendingId === user.id ? 'Enviando...' : 'Nudge 🔔'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

export default memo(NudgeSection);

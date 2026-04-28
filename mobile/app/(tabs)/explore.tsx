import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { API_URL } from '../../constants/api';
import { getToken, authHeaders } from '../../constants/auth';
import { Toast } from '../../components/Toast';

export default function ExploreScreen() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());
  const [inviteCode, setInviteCode] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  useFocusEffect(
    useCallback(() => {
      fetchChallenges();
    }, [])
  );

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/challenges/global`);
      const data = await res.json();
      if (res.ok) setChallenges(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;
    setJoiningByCode(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/'); return; }

      const res = await fetch(`${API_URL}/challenges/join-by-code`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido');

      setInviteCode('');
      showToast('¡Te uniste al reto privado! 🎉');
      setTimeout(() => router.push('/(tabs)/dashboard'), 1500);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setJoiningByCode(false);
    }
  };

  const handleJoin = async (challengeId: number) => {
    if (joinedIds.has(challengeId)) return; // prevent double-tap
    setJoiningId(challengeId);
    try {
      const token = await getToken();
      if (!token) { router.replace('/'); return; }

      const res = await fetch(`${API_URL}/challenges/join`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ challengeId }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'Already joined this challenge') {
          showToast('Ya estás en este reto', 'error');
          setJoinedIds(prev => new Set([...prev, challengeId]));
        } else {
          throw new Error(data.error || 'Error al unirse');
        }
        return;
      }

      // Mark as joined locally so button changes immediately
      setJoinedIds(prev => new Set([...prev, challengeId]));
      showToast('¡Te uniste al reto! 🔥');
      setTimeout(() => router.push('/(tabs)/dashboard'), 1500);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      <View className="px-6 pt-6 pb-4 border-b border-[#222] flex-row justify-between items-center">
        <Text className="text-white text-2xl font-black tracking-widest uppercase">
          Explorar <Text className="text-neonGreen">Retos</Text>
        </Text>
        <TouchableOpacity onPress={() => router.push('/create-challenge')}>
          <View className="bg-neonGreen/20 px-3 py-2 rounded-full border border-neonGreen/50 flex-row items-center">
            <Text className="text-neonGreen font-bold mr-1">+</Text>
            <Text className="text-neonGreen font-bold text-xs uppercase tracking-wider">Crear</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        
        {/* Join by Code */}
        <View className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/10 mb-8">
          <Text className="text-white font-bold mb-2 uppercase tracking-wider text-xs">Unirse con Código</Text>
          <View className="flex-row items-center">
            <TextInput
              style={{ flex: 1, backgroundColor: '#121212', color: 'white', padding: 12, borderRadius: 12, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', textTransform: 'uppercase', fontSize: 16, fontWeight: '700' }}
              placeholder="Ej. FUEGO7"
              placeholderTextColor="#555"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={{
                paddingHorizontal: 16, paddingVertical: 12,
                borderRadius: 12, borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
                backgroundColor: joiningByCode || !inviteCode.trim() ? '#333' : 'rgba(255,95,31,0.2)',
                borderWidth: 1, borderColor: 'rgba(255,95,31,0.5)',
              }}
              onPress={handleJoinByCode}
              disabled={joiningByCode || !inviteCode.trim()}
            >
              {joiningByCode
                ? <ActivityIndicator color="#FF5F1F" size="small" />
                : <Text style={{ color: '#FF5F1F', fontWeight: '700', textTransform: 'uppercase' }}>Unirse</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-4">Retos Globales</Text>

        {loading ? (
          <ActivityIndicator color="#39FF14" size="large" style={{ marginTop: 40 }} />
        ) : challenges.length === 0 ? (
          <Text className="text-gray-400 text-center mt-10">No hay retos disponibles.</Text>
        ) : (
          <View>
            {challenges.map((challenge) => {
              const alreadyJoined = joinedIds.has(challenge.id);
              const isJoiningThis = joiningId === challenge.id;

              return (
                <View key={challenge.id} className="bg-[#1A1A1A] rounded-3xl p-5 border border-white/5 mb-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-white text-xl font-bold flex-1">{challenge.title}</Text>
                    {challenge.isPremium && (
                      <View className="bg-neonOrange/20 px-2 py-1 rounded border border-neonOrange/50 ml-2">
                        <Text className="text-neonOrange text-[10px] font-bold">PREMIUM</Text>
                      </View>
                    )}
                  </View>

                  {challenge.description ? (
                    <Text className="text-gray-400 text-sm mb-3">{challenge.description}</Text>
                  ) : null}

                  {/* Evidence required badge */}
                  {challenge.evidenceDescription ? (
                    <View style={{
                      backgroundColor: 'rgba(57,255,20,0.07)',
                      borderWidth: 1,
                      borderColor: 'rgba(57,255,20,0.2)',
                      borderRadius: 10,
                      padding: 10,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    }}>
                      <Text style={{ fontSize: 14, marginRight: 8 }}>📋</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#39FF14', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                          Evidencia requerida
                        </Text>
                        <Text style={{ color: '#ccc', fontSize: 13 }}>{challenge.evidenceDescription}</Text>
                      </View>
                    </View>
                  ) : null}

                  <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center">
                      <Text className="text-white text-sm mr-1">⏱️</Text>
                      <Text className="text-gray-300 font-medium">{challenge.durationDays} Días</Text>
                    </View>
                    {challenge.isPremium && (
                      <Text className="text-neonOrange font-bold">${challenge.price} USD</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={{
                      width: '100%', paddingVertical: 14, borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: alreadyJoined ? 'rgba(57,255,20,0.15)' : isJoiningThis ? '#333' : 'rgba(57,255,20,0.1)',
                      borderWidth: 1,
                      borderColor: alreadyJoined ? '#39FF14' : 'rgba(57,255,20,0.5)',
                    }}
                    onPress={() => handleJoin(challenge.id)}
                    disabled={isJoiningThis || alreadyJoined}
                  >
                    {isJoiningThis ? (
                      <ActivityIndicator color="#39FF14" />
                    ) : (
                      <Text style={{ color: '#39FF14', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>
                        {alreadyJoined ? '✓ Unido' : 'Unirme'}
                      </Text>
                    )}
                  </TouchableOpacity>
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

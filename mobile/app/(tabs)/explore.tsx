import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { API_URL, ApiTimeoutError, fetchWithRetry } from '../../constants/api';
import { getToken, authHeaders } from '../../constants/auth';
import { setCurrentChallengeId } from '../../constants/challenge';
import { HeaderActionButton } from '../../components/HeaderActionButton';
import { TabScreen } from '../../components/TabScreen';
import { Toast } from '../../components/Toast';
import { TabScrollView } from '../../components/TabScrollView';
import { usePendingAction } from '../../hooks/usePendingAction';

interface ActiveParticipant {
  id: number;
  username: string;
}

interface GlobalChallenge {
  id: number;
  title: string;
  description: string | null;
  durationDays: number;
  isPremium: boolean;
  price: number;
  evidenceDescription: string | null;
  challengeType: string;
  challengeIcon: string;
  challengeLabel: string;
  activeParticipantsCount: number;
  activeParticipants: ActiveParticipant[];
  daysUntilStart?: number;
  startsAt?: string;
  endsAt?: string;
  creatorUsername?: string | null;
}

export default function ExploreScreen() {
  const [challenges, setChallenges] = useState<GlobalChallenge[]>([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState<GlobalChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());
  const [inviteCode, setInviteCode] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isPending: openingCreate, runPendingAction: runCreateNavigation } = usePendingAction();

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
      setErrorMessage(null);
      const [globalRes, upcomingRes] = await Promise.all([
        fetchWithRetry(`${API_URL}/challenges/global`),
        fetchWithRetry(`${API_URL}/challenges/upcoming`),
      ]);
      if (globalRes.ok) setChallenges(await globalRes.json());
      if (upcomingRes.ok) setUpcomingChallenges(await upcomingRes.json());
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof ApiTimeoutError ? e.message : 'No se pudieron cargar los retos.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price <= 0) return 'Gratis';
    if (price < 10) return `$${price.toFixed(2)} USD`;
    return `$${(price / 100).toFixed(2)} USD`;
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

      if (data.challengeId) {
        await setCurrentChallengeId(data.challengeId);
      }
      setInviteCode('');
      showToast('¡Te uniste al reto privado! 🎉');
      setTimeout(() => router.push('/(tabs)/dashboard'), 1500);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al unirse por código', 'error');
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
      await setCurrentChallengeId(challengeId);
      setJoinedIds(prev => new Set([...prev, challengeId]));
      showToast('¡Te uniste al reto! 🔥');
      setTimeout(() => router.push('/(tabs)/dashboard'), 1500);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al unirse al reto', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <TabScreen>
      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      <View className="px-6 pt-6 pb-4 border-b border-[#222]" style={{ zIndex: 20, elevation: 6 }}>
        <View className="flex-row items-center" style={{ minHeight: 52 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text className="text-white text-2xl font-black tracking-widest uppercase" numberOfLines={1}>
              Explorar <Text className="text-neonGreen">Retos</Text>
            </Text>
          </View>
          <View style={{ width: 92, alignItems: 'flex-end' }}>
            <HeaderActionButton
              onPress={() => void runCreateNavigation(() => router.push('/create-challenge'))}
              disabled={openingCreate}
              loading={openingCreate}
              icon="+"
              label="Crear"
              variant="pill"
              accent="green"
            />
          </View>
        </View>
      </View>

      <TabScrollView className="flex-1 px-6 pt-6">
        
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

        {/* Upcoming Challenges */}
        {upcomingChallenges.length > 0 && (
          <View className="mb-8">
            <Text className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-4 flex-row items-center">
              ⏳ Próximamente
            </Text>
            {upcomingChallenges.slice(0, 3).map((challenge) => (
              <View key={challenge.id} className="bg-[#1A1A1A] rounded-2xl p-4 border border-neonOrange/20 mb-3">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-white font-bold">{challenge.title}</Text>
                  <Text className="text-neonOrange text-xs font-bold">
                    En {challenge.daysUntilStart} día{(challenge as any).daysUntilStart !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="bg-white/5 border border-white/10 px-3 py-1 rounded-full mr-2">
                    <Text className="text-gray-200 text-[10px] font-bold uppercase tracking-widest">
                      {challenge.challengeIcon} {challenge.challengeLabel}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-4">Retos Globales</Text>

        {loading ? (
          <ActivityIndicator color="#39FF14" size="large" style={{ marginTop: 40 }} />
        ) : challenges.length === 0 ? (
          <View className="items-center mt-10">
            <Text className="text-gray-400 text-center">{errorMessage ?? 'No hay retos disponibles.'}</Text>
            {errorMessage ? (
              <TouchableOpacity className="mt-4" onPress={fetchChallenges}>
                <View className="bg-neonOrange/20 border border-neonOrange/50 px-5 py-3 rounded-xl">
                  <Text className="text-neonOrange font-black uppercase tracking-widest">Reintentar</Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View>
            {challenges.map((challenge) => {
              const alreadyJoined = joinedIds.has(challenge.id);
              const isJoiningThis = joiningId === challenge.id;
              const activeParticipants = Array.isArray(challenge.activeParticipants) ? challenge.activeParticipants : [];
              const activeParticipantsCount = typeof challenge.activeParticipantsCount === 'number'
                ? challenge.activeParticipantsCount
                : activeParticipants.length;

              return (
                <View key={challenge.id} className="bg-[#1A1A1A] rounded-3xl p-5 border border-white/5 mb-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-white text-xl font-bold">{challenge.title}</Text>
                      {challenge.creatorUsername ? (
                        <Text className="text-gray-500 text-[11px] mt-1">Creado por @{challenge.creatorUsername}</Text>
                      ) : null}
                    </View>
                    {challenge.isPremium && (
                      <View className="bg-neonOrange/20 px-2 py-1 rounded border border-neonOrange/50 ml-2">
                        <Text className="text-neonOrange text-[10px] font-bold">PREMIUM</Text>
                      </View>
                    )}
                  </View>

                  {challenge.description ? (
                    <Text className="text-gray-400 text-sm mb-3">{challenge.description}</Text>
                  ) : null}

                  <View className="mb-3 flex-row items-center">
                    <View className="bg-white/5 border border-white/10 px-3 py-1 rounded-full mr-2">
                      <Text className="text-gray-200 text-[10px] font-bold uppercase tracking-widest">
                        {challenge.challengeIcon} {challenge.challengeLabel}
                      </Text>
                    </View>
                  </View>

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
                      <Text className="text-neonOrange font-bold">{formatPrice(challenge.price)}</Text>
                    )}
                  </View>

                  <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-4">
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                      Participantes Activos
                    </Text>
                    <Text className="text-white text-base font-black mb-2">
                      {activeParticipantsCount} {activeParticipantsCount === 1 ? 'persona' : 'personas'} haciendolo ahora
                    </Text>
                    {activeParticipants.length > 0 ? (
                      <View className="flex-row flex-wrap">
                        {activeParticipants.map((participant: { id: number; username: string }) => (
                          <View
                            key={participant.id}
                            className="bg-neonGreen/10 border border-neonGreen/20 rounded-full px-3 py-1 mr-2 mb-2"
                          >
                            <Text className="text-neonGreen text-[11px] font-bold">
                              @{participant.username}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-gray-500 text-sm">
                        Sé la primera persona en unirte a este reto.
                      </Text>
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
      </TabScrollView>
    </TabScreen>
  );
}

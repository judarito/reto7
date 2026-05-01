import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../constants/api';
import { authHeaders, getToken } from '../constants/auth';
import { usePendingAction } from '../hooks/usePendingAction';

export default function PaywallScreen() {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const params = useLocalSearchParams<{ challengeId?: string; challengeTitle?: string; currentStreak?: string }>();
  const [loading, setLoading] = useState(false);
  const { isPending: leavingScreen, runPendingAction: runLeavingAction } = usePendingAction();

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 10 });
    opacity.value = withSpring(1);
  }, [opacity, translateY]);

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleConsumeFreeze = async () => {
    const challengeId = Number.parseInt(params.challengeId ?? '', 10);
    if (Number.isNaN(challengeId)) {
      Alert.alert('Error', 'No se encontró el reto a restaurar.');
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${API_URL}/store/consume-freeze`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ challengeId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo consumir el escudo');
      }

      Alert.alert('Escudo usado', `Tu racha de ${params.challengeTitle ?? 'este reto'} quedó protegida.`, [
        { text: 'Volver al dashboard', onPress: () => router.replace('/(tabs)/dashboard') },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo consumir el escudo';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background justify-center px-8">
      
      {/* Broken Flame */}
      <View className="items-center mb-10">
        <Text className="text-[100px] shadow-[0_0_40px_rgba(255,95,31,0.5)] color-neonOrange opacity-80" 
              style={{ textShadowColor: 'rgba(255, 95, 31, 0.7)', textShadowRadius: 30, textShadowOffset: {width: 0, height: 0} }}>
          🔥
        </Text>
        {/* Visual trick for a broken flame could be a slash icon over it, but for text we use a simple broken heart emoji next to it or just the text below */}
        <Text className="text-white text-5xl font-black mt-4 text-center">💔 ¡OH NO!</Text>
        <Text className="text-gray-400 text-lg mt-3 text-center">
          {params.currentStreak ? `Tu racha de ${params.currentStreak} días está en peligro.` : 'Tu racha está en peligro.'}
        </Text>
      </View>

      {/* Glossy Shield */}
      <View className="items-center mb-16">
        <Animated.View style={shieldStyle}>
          <View className="bg-gradient-to-br from-neonOrange to-red-600 rounded-full w-40 h-40 items-center justify-center border-4 border-white/10 shadow-[0_0_50px_rgba(255,95,31,0.3)]">
            <Text className="text-[80px]">🛡️</Text>
          </View>
        </Animated.View>
        <Text className="text-gray-300 font-bold text-xl mt-4 uppercase tracking-widest">Escudo de Racha</Text>
      </View>

      {/* Shield Button */}
      <View className="w-full">
        <TouchableOpacity 
          className="w-full bg-neonOrange py-5 rounded-3xl items-center shadow-[0_0_30px_rgba(255,95,31,0.4)]"
          onPress={handleConsumeFreeze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-black font-black text-xl tracking-widest uppercase">Usar Escudo Disponible</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6 items-center"
          onPress={() => void runLeavingAction(() => router.back())}
          disabled={leavingScreen}
        >
          {leavingScreen ? (
            <ActivityIndicator color="#9CA3AF" size="small" />
          ) : (
            <Text className="text-gray-500 text-center text-sm font-medium underline">Volver sin usar el escudo</Text>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

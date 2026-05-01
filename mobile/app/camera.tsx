import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../constants/api';
import { authHeaders, getToken } from '../constants/auth';
import { setCurrentChallengeId } from '../constants/challenge';
import { HeaderActionButton } from '../components/HeaderActionButton';
import { usePendingAction } from '../hooks/usePendingAction';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [uploading, setUploading] = useState(false);
  const params = useLocalSearchParams<{ challengeId?: string; challengeTitle?: string }>();
  const insets = useSafeAreaInsets();
  const { isPending: leavingScreen, runPendingAction: runLeavingAction } = usePendingAction();
  
  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
      return (
      <View className="flex-1 bg-black items-center justify-center p-8">
        <Text className="text-white text-center mb-6 text-lg">Necesitamos permiso para usar la cámara</Text>
        <TouchableOpacity 
          className="bg-neonOrange px-6 py-3 rounded-full"
          onPress={requestPermission}
        >
          <Text className="text-black font-bold">Dar permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    const challengeId = Number.parseInt(params.challengeId ?? '', 10);

    if (!cameraRef.current || Number.isNaN(challengeId)) {
      Alert.alert('Error', 'Falta el reto para asociar esta evidencia.');
      return;
    }

    try {
      setUploading(true);
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) {
        throw new Error('No se pudo capturar la foto');
      }

      const formData = new FormData();
      formData.append('challengeId', String(challengeId));
      formData.append('photo', {
        uri: photo.uri,
        name: `checkin-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const response = await fetch(`${API_URL}/check-ins/upload`, {
        method: 'POST',
        headers: {
          Authorization: authHeaders(token).Authorization,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.status === 409) {
        Alert.alert('Check-in ya registrado', 'Ya subiste evidencia para este reto hoy.');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo subir la evidencia');
      }

      await setCurrentChallengeId(challengeId);
      Alert.alert('Check-in listo', `Tu evidencia para ${params.challengeTitle ?? 'el reto'} se subió correctamente.`, [
        { text: 'Ver tablero', onPress: () => router.replace(`/challenge/${challengeId}/leaderboard`) },
      ]);
    } catch (error: any) {
      console.error('Camera upload error:', error);
      Alert.alert('Error', error.message || 'No se pudo subir la evidencia');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView 
        style={StyleSheet.absoluteFillObject} 
        facing="back"
        ref={cameraRef}
      >
        {/* Top UI */}
        <View className="flex-row justify-between items-center px-6" style={{ paddingTop: Math.max(insets.top + 12, 24), zIndex: 20, elevation: 6 }}>
          <HeaderActionButton
            onPress={() => void runLeavingAction(() => router.back())}
            disabled={leavingScreen}
            loading={leavingScreen}
            icon="✕"
          />

          <View className="bg-black/60 border border-neonOrange/50 px-4 py-2 rounded-full flex-row items-center">
            <Text className="text-neonOrange mr-2">💡</Text>
            <Text className="text-white text-xs font-medium">{params.challengeTitle ?? 'Sube tu prueba de hoy'}</Text>
          </View>

          <View className="w-10 h-10" />
        </View>

        {/* Bottom UI */}
        <View className="absolute w-full items-center" style={{ bottom: Math.max(insets.bottom + 12, 24) }}>
          <TouchableOpacity 
            className="w-20 h-20 rounded-full border-4 border-neonOrange justify-center items-center"
            onPress={takePicture}
            disabled={uploading}
          >
            <View className="w-16 h-16 rounded-full bg-neonOrange items-center justify-center">
              {uploading ? <ActivityIndicator color="#000" /> : null}
            </View>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

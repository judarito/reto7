import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../constants/api';
import { getToken, authHeaders } from '../constants/auth';
import { setCurrentChallengeId } from '../constants/challenge';
import { HeaderActionButton } from '../components/HeaderActionButton';
import { Toast } from '../components/Toast';
import { usePendingAction } from '../hooks/usePendingAction';

export default function CreateChallengeScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [isPrivate, setIsPrivate] = useState(false);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const { isPending: leavingScreen, runPendingAction: runLeavingAction } = usePendingAction();

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000);
  };

  const handleCreate = async () => {
    if (!title.trim() || !duration.trim()) {
      showToast('Por favor llena todos los campos', 'error');
      return;
    }

    setLoading(true);
    setValidationWarning(null);
    try {
      const token = await getToken();
      if (!token) { router.replace('/'); return; }

      const res = await fetch(`${API_URL}/challenges/create`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          durationDays: parseInt(duration.trim(), 10),
          isPrivate,
          evidenceDescription: evidenceDescription.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.status === 422) {
        setValidationWarning(data.reason ? `⚠️ ${data.reason}: ${data.details ?? ''}` : 'Este reto no cumple con nuestras normas.');
        showToast(data.reason ?? 'Contenido no permitido', 'error');
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Error al crear el reto');

      // Show success state inline
      if (data.challengeId) {
        await setCurrentChallengeId(data.challengeId);
      }
      setCreatedCode(data.inviteCode ?? null);
      setDone(true);
      showToast(isPrivate ? `¡Reto creado! Código: ${data.inviteCode}` : '¡Reto creado exitosamente! 🚀');

    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Success state after creation
  if (done) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background justify-center px-8">
        <Toast visible={toast.visible} message={toast.message} type={toast.type} />
        <View className="items-center">
          <Text className="text-7xl mb-6">🚀</Text>
          <Text className="text-white text-3xl font-black text-center mb-2">¡Reto Creado!</Text>
          <Text className="text-gray-400 text-center mb-8">{title}</Text>

          {createdCode && (
            <View className="bg-[#1A1A1A] rounded-2xl p-6 border border-neonOrange/30 w-full mb-8 items-center">
              <Text className="text-gray-400 text-xs uppercase tracking-widest mb-2">Código de Invitación</Text>
              <Text className="text-neonOrange text-4xl font-black tracking-widest">{createdCode}</Text>
              <Text className="text-gray-500 text-xs mt-3 text-center">Compártelo con tus amigos para que se unan</Text>
            </View>
          )}

          <TouchableOpacity
            className="w-full bg-neonGreen py-5 rounded-2xl items-center"
            onPress={() => void runLeavingAction(() => router.replace('/(tabs)/dashboard'))}
            disabled={leavingScreen}
          >
            {leavingScreen ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-black font-black text-lg tracking-widest uppercase">Ir al Dashboard</Text>
            )}
          </TouchableOpacity>

          {createdCode && (
            <TouchableOpacity
              className="mt-4"
              onPress={() => void runLeavingAction(() => router.replace('/(tabs)/explore'))}
              disabled={leavingScreen}
            >
              <Text className="text-gray-400 text-sm">Volver a Explorar</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      <View className="px-6 pt-6 pb-4 border-b border-[#222]" style={{ zIndex: 20, elevation: 6 }}>
        <View className="flex-row items-center" style={{ minHeight: 52 }}>
          <View style={{ width: 44, marginRight: 12 }}>
            <HeaderActionButton
              onPress={() => void runLeavingAction(() => router.back())}
              disabled={leavingScreen}
              loading={leavingScreen}
              icon="‹"
            />
          </View>
          <Text className="text-white text-2xl font-black tracking-widest uppercase flex-1" numberOfLines={1}>
            Crear Reto
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-8">

        <View className="mb-6">
          <Text className="text-gray-400 mb-2 text-sm font-bold uppercase tracking-wider">Nombre del Reto</Text>
          <TextInput
            style={{ backgroundColor: '#1e1e1e', color: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333', fontSize: 16 }}
            placeholder="Ej. Abdominales 30 Días"
            placeholderTextColor="#555"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-400 mb-2 text-sm font-bold uppercase tracking-wider">Descripción</Text>
          <TextInput
            style={{ backgroundColor: '#1e1e1e', color: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333', fontSize: 15, minHeight: 80, textAlignVertical: 'top' }}
            placeholder="Describe de qué trata el reto..."
            placeholderTextColor="#555"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-400 mb-2 text-sm font-bold uppercase tracking-wider">Duración (Días)</Text>
          <TextInput
            style={{ backgroundColor: '#1e1e1e', color: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333', fontSize: 16 }}
            placeholder="30"
            placeholderTextColor="#555"
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-400 mb-2 text-sm font-bold uppercase tracking-wider">
            Evidencia Requerida 📋
          </Text>
          <Text className="text-gray-600 text-xs mb-3">
            Dile a los participantes qué deben subir cada día para demostrar que completaron el reto.
          </Text>
          <TextInput
            style={{
              backgroundColor: '#1e1e1e', color: 'white',
              padding: 16, borderRadius: 12,
              borderWidth: 1, borderColor: '#333',
              fontSize: 15, minHeight: 90,
              textAlignVertical: 'top',
            }}
            placeholder="Ej: Sube 1 foto de tu desayuno sin gluten"
            placeholderTextColor="#555"
            value={evidenceDescription}
            onChangeText={setEvidenceDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View className="flex-row justify-between items-center bg-[#1A1A1A] p-4 rounded-xl border border-white/5 mb-8">
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text className="text-white font-bold text-base mb-1">Reto Privado 🔒</Text>
            <Text className="text-gray-500 text-xs">Genera un código secreto para invitar solo a tus amigos.</Text>
          </View>
          <Switch
            trackColor={{ false: '#333', true: 'rgba(57,255,20,0.5)' }}
            thumbColor={isPrivate ? '#39FF14' : '#888'}
            onValueChange={setIsPrivate}
            value={isPrivate}
          />
        </View>

        {validationWarning ? (
          <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <Text className="text-red-400 text-sm font-bold mb-1">Revisa tu reto</Text>
            <Text className="text-red-300 text-xs">{validationWarning}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={{
            width: '100%', paddingVertical: 18, borderRadius: 16,
            alignItems: 'center',
            backgroundColor: loading ? '#444' : '#39FF14',
          }}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 3 }}>
              {isPrivate ? 'Crear y Generar Código' : 'Crear Reto Público'}
            </Text>
          )}
        </TouchableOpacity>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}

import { Alert, Platform } from 'react-native';
import { API_URL } from '../constants/api';
import { authHeaders, getToken } from '../constants/auth';

/**
 * Mock service wrapper for HealthConnect (Android) / Apple Health (iOS).
 *
 * ⚠️  MOCK — En desarrollo siempre reporta 10,450 pasos, por lo que
 *     `syncSteps()` siempre completa el reto. En producción hay que
 *     reemplazar `currentSteps` con la lectura real del API nativa
 *     (HealthKit en iOS, HealthConnect en Android).
 *
 * Pendiente: integrar react-native-health / react-native-health-connect.
 */
export const HealthSyncService = {
  syncSteps: async (challengeId: number, targetSteps: number = 10000): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
        const currentSteps = 10450; // TODO: reemplazar con lectura real del API de salud
        
        if (currentSteps >= targetSteps) {
          void (async () => {
            try {
              const token = await getToken();
              if (!token) throw new Error('Missing token');

              const response = await fetch(`${API_URL}/check-ins/sync-steps`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({ challengeId, steps: currentSteps }),
              });

              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.error || 'No se pudo registrar el check-in');
              }

              Alert.alert(
                '¡Sincronización Exitosa! ⌚',
                `Se leyeron ${currentSteps} pasos desde ${platformName}. ¡Reto completado por hoy!`,
                [{ text: '¡VAMOS!', onPress: () => resolve(true) }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo sincronizar tus pasos');
              resolve(false);
            }
          })();
        } else {
          Alert.alert(
            'Aún te falta 🏃',
            `Llevas ${currentSteps} pasos de ${targetSteps}. ¡Sigue moviéndote!`,
            [{ text: 'Entendido', onPress: () => resolve(false) }]
          );
        }
      }, 1500); // 1.5s delay to simulate hardware ping
    });
  }
};

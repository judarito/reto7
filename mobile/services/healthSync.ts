import { Alert, Platform } from 'react-native';

/**
 * Mock service wrapper for HealthConnect (Android) / Apple Health (iOS)
 */
export const HealthSyncService = {
  syncSteps: async (targetSteps: number = 10000): Promise<boolean> => {
    return new Promise((resolve) => {
      // Simulate connecting to hardware service
      setTimeout(() => {
        const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
        
        // Mocking a successful read where the user has completed their steps
        const currentSteps = 10450; 
        
        if (currentSteps >= targetSteps) {
          Alert.alert(
            '¡Sincronización Exitosa! ⌚',
            `Se leyeron ${currentSteps} pasos desde ${platformName}. ¡Reto completado por hoy!`,
            [{ text: '¡VAMOS!', onPress: () => resolve(true) }]
          );
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

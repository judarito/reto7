import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { API_URL } from '../constants/api';
import { setToken } from '../constants/auth';

export default function LoginScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (isRegister && !username)) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister ? { email, password, username } : { email, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Guardar token de forma segura
      await setToken(data.token);

      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background justify-center px-8"
    >
      <View className="mb-12">
        <Text className="text-white text-5xl font-black tracking-tighter mb-2">RETO<Text className="text-neonOrange">7</Text></Text>
        <Text className="text-gray-400 text-lg">Construye tu racha. Domina el día.</Text>
      </View>

      <View className="space-y-4 gap-4">
        {isRegister && (
          <View>
            <Text className="text-gray-400 mb-1 text-sm font-bold uppercase tracking-wider">Nombre de usuario</Text>
            <TextInput
              className="w-full bg-[#1e1e1e] text-white p-4 rounded-xl border border-gray-800 focus:border-neonGreen"
              placeholder="athlete123"
              placeholderTextColor="#555"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
        )}

        <View>
          <Text className="text-gray-400 mb-1 text-sm font-bold uppercase tracking-wider">Correo electrónico</Text>
          <TextInput
            className="w-full bg-[#1e1e1e] text-white p-4 rounded-xl border border-gray-800 focus:border-neonGreen"
            placeholder="athlete@reto7.com"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-gray-400 mb-1 text-sm font-bold uppercase tracking-wider">Contraseña</Text>
          <TextInput
            className="w-full bg-[#1e1e1e] text-white p-4 rounded-xl border border-gray-800 focus:border-neonGreen"
            placeholder="••••••••"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          className={`w-full ${loading ? 'bg-gray-600' : 'bg-neonGreen'} py-5 rounded-2xl items-center mt-6 shadow-[0_0_20px_rgba(57,255,20,0.4)]`}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text className="text-black font-black text-lg tracking-widest uppercase">
            {loading ? 'Cargando...' : (isRegister ? 'Registrarse' : 'Ingresar')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="mt-4 items-center" onPress={() => setIsRegister(!isRegister)}>
          <Text className="text-gray-400 text-sm">
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

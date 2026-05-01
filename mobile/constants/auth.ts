import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Caché del token JWT en memoria para evitar lecturas repetidas a SecureStore.
 * - `undefined` = no cacheado aún (hay que leer del store)
 * - `string`    = token válido en caché
 * - `null`      = no hay token (sesión expirada o nunca iniciada)
 */
let tokenCache: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (tokenCache !== undefined) {
    return tokenCache;
  }

  if (Platform.OS === 'web') {
    tokenCache = localStorage.getItem('userToken');
    return tokenCache;
  }

  tokenCache = await SecureStore.getItemAsync('userToken');
  return tokenCache;
}

export async function setToken(token: string): Promise<void> {
  tokenCache = token;

  if (Platform.OS === 'web') {
    localStorage.setItem('userToken', token);
  } else {
    await SecureStore.setItemAsync('userToken', token);
  }
}

export async function clearToken(): Promise<void> {
  tokenCache = null;

  if (Platform.OS === 'web') {
    localStorage.removeItem('userToken');
  } else {
    await SecureStore.deleteItemAsync('userToken');
  }
}

export function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

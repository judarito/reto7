import { Platform } from 'react-native';

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

function getDefaultApiUrl() {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  return 'http://localhost:3000/api';
}

export const API_URL = (envApiUrl && envApiUrl.length > 0 ? envApiUrl : getDefaultApiUrl()).replace(/\/$/, '');
export const API_BASE_URL = API_URL.replace(/\/api$/, '');

export class ApiTimeoutError extends Error {
  constructor(message: string = 'La solicitud tardó demasiado. Revisa tu conexión o espera a que el servidor despierte.') {
    super(message);
    this.name = 'ApiTimeoutError';
  }
}

export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs: number = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new ApiTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * fetchWithRetry — reintenta la petición con backoff exponencial.
 * Útil para manejar reinicios del servidor o cold starts de Turso.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries: number = 2,
  baseTimeoutMs: number = 15000
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Backoff exponencial: 1s, 2s, 4s...
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return await fetchWithTimeout(input, init, baseTimeoutMs + attempt * 5000);
    } catch (error) {
      lastError = error;
      // Solo reintentar en errores de red/timeout (no en errores HTTP 4xx/5xx)
      if (error instanceof ApiTimeoutError || (error as any)?.message?.includes('Network')) {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

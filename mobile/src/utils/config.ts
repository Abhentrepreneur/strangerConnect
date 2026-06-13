import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Production backend on Railway.
 * Hardcoded so release APKs always use this URL — never depends on .env or Metro.
 */
export const PRODUCTION_API_URL =
  'https://strangerconnect-production.up.railway.app/api/v1';

export const PRODUCTION_SOCKET_URL =
  'https://strangerconnect-production.up.railway.app';

type ExtraConfig = {
  apiUrl?: string;
  socketUrl?: string;
};

function getExtra(): ExtraConfig {
  const manifestExtra = (Constants as { manifest?: { extra?: ExtraConfig } }).manifest?.extra;
  const extra = Constants.expoConfig?.extra ?? manifestExtra ?? {};
  return extra as ExtraConfig;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function normalizeApiUrl(url: string): string {
  const clean = stripTrailingSlash(url);
  if (clean.endsWith('/api/v1')) return clean;
  return `${clean}/api/v1`;
}

function isLocalDevEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_USE_LOCAL === 'true';
}

function getLocalHost(): string {
  const devHost = process.env.EXPO_PUBLIC_DEV_SERVER_HOST?.trim();
  if (Platform.OS === 'android') {
    return devHost || '10.0.2.2';
  }
  return devHost || 'localhost';
}

/** API base URL — Railway in release; env override supported in dev */
export function getApiUrl(): string {
  if (isLocalDevEnabled()) {
    return `http://${getLocalHost()}:3000/api/v1`;
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  return normalizeApiUrl(envUrl || getExtra().apiUrl || PRODUCTION_API_URL);
}

/** Socket.IO server URL — Railway in release; env override supported in dev */
export function getSocketUrl(): string {
  if (isLocalDevEnabled()) {
    return `http://${getLocalHost()}:3000`;
  }

  const envUrl = process.env.EXPO_PUBLIC_SOCKET_URL?.trim();
  return stripTrailingSlash(envUrl || getExtra().socketUrl || PRODUCTION_SOCKET_URL);
}

export function isSecureServer(): boolean {
  return getSocketUrl().startsWith('https://');
}

export function getResolvedServerInfo() {
  return {
    mode: isLocalDevEnabled() ? 'local' : 'production',
    apiUrl: getApiUrl(),
    socketUrl: getSocketUrl(),
    isDevice: Constants.isDevice,
    isDev: __DEV__,
  };
}

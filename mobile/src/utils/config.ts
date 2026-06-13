import { Platform } from 'react-native';
import Constants from 'expo-constants';

const INVALID_CLIENT_HOSTS = new Set(['0.0.0.0', 'localhost', '127.0.0.1']);
const EMULATOR_ONLY_HOSTS = new Set(['10.0.2.2', 'localhost', '127.0.0.1']);

/** Your laptop's LAN IP — set in mobile/.env as EXPO_PUBLIC_DEV_SERVER_HOST */
function getExplicitDevHost(): string | null {
  const host = process.env.EXPO_PUBLIC_DEV_SERVER_HOST?.trim();
  if (host && !INVALID_CLIENT_HOSTS.has(host)) {
    return host;
  }
  return null;
}

/** Metro bundler host when dev client is connected to Metro. */
function getMetroHost(): string | null {
  const sources = [
    Constants.expoConfig?.hostUri,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
    Constants.expoGoConfig?.debuggerHost,
  ];

  for (const source of sources) {
    if (!source) continue;
    const host = source.split(':')[0]?.trim();
    if (host && !INVALID_CLIENT_HOSTS.has(host)) {
      return host;
    }
  }

  return null;
}

function extractHostFromUrl(url?: string): string | null {
  if (!url) return null;

  try {
    const host = new URL(url).hostname;
    if (!host || INVALID_CLIENT_HOSTS.has(host)) return null;
    if (Constants.isDevice && EMULATOR_ONLY_HOSTS.has(host)) return null;
    return host;
  } catch {
    return null;
  }
}

function resolveServerHost(): string {
  // 1. Explicit laptop IP from .env (best for physical device)
  const explicit = getExplicitDevHost();
  if (explicit) return explicit;

  // 2. Metro host when running via `expo start` + dev client
  const metro = getMetroHost();
  if (metro) return metro;

  // 3. Valid host parsed from EXPO_PUBLIC_API_URL / SOCKET_URL
  const fromApiEnv = extractHostFromUrl(process.env.EXPO_PUBLIC_API_URL);
  if (fromApiEnv) return fromApiEnv;

  const fromSocketEnv = extractHostFromUrl(process.env.EXPO_PUBLIC_SOCKET_URL);
  if (fromSocketEnv) return fromSocketEnv;

  // 4. Platform fallbacks (emulators / simulators only)
  if (Platform.OS === 'ios' && !Constants.isDevice) {
    return 'localhost';
  }

  if (!Constants.isDevice) {
    return '10.0.2.2';
  }

  // Physical device with no valid config — return explicit env hint host
  return explicit ?? 'CONFIGURE_DEV_SERVER_HOST';
}

export function getApiUrl(): string {
  const host = resolveServerHost();
  return `http://${host}:3000/api/v1`;
}

export function getSocketUrl(): string {
  const host = resolveServerHost();
  return `http://${host}:3000`;
}

/** For debugging — shows which server the app is targeting. */
export function getResolvedServerInfo(): { host: string; apiUrl: string; socketUrl: string } {
  const host = resolveServerHost();
  return {
    host,
    apiUrl: `http://${host}:3000/api/v1`,
    socketUrl: `http://${host}:3000`,
  };
}

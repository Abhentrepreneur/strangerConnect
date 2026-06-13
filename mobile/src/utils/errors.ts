import { AxiosError } from 'axios';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Check your internet connection.';
    }
    if (error.message === 'Network Error' || !error.response) {
      return 'Cannot reach server. Check your internet connection and try again.';
    }
    const data = error.response.data as { message?: string | string[] };
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return `Server error (${error.response.status})`;
  }

  if (error instanceof Error) {
    if (error.message.includes('Socket connection timed out')) {
      return 'Connection timed out. Try switching between Wi-Fi and mobile data, then try again.';
    }
    if (error.message.includes('websocket') || error.message.includes('WebSocket')) {
      return 'Could not connect to chat server. Check your internet connection and try again.';
    }
    if (error.message.includes('auth') || error.message.includes('log in')) {
      return error.message;
    }
    return error.message;
  }

  return fallback;
}

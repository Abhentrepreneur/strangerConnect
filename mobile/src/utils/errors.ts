import { AxiosError } from 'axios';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Check your network connection.';
    }
    if (error.message === 'Network Error' || !error.response) {
      return 'Cannot reach server. Make sure the backend is running and your phone is on the same Wi-Fi as your computer.';
    }
    const data = error.response.data as { message?: string | string[] };
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return `Server error (${error.response.status})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

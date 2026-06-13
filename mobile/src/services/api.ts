import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, AuthTokens, AppStats, User } from '../types';
import { getApiUrl } from '../utils/config';

const api = axios.create({
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  return config;
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await SecureStore.getItemAsync('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post<AuthTokens>(`${getApiUrl()}/auth/refresh`, { refreshToken });
          await SecureStore.setItemAsync('accessToken', data.accessToken);
          await SecureStore.setItemAsync('refreshToken', data.refreshToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          }
          return api(originalRequest);
        } catch {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
        }
      }
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  sendOtp: (email: string) => api.post('/auth/otp/send', { email }),
  verifyOtp: (email: string, code: string) =>
    api.post<AuthResponse>('/auth/otp/verify', { email, code }),
  googleLogin: (idToken: string) => api.post<AuthResponse>('/auth/google', { idToken }),
  guestLogin: (username?: string) => api.post<AuthResponse>('/auth/guest', { username }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

export const userApi = {
  getProfile: () => api.get<User>('/users/me'),
  updateProfile: (data: Partial<User>) => api.patch<User>('/users/me', data),
  blockUser: (userId: string) => api.post('/users/block', { userId }),
  updateFcmToken: (fcmToken: string) => api.post('/users/fcm-token', { fcmToken }),
};

export const statsApi = {
  getStats: () => api.get<AppStats>('/stats'),
};

export const reportApi = {
  createReport: (data: {
    reportedUserId: string;
    reason: string;
    description?: string;
    sessionId?: string;
  }) => api.post('/reports', data),
};

export default api;

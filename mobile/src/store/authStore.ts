import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasOnboarded: boolean;
  setUser: (user: User | null) => void;
  setHasOnboarded: (value: boolean) => void;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hasOnboarded: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setHasOnboarded: async (value) => {
    await AsyncStorage.setItem('hasOnboarded', JSON.stringify(value));
    set({ hasOnboarded: value });
  },

  login: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout errors
      }
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const [accessToken, hasOnboardedStr] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        AsyncStorage.getItem('hasOnboarded'),
      ]);

      const hasOnboarded = hasOnboardedStr ? JSON.parse(hasOnboardedStr) : false;
      set({ hasOnboarded });

      if (accessToken) {
        const { data } = await import('../services/api').then((m) => m.userApi.getProfile());
        set({ user: data, isAuthenticated: true });
      }
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } finally {
      set({ isLoading: false });
    }
  },
}));

import { create } from 'zustand';
import { ChatMessage, Partner, QueueStats } from '../types';

interface ChatState {
  isSearching: boolean;
  sessionId: string | null;
  partner: Partner | null;
  messages: ChatMessage[];
  isTyping: boolean;
  queueStats: QueueStats | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callStartTime: number | null;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  setSearching: (value: boolean) => void;
  setMatch: (sessionId: string, partner: Partner) => void;
  addMessage: (message: ChatMessage) => void;
  setTyping: (value: boolean) => void;
  setQueueStats: (stats: QueueStats) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  setNetworkQuality: (quality: ChatState['networkQuality']) => void;
  reset: () => void;
}

const initialState = {
  isSearching: false,
  sessionId: null as string | null,
  partner: null as Partner | null,
  messages: [] as ChatMessage[],
  isTyping: false,
  queueStats: null as QueueStats | null,
  isMuted: false,
  isVideoEnabled: true,
  callStartTime: null as number | null,
  networkQuality: 'good' as const,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setSearching: (value) => set({ isSearching: value }),

  setMatch: (sessionId, partner) =>
    set({
      sessionId,
      partner,
      isSearching: false,
      callStartTime: Date.now(),
      messages: [],
    }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setTyping: (value) => set({ isTyping: value }),

  setQueueStats: (stats) => set({ queueStats: stats }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleVideo: () => set((state) => ({ isVideoEnabled: !state.isVideoEnabled })),

  setNetworkQuality: (quality) => set({ networkQuality: quality }),

  reset: () => set(initialState),
}));

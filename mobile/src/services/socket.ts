import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { ChatMessage, Partner, QueueStats } from '../types';
import { getApiUrl, getSocketUrl, isSecureServer } from '../utils/config';

type MatchFoundPayload = {
  sessionId: string;
  partner: Partner;
  isInitiator: boolean;
};

type SocketEvents = {
  match_found: (data: MatchFoundPayload) => void;
  searching: (stats: QueueStats) => void;
  receive_message: (message: ChatMessage) => void;
  typing: (data: { sessionId: string; isTyping: boolean }) => void;
  disconnect_user: (data: { reason: string }) => void;
  call_ended: (data: { reason: string }) => void;
  webrtc_offer: (data: { sessionId: string; offer: RTCSessionDescriptionInit }) => void;
  webrtc_answer: (data: { sessionId: string; answer: RTCSessionDescriptionInit }) => void;
  webrtc_ice_candidate: (data: { sessionId: string; candidate: RTCIceCandidateInit }) => void;
  screenshot_warning: (data: { message: string }) => void;
  report_submitted: (data: { message: string }) => void;
};

class SocketService {
  private socket: Socket | null = null;
  private connecting: Promise<Socket> | null = null;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) return this.socket;
    if (this.connecting) return this.connecting;

    this.connecting = this.createConnection();

    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      throw new Error('Session expired. Please log in again.');
    }

    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${getApiUrl()}/auth/refresh`,
      { refreshToken },
    );

    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    return data.accessToken;
  }

  private async createConnection(retryWithRefresh = true): Promise<Socket> {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) {
      throw new Error('Not authenticated. Please log in again.');
    }

    const socketUrl = getSocketUrl();

    this.socket = io(`${socketUrl}/chat`, {
      auth: { token },
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10_000,
      timeout: 45_000,
      secure: isSecureServer(),
      autoConnect: true,
    });

    this.socket.on('connect_error', () => {
      if (this.socket && !this.socket.connected) {
        this.socket.io.opts.transports = ['polling', 'websocket'];
      }
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket failed to initialize'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timed out. Check your internet connection.'));
      }, 45_000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve(this.socket!);
      });

      this.socket.once('connect_error', async (err: Error) => {
        clearTimeout(timeout);
        const message = err.message || 'Could not connect to chat server.';
        const isAuthError =
          message.toLowerCase().includes('auth') ||
          message.toLowerCase().includes('token') ||
          message.toLowerCase().includes('jwt');

        if (retryWithRefresh && isAuthError) {
          try {
            await this.refreshAccessToken();
            this.socket?.removeAllListeners();
            this.socket?.disconnect();
            this.socket = null;
            resolve(await this.createConnection(false));
            return;
          } catch (refreshError) {
            reject(
              refreshError instanceof Error
                ? refreshError
                : new Error('Session expired. Please log in again.'),
            );
            return;
          }
        }

        reject(new Error(message));
      });
    });
  }

  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connecting = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  joinQueue(preferences?: {
    country?: string;
    language?: string;
    gender?: string;
    interests?: string[];
  }) {
    if (!this.socket?.connected) {
      throw new Error('Socket is not connected');
    }
    this.socket.emit('join_queue', preferences || {});
  }

  nextUser() {
    this.socket?.emit('next_user');
  }

  sendMessage(sessionId: string, content: string) {
    this.socket?.emit('send_message', { sessionId, content });
  }

  sendTyping(sessionId: string, isTyping: boolean) {
    this.socket?.emit('typing', { sessionId, isTyping });
  }

  sendWebRtcOffer(sessionId: string, offer: RTCSessionDescriptionInit) {
    this.socket?.emit('webrtc_offer', { sessionId, offer });
  }

  sendWebRtcAnswer(sessionId: string, answer: RTCSessionDescriptionInit) {
    this.socket?.emit('webrtc_answer', { sessionId, answer });
  }

  sendIceCandidate(sessionId: string, candidate: RTCIceCandidateInit) {
    this.socket?.emit('webrtc_ice_candidate', { sessionId, candidate });
  }

  reportUser(data: {
    reportedUserId: string;
    reason: string;
    description?: string;
    sessionId?: string;
  }) {
    this.socket?.emit('report_user', data);
  }

  disconnectUser() {
    this.socket?.emit('disconnect_user');
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket?.on(event, callback as any);
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]) {
    if (callback) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket?.off(event, callback as any);
    } else {
      this.socket?.off(event);
    }
  }
}

export const socketService = new SocketService();

import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { ChatMessage, Partner, QueueStats } from '../types';
import { getSocketUrl, isSecureServer } from '../utils/config';

type SocketEvents = {
  match_found: (data: { sessionId: string; partner: Partner }) => void;
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

  private async createConnection(): Promise<Socket> {
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
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
      timeout: 30_000,
      secure: isSecureServer(),
      forceNew: true,
      autoConnect: true,
    });

    this.socket.on('connect_error', () => {
      if (this.socket && !this.socket.connected) {
        this.socket.io.opts.transports = ['polling'];
      }
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket failed to initialize'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timed out. Check your internet connection.'));
      }, 30_000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve(this.socket!);
      });

      this.socket.once('connect_error', (err: Error) => {
        clearTimeout(timeout);
        const message = err.message?.includes('auth')
          ? 'Session expired. Please log in again.'
          : err.message || 'Could not connect to chat server.';
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

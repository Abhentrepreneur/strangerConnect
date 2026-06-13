import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { ChatMessage, Partner, QueueStats } from '../types';
import { getSocketUrl } from '../utils/config';

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

  async connect(): Promise<Socket> {
    if (this.socket?.connected) return this.socket;

    const token = await SecureStore.getItemAsync('accessToken');

    this.socket = io(`${getSocketUrl()}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 15000,
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket failed to initialize'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timed out'));
      }, 15000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve(this.socket!);
      });

      this.socket.once('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  joinQueue(preferences?: {
    country?: string;
    language?: string;
    gender?: string;
    interests?: string[];
  }) {
    this.socket?.emit('join_queue', preferences || {});
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

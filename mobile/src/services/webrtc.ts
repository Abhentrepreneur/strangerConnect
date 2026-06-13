import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { ICE_SERVERS } from '../constants';
import { socketService } from './socket';

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor';

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private sessionId: string | null = null;
  private isInitiator = false;

  onRemoteStream?: (stream: MediaStream) => void;
  onNetworkQuality?: (quality: NetworkQuality) => void;

  async initialize(sessionId: string, isInitiator: boolean): Promise<MediaStream> {
    this.sessionId = sessionId;
    this.isInitiator = isInitiator;

    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });

    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.peerConnection as any).ontrack = (event: { streams?: MediaStream[] }) => {
      if (event.streams?.[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream?.(event.streams[0]);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.peerConnection as any).onicecandidate = (event: { candidate: RTCIceCandidate | null }) => {
      if (event.candidate && this.sessionId) {
        socketService.sendIceCandidate(this.sessionId, event.candidate.toJSON());
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.peerConnection as any).onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        this.onNetworkQuality?.('excellent');
      } else if (state === 'disconnected' || state === 'failed') {
        this.onNetworkQuality?.('poor');
      }
    };

    this.setupSocketListeners();

    if (isInitiator) {
      await this.createOffer();
    }

    return this.localStream;
  }

  private setupSocketListeners() {
    socketService.on('webrtc_offer', async ({ sessionId, offer }) => {
      if (sessionId !== this.sessionId || !this.peerConnection) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer as any));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      socketService.sendWebRtcAnswer(sessionId, answer.toJSON());
    });

    socketService.on('webrtc_answer', async ({ sessionId, answer }) => {
      if (sessionId !== this.sessionId || !this.peerConnection) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer as any));
    });

    socketService.on('webrtc_ice_candidate', async ({ sessionId, candidate }) => {
      if (sessionId !== this.sessionId || !this.peerConnection) return;
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }

  private async createOffer() {
    if (!this.peerConnection || !this.sessionId) return;
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    socketService.sendWebRtcOffer(this.sessionId, offer.toJSON());
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  async switchCamera() {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (!videoTrack) return;

    // react-native-webrtc extension for camera switching
    const track = videoTrack as typeof videoTrack & { _switchCamera?: () => void };
    track._switchCamera?.();
  }

  cleanup() {
    socketService.off('webrtc_offer');
    socketService.off('webrtc_answer');
    socketService.off('webrtc_ice_candidate');

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection?.close();

    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.sessionId = null;
  }
}

export const webrtcService = new WebRTCService();

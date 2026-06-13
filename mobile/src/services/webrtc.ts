import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { ICE_SERVERS } from '../constants';
import { socketService } from './socket';
import {
  hasRequiredMediaPermissions,
  requestMediaPermissions,
} from '../utils/permissions';
import { MediaConnectionError, MediaPermissionError } from '../utils/mediaErrors';
import { startCallAudio, stopCallAudio } from '../utils/audioSession';

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor';

type SignalOffer = { sessionId: string; offer: RTCSessionDescriptionInit };
type SignalAnswer = { sessionId: string; answer: RTCSessionDescriptionInit };
type SignalCandidate = { sessionId: string; candidate: RTCIceCandidateInit };

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private sessionId: string | null = null;
  private isInitiator = false;
  private isReady = false;
  private makingOffer = false;
  private ignoreOffer = false;
  private hasVideo = true;
  private pendingOffer: SignalOffer | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  private readonly onOffer = (data: SignalOffer) => void this.handleOffer(data);
  private readonly onAnswer = (data: SignalAnswer) => void this.handleAnswer(data);
  private readonly onCandidate = (data: SignalCandidate) => void this.handleCandidate(data);

  onRemoteStream?: (stream: MediaStream) => void;
  onNetworkQuality?: (quality: NetworkQuality) => void;
  onConnectionFailed?: (message: string) => void;

  async initialize(sessionId: string, isInitiator: boolean): Promise<MediaStream> {
    this.sessionId = sessionId;
    this.isInitiator = isInitiator;

    this.attachSocketListeners();

    const permissions = await requestMediaPermissions();
    if (!hasRequiredMediaPermissions(permissions)) {
      throw new MediaPermissionError(
        'Microphone permission is required for video chat.',
        permissions.camera,
        permissions.microphone,
      );
    }

    startCallAudio();

    this.peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
    });

    this.setupPeerConnectionHandlers();
    this.localStream = await this.acquireLocalStream(permissions.camera);
    this.hasVideo = this.localStream.getVideoTracks().length > 0;

    this.localStream.getTracks().forEach((track) => {
      track.enabled = true;
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.isReady = true;

    if (this.pendingOffer) {
      await this.handleOffer(this.pendingOffer);
      this.pendingOffer = null;
    } else if (isInitiator) {
      await this.createOffer();
    }

    await this.drainPendingCandidates();

    const existingRemote = this.remoteStream;
    if (existingRemote) {
      this.onRemoteStream?.(existingRemote);
    }

    return this.localStream;
  }

  private async acquireLocalStream(cameraGranted: boolean): Promise<MediaStream> {
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    const videoConstraints = {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 24 },
    };

    if (cameraGranted) {
      try {
        return await mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        });
      } catch {
        // Fall back to audio-only if camera is busy or unavailable.
      }
    }

    try {
      return await mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
    } catch {
      throw new MediaPermissionError(
        'Microphone permission is required for video chat.',
        cameraGranted,
        false,
      );
    }
  }

  private attachSocketListeners() {
    socketService.off('webrtc_offer', this.onOffer);
    socketService.off('webrtc_answer', this.onAnswer);
    socketService.off('webrtc_ice_candidate', this.onCandidate);

    socketService.on('webrtc_offer', this.onOffer);
    socketService.on('webrtc_answer', this.onAnswer);
    socketService.on('webrtc_ice_candidate', this.onCandidate);
  }

  private setupPeerConnectionHandlers() {
    if (!this.peerConnection) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.peerConnection as any).ontrack = (event: { streams?: MediaStream[]; track?: MediaStreamTrack }) => {
      const stream = event.streams?.[0];
      if (!stream) return;

      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });

      this.remoteStream = stream;
      this.onRemoteStream?.(stream);
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
      } else if (state === 'disconnected') {
        this.onNetworkQuality?.('fair');
      } else if (state === 'failed') {
        this.onNetworkQuality?.('poor');
        this.onConnectionFailed?.('Unable to establish a media connection. Check your network and try again.');
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.peerConnection as any).oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        this.onNetworkQuality?.('excellent');
      } else if (state === 'failed') {
        this.onNetworkQuality?.('poor');
        this.onConnectionFailed?.('Network connection failed. Try switching between Wi-Fi and mobile data.');
      }
    };
  }

  private async handleOffer(data: SignalOffer) {
    if (data.sessionId !== this.sessionId) return;

    if (!this.isReady || !this.peerConnection) {
      this.pendingOffer = data;
      return;
    }

    const offerCollision =
      this.peerConnection.signalingState !== 'stable' || this.makingOffer;
    this.ignoreOffer = !this.isInitiator && offerCollision;
    if (this.ignoreOffer) return;

    if (offerCollision) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.peerConnection.setLocalDescription({ type: 'rollback' } as any);
    }

    if (this.peerConnection.signalingState !== 'stable' && this.peerConnection.signalingState !== 'have-local-offer') {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer as any));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    socketService.sendWebRtcAnswer(data.sessionId, answer.toJSON());
    await this.drainPendingCandidates();
  }

  private async handleAnswer(data: SignalAnswer) {
    if (data.sessionId !== this.sessionId || !this.peerConnection) return;
    if (this.peerConnection.signalingState !== 'have-local-offer') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer as any));
    await this.drainPendingCandidates();
  }

  private async handleCandidate(data: SignalCandidate) {
    if (data.sessionId !== this.sessionId) return;

    if (!this.peerConnection?.remoteDescription) {
      this.pendingCandidates.push(data.candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch {
      this.pendingCandidates.push(data.candidate);
    }
  }

  private async drainPendingCandidates() {
    if (!this.peerConnection?.remoteDescription) return;

    const queued = [...this.pendingCandidates];
    this.pendingCandidates = [];

    for (const candidate of queued) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore stale candidates
      }
    }
  }

  private async createOffer() {
    if (!this.peerConnection || !this.sessionId) return;

    this.makingOffer = true;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await this.peerConnection.setLocalDescription(offer);
      socketService.sendWebRtcOffer(this.sessionId, offer.toJSON());
    } catch {
      throw new MediaConnectionError('Failed to start media negotiation.');
    } finally {
      this.makingOffer = false;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  hasLocalVideo(): boolean {
    return this.hasVideo;
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

    const track = videoTrack as typeof videoTrack & { _switchCamera?: () => void };
    track._switchCamera?.();
  }

  cleanup() {
    socketService.off('webrtc_offer', this.onOffer);
    socketService.off('webrtc_answer', this.onAnswer);
    socketService.off('webrtc_ice_candidate', this.onCandidate);

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection?.close();
    stopCallAudio();

    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.sessionId = null;
    this.isReady = false;
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.hasVideo = true;
    this.pendingOffer = null;
    this.pendingCandidates = [];
  }
}

export const webrtcService = new WebRTCService();

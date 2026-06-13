import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { ActionButton } from '../components/ui/ActionButton';
import { socketService } from '../services/socket';
import { webrtcService } from '../services/webrtc';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../constants';
import { RootStackParamList, ChatMessage } from '../types';
import { classifyMediaError } from '../utils/mediaErrors';

interface VideoChatScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'VideoChat'>;
  route: RouteProp<RootStackParamList, 'VideoChat'>;
}

export function VideoChatScreen({ navigation, route }: VideoChatScreenProps) {
  const { sessionId, partner, isInitiator } = route.params;
  const { user } = useAuthStore();
  const {
    messages,
    isMuted,
    isVideoEnabled,
    isTyping,
    callStartTime,
    networkQuality,
    addMessage,
    setTyping,
    toggleMute,
    toggleVideo,
    setNetworkQuality,
    reset,
  } = useChatStore();

  const [showChat, setShowChat] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const [hasLocalVideo, setHasLocalVideo] = useState(true);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initStarted = useRef(false);

  const endCall = useCallback(() => {
    webrtcService.cleanup();
    socketService.disconnectUser();
    reset();
    navigation.navigate('Main');
  }, [navigation, reset]);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    webrtcService.onRemoteStream = (remoteStream) => {
      remoteStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setRemoteStreamUrl(remoteStream.toURL());
    };

    webrtcService.onNetworkQuality = setNetworkQuality;

    webrtcService.onConnectionFailed = (message) => {
      Alert.alert('Media Connection Failed', message, [
        { text: 'End Call', onPress: endCall, style: 'destructive' },
        { text: 'Keep Trying', style: 'cancel' },
      ]);
    };

    const init = async () => {
      try {
        if (!socketService.isConnected()) {
          await socketService.connect();
        }

        const stream = await webrtcService.initialize(sessionId, isInitiator);
        setLocalStreamUrl(stream.toURL());
        setHasLocalVideo(webrtcService.hasLocalVideo());

        const existingRemote = webrtcService.getRemoteStream();
        if (existingRemote) {
          setRemoteStreamUrl(existingRemote.toURL());
        }
      } catch (error) {
        const { title, message } = classifyMediaError(error);
        Alert.alert(title, message, [{ text: 'OK', onPress: endCall }]);
      }
    };

    init();

    socketService.on('receive_message', (message) => {
      addMessage(message);
    });

    socketService.on('typing', ({ isTyping: typing }) => {
      setTyping(typing);
    });

    socketService.on('disconnect_user', () => {
      Alert.alert('Partner Left', 'Your chat partner has disconnected.', [
        { text: 'OK', onPress: endCall },
      ]);
    });

    socketService.on('call_ended', () => {
      endCall();
    });

    return () => {
      webrtcService.cleanup();
      socketService.off('receive_message');
      socketService.off('typing');
      socketService.off('disconnect_user');
      socketService.off('call_ended');
    };
  }, [sessionId, isInitiator, addMessage, setTyping, setNetworkQuality, endCall]);

  useEffect(() => {
    if (!callStartTime) return;

    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [callStartTime]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    socketService.sendMessage(sessionId, messageText.trim());
    setMessageText('');
    socketService.sendTyping(sessionId, false);
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);
    socketService.sendTyping(sessionId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketService.sendTyping(sessionId, false);
    }, 2000);
  };

  const handleSkip = () => {
    webrtcService.cleanup();
    socketService.nextUser();
    reset();
    navigation.replace('Matching');
  };

  const handleReport = () => {
    Alert.alert('Report User', 'Why are you reporting this user?', [
      { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate_content') },
      { text: 'Harassment', onPress: () => submitReport('harassment') },
      { text: 'Spam', onPress: () => submitReport('spam') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitReport = (reason: string) => {
    socketService.reportUser({
      reportedUserId: partner.id,
      reason,
      sessionId,
    });
    Alert.alert('Reported', 'Thank you. We will review this report.');
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    toggleMute();
    webrtcService.toggleAudio(!nextMuted);
  };

  const handleToggleVideo = () => {
    const nextVideoEnabled = !isVideoEnabled;
    toggleVideo();
    webrtcService.toggleVideo(nextVideoEnabled);
  };

  const qualityColors = {
    excellent: COLORS.success,
    good: COLORS.accent,
    fair: '#F59E0B',
    poor: COLORS.error,
  };

  return (
    <View style={styles.container}>
      {remoteStreamUrl ? (
        <RTCView
          streamURL={remoteStreamUrl}
          style={styles.remoteVideo}
          objectFit="cover"
          zOrderMediaOverlay={false}
        />
      ) : (
        <View style={styles.remotePlaceholder}>
          <Text style={styles.placeholderAvatar}>
            {(partner.username || 'S')[0].toUpperCase()}
          </Text>
          <Text style={styles.placeholderName}>{partner.username || 'Stranger'}</Text>
          <Text style={styles.placeholderCountry}>{partner.country || 'Unknown'}</Text>
          <Text style={styles.connectingText}>Connecting video...</Text>
        </View>
      )}

      {localStreamUrl && isVideoEnabled && hasLocalVideo && (
        <View style={styles.localVideoContainer}>
          <RTCView streamURL={localStreamUrl} style={styles.localVideo} objectFit="cover" mirror />
        </View>
      )}

      <View style={styles.topBar}>
        <View style={styles.timerContainer}>
          <View style={[styles.qualityDot, { backgroundColor: qualityColors[networkQuality] }]} />
          <Text style={styles.timer}>{formatDuration(callDuration)}</Text>
        </View>
        <Text style={styles.partnerName}>{partner.username || 'Stranger'}</Text>
      </View>

      {showChat && (
        <KeyboardAvoidingView
          style={styles.chatOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <BlurView intensity={60} tint="dark" style={styles.chatPanel}>
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }: { item: ChatMessage }) => (
                <View
                  style={[
                    styles.messageBubble,
                    item.senderId === user?.id && styles.ownMessage,
                  ]}
                >
                  <Text style={styles.messageText}>{item.content}</Text>
                </View>
              )}
              style={styles.messageList}
            />
            {isTyping && <Text style={styles.typingIndicator}>Stranger is typing...</Text>}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                value={messageText}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.muted}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                <Text>➤</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      )}

      <View style={styles.actionBar}>
        <ActionButton icon={isMuted ? '🔇' : '🎤'} label="Mute" onPress={handleToggleMute} active={isMuted} />
        <ActionButton icon={isVideoEnabled ? '📹' : '📷'} label="Video" onPress={handleToggleVideo} active={!isVideoEnabled} />
        <ActionButton icon="🔄" label="Flip" onPress={() => webrtcService.switchCamera()} />
        <ActionButton icon="💬" label="Chat" onPress={() => setShowChat(!showChat)} active={showChat} />
        <ActionButton icon="⏭️" label="Skip" onPress={handleSkip} />
        <ActionButton icon="🚩" label="Report" onPress={handleReport} danger />
        <ActionButton icon="📞" label="End" onPress={endCall} danger />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  remoteVideo: {
    flex: 1,
  },
  remotePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  placeholderAvatar: {
    fontSize: 64,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    textAlign: 'center',
    lineHeight: 120,
    color: COLORS.white,
    overflow: 'hidden',
  },
  placeholderName: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  placeholderCountry: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
  },
  connectingText: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  localVideo: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 130,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  timer: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  partnerName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    maxHeight: '40%',
  },
  chatPanel: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 12,
  },
  messageList: {
    maxHeight: 200,
  },
  messageBubble: {
    backgroundColor: 'rgba(124,58,237,0.3)',
    padding: 10,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  ownMessage: {
    backgroundColor: 'rgba(6,182,212,0.3)',
    alignSelf: 'flex-end',
  },
  messageText: {
    color: COLORS.white,
    fontSize: 14,
  },
  typingIndicator: {
    color: COLORS.muted,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.white,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
});

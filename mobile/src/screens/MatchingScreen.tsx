import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, BackHandler, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PulseRing } from '../components/ui/PulseRing';
import { GradientButton } from '../components/ui/GradientButton';
import { socketService } from '../services/socket';
import { useChatStore } from '../store/chatStore';
import { COLORS, GRADIENTS } from '../constants';
import { RootStackParamList } from '../types';
import { getErrorMessage } from '../utils/errors';

interface MatchingScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Matching'>;
}

export function MatchingScreen({ navigation }: MatchingScreenProps) {
  const { setSearching, setMatch, setQueueStats, queueStats, reset } = useChatStore();
  const rotation = useSharedValue(0);

  const handleCancel = useCallback(() => {
    socketService.nextUser();
    reset();
    navigation.goBack();
    return true;
  }, [navigation, reset]);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );

    const init = async () => {
      try {
        setSearching(true);
        await socketService.connect();

        socketService.on('match_found', ({ sessionId, partner }) => {
          setMatch(sessionId, partner);
          navigation.replace('VideoChat', { sessionId, partner });
        });

        socketService.on('searching', (stats) => {
          setQueueStats(stats);
        });

        socketService.joinQueue();
      } catch (error) {
        Alert.alert(
          'Connection Failed',
          getErrorMessage(error, 'Could not connect to chat server.'),
          [{ text: 'Go Back', onPress: () => navigation.goBack() }],
        );
      }
    };

    init();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleCancel);

    return () => {
      backHandler.remove();
      socketService.off('match_found');
      socketService.off('searching');
    };
  }, [rotation, setSearching, setMatch, setQueueStats, navigation, handleCancel]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(124,58,237,0.1)', 'transparent']}
        style={styles.bgGradient}
      />

      <Text style={styles.title}>Finding someone...</Text>
      <Text style={styles.subtitle}>Connecting you with a stranger worldwide</Text>

      <View style={styles.animationContainer}>
        <PulseRing size={240} color={COLORS.primary} />
        <Animated.View style={[styles.orbitContainer, rotateStyle]}>
          <View style={styles.orbitDot} />
        </Animated.View>
        <View style={styles.centerIcon}>
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.waitTime}>
          Est. wait: ~{queueStats?.estimatedWaitSeconds || 5}s
        </Text>
        <Text style={styles.queueInfo}>
          {queueStats?.queueSize || 0} in queue · {queueStats?.onlineCount || 0} online
        </Text>
      </View>

      <GradientButton
        title="Cancel"
        onPress={handleCancel}
        variant="outline"
        size="lg"
        style={styles.cancelButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  title: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 48,
  },
  animationContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  orbitContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
  },
  orbitDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    marginTop: -6,
  },
  centerIcon: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  searchIcon: {
    fontSize: 32,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  waitTime: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  queueInfo: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 8,
  },
  cancelButton: {
    width: 200,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard } from '../components/ui/GlassCard';
import { statsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { COLORS, GRADIENTS } from '../constants';
import { RootStackParamList } from '../types';

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuthStore();
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await statsApi.getStats();
      return data;
    },
    refetchInterval: 30000,
    retry: 1,
    throwOnError: false,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.username}>{user?.username || 'Stranger'}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <LinearGradient colors={[...GRADIENTS.primary]} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.username || 'S')[0].toUpperCase()}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <GlassCard style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats?.onlineCount?.toLocaleString() || '—'}</Text>
            <Text style={styles.statLabel}>Online Now</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {stats?.trendingCountries?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Active Countries</Text>
          </View>
        </View>
      </GlassCard>

      <View style={styles.startSection}>
        <Animated.View style={pulseStyle}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Matching')}
          >
            <LinearGradient
              colors={[...GRADIENTS.primary]}
              style={styles.startButton}
            >
              <Text style={styles.startIcon}>🎥</Text>
              <Text style={styles.startTitle}>Start Chat</Text>
              <Text style={styles.startSubtitle}>Tap to find a stranger</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {stats?.trendingCountries && stats.trendingCountries.length > 0 && (
        <View style={styles.trendingSection}>
          <Text style={styles.sectionTitle}>Trending Countries</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {stats.trendingCountries.map((item) => (
              <GlassCard key={item.country} style={styles.countryCard}>
                <Text style={styles.countryName}>{item.country}</Text>
                <Text style={styles.countryCount}>{item.count} online</Text>
              </GlassCard>
            ))}
          </ScrollView>
        </View>
      )}

      {user?.isPremium && (
        <GlassCard style={styles.premiumBadge}>
          <Text style={styles.premiumText}>✨ Premium Member</Text>
        </GlassCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    color: COLORS.muted,
    fontSize: 16,
  },
  username: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
  },
  avatarButton: {},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  statsCard: {
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  startSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  startButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  startIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  startTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
  },
  startSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  trendingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  countryCard: {
    marginRight: 12,
    minWidth: 120,
  },
  countryName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  countryCount: {
    color: COLORS.accent,
    fontSize: 12,
    marginTop: 4,
  },
  premiumBadge: {
    alignItems: 'center',
  },
  premiumText: {
    color: COLORS.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
});

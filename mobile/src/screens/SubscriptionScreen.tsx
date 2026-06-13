import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { COLORS, GRADIENTS } from '../constants';
import { RootStackParamList } from '../types';

const FEATURES = [
  '🎯 Gender Filter',
  '🌍 Country Filter',
  '♾️ Unlimited Matches',
  '⚡ Priority Matching',
  '🚫 Ad-Free Experience',
  '👑 Premium Badge',
];

interface SubscriptionScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Subscription'>;
}

export function SubscriptionScreen({ navigation }: SubscriptionScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={[...GRADIENTS.primary]} style={styles.header}>
        <Text style={styles.headerIcon}>✨</Text>
        <Text style={styles.headerTitle}>Go Premium</Text>
        <Text style={styles.headerSubtitle}>Unlock the full experience</Text>
      </LinearGradient>

      <GlassCard style={styles.featuresCard}>
        {FEATURES.map((feature) => (
          <Text key={feature} style={styles.feature}>{feature}</Text>
        ))}
      </GlassCard>

      <GlassCard style={styles.planCard}>
        <Text style={styles.planName}>Monthly</Text>
        <Text style={styles.planPrice}>$9.99<Text style={styles.planPeriod}>/mo</Text></Text>
        <GradientButton
          title="Subscribe Monthly"
          onPress={() => {}}
          size="lg"
          style={styles.planButton}
        />
      </GlassCard>

      <GlassCard style={{ ...styles.planCard, ...styles.popularPlan }}>
        <Text style={styles.popularBadge}>BEST VALUE</Text>
        <Text style={styles.planName}>Yearly</Text>
        <Text style={styles.planPrice}>$59.99<Text style={styles.planPeriod}>/yr</Text></Text>
        <Text style={styles.savings}>Save 50%</Text>
        <GradientButton
          title="Subscribe Yearly"
          onPress={() => {}}
          size="lg"
          style={styles.planButton}
        />
      </GlassCard>

      <GradientButton
        title="Maybe Later"
        onPress={() => navigation.goBack()}
        variant="ghost"
        size="sm"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    padding: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 8,
  },
  featuresCard: {
    margin: 24,
    marginBottom: 16,
  },
  feature: {
    color: COLORS.white,
    fontSize: 16,
    paddingVertical: 8,
  },
  planCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  popularPlan: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
  },
  popularBadge: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  planName: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  planPrice: {
    color: COLORS.accent,
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 8,
  },
  planPeriod: {
    fontSize: 16,
    color: COLORS.muted,
  },
  savings: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  planButton: {
    width: '100%',
  },
});

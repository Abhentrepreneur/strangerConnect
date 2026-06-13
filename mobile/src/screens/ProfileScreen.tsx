import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { useAuthStore } from '../store/authStore';
import { COLORS, GRADIENTS } from '../constants';
import { RootStackParamList } from '../types';

interface ProfileScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
}

export function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <LinearGradient colors={[...GRADIENTS.primary]} style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.username || 'S')[0].toUpperCase()}
          </Text>
        </LinearGradient>
        <Text style={styles.username}>{user?.username || 'Stranger'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>✨ Premium</Text>
          </View>
        )}
      </View>

      <GlassCard style={styles.card}>
        <ProfileRow label="Gender" value={user?.gender || 'Not set'} />
        <ProfileRow label="Age" value={user?.age?.toString() || 'Not set'} />
        <ProfileRow label="Country" value={user?.country || 'Not set'} />
        <ProfileRow
          label="Interests"
          value={user?.interests?.join(', ') || 'None'}
        />
        {!user?.isPremium && (
          <ProfileRow
            label="Daily Matches"
            value={`${user?.dailyMatchCount || 0} / 10`}
          />
        )}
      </GlassCard>

      <GradientButton
        title="Edit Profile"
        onPress={() => navigation.navigate('EditProfile')}
        variant="outline"
        size="lg"
        style={styles.button}
      />

      {!user?.isPremium && (
        <GradientButton
          title="Upgrade to Premium"
          onPress={() => navigation.navigate('Subscription')}
          size="lg"
          style={styles.button}
        />
      )}

      <GradientButton
        title="Sign Out"
        onPress={handleLogout}
        variant="ghost"
        size="md"
        style={styles.logoutButton}
      />

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
        <Text style={styles.backText}>← Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: '800',
  },
  username: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
  },
  email: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
  },
  premiumBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(236,72,153,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  premiumText: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  card: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    color: COLORS.muted,
    fontSize: 14,
  },
  rowValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  button: {
    marginBottom: 12,
  },
  logoutButton: {
    marginTop: 8,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  backText: {
    color: COLORS.muted,
    fontSize: 15,
  },
});

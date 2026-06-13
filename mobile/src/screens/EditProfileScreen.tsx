import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '../components/ui/Input';
import { GradientButton } from '../components/ui/GradientButton';
import { userApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { COLORS, INTERESTS, COUNTRIES } from '../constants';
import { RootStackParamList } from '../types';

const profileSchema = z.object({
  username: z.string().min(3).max(30),
  age: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface EditProfileScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;
}

export function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);

  const { control, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      age: user?.age?.toString() || '',
      country: user?.country || '',
      gender: user?.gender,
    },
  });

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const onSubmit = async (data: ProfileForm) => {
    setLoading(true);
    try {
      const { data: updated } = await userApi.updateProfile({
        username: data.username,
        country: data.country,
        gender: data.gender,
        age: data.age ? parseInt(data.age, 10) : undefined,
        interests: selectedInterests,
      });
      setUser(updated);
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit Profile</Text>

      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Username"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.username?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="age"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Age"
            keyboardType="number-pad"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value || ''}
            error={errors.age?.message}
          />
        )}
      />

      <Text style={styles.sectionLabel}>Country</Text>
      <View style={styles.chipContainer}>
        {COUNTRIES.slice(0, 6).map((country) => (
          <Controller
            key={country}
            control={control}
            name="country"
            render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={[styles.chip, value === country && styles.chipActive]}
                onPress={() => onChange(country)}
              >
                <Text style={[styles.chipText, value === country && styles.chipTextActive]}>
                  {country}
                </Text>
              </TouchableOpacity>
            )}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Interests</Text>
      <View style={styles.chipContainer}>
        {INTERESTS.map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[styles.chip, selectedInterests.includes(interest) && styles.chipActive]}
            onPress={() => toggleInterest(interest)}
          >
            <Text
              style={[
                styles.chipText,
                selectedInterests.includes(interest) && styles.chipTextActive,
              ]}
            >
              {interest}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <GradientButton
        title="Save Changes"
        onPress={handleSubmit(onSubmit)}
        loading={loading}
        size="lg"
        style={styles.button}
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
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 24,
  },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: 'rgba(124,58,237,0.3)',
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    marginBottom: 40,
  },
});

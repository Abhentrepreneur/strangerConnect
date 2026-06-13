import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '../../components/ui/Input';
import { GradientButton } from '../../components/ui/GradientButton';
import { authApi } from '../../services/api';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../types';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type SignupForm = z.infer<typeof signupSchema>;

interface SignupScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
}

export function SignupScreen({ navigation }: SignupScreenProps) {
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      await authApi.sendOtp(data.email);
      navigation.navigate('OtpVerification', { email: data.email });
    } catch {
      Alert.alert('Error', 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join millions connecting worldwide</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.email?.message}
          />
        )}
      />

      <GradientButton
        title="Send Verification Code"
        onPress={handleSubmit(onSubmit)}
        loading={loading}
        size="lg"
        style={styles.button}
      />

      <GradientButton
        title="Already have an account? Sign In"
        onPress={() => navigation.navigate('Login')}
        variant="ghost"
        size="sm"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 15,
    marginBottom: 32,
  },
  button: {
    marginBottom: 16,
  },
});

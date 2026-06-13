import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '../../components/ui/Input';
import { GradientButton } from '../../components/ui/GradientButton';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../utils/errors';
import { getResolvedServerInfo } from '../../utils/config';
import { COLORS, GRADIENTS } from '../../constants';
import { AuthStackParamList } from '../../types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await authApi.sendOtp(data.email);
      navigation.navigate('OtpVerification', { email: data.email });
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.guestLogin();
      await login(data.accessToken, data.refreshToken, data.user);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Guest login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <LinearGradient colors={[...GRADIENTS.primary]} style={styles.logo}>
          <Text style={styles.logoText}>💬</Text>
        </LinearGradient>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to start connecting</Text>
      </View>

      <View style={styles.form}>
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
          title="Continue with Email"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          size="lg"
          style={styles.button}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <GradientButton
          title="Continue as Guest"
          onPress={handleGuestLogin}
          variant="outline"
          loading={loading}
          size="lg"
          style={styles.button}
        />

        <GradientButton
          title="Create Account"
          onPress={() => navigation.navigate('Signup')}
          variant="ghost"
          size="sm"
        />

        {__DEV__ && (
          <Text style={styles.serverHint}>
            Server: {getResolvedServerInfo().apiUrl}
          </Text>
        )}
      </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 36,
  },
  title: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 15,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  button: {
    marginBottom: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.muted,
    marginHorizontal: 16,
    fontSize: 14,
  },
  serverHint: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

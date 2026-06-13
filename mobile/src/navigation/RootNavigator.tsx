import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthNavigator } from './AuthNavigator';
import { HomeScreen } from '../screens/HomeScreen';
import { MatchingScreen } from '../screens/MatchingScreen';
import { VideoChatScreen } from '../screens/VideoChatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { COLORS } from '../constants';
import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    primary: COLORS.primary,
    text: COLORS.white,
    border: COLORS.border,
  },
};

export function RootNavigator() {
  const { isAuthenticated, isLoading, hasOnboarded, setHasOnboarded, hydrate } = useAuthStore();
  const [showSplash, setShowSplash] = React.useState(true);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    hydrate().finally(() => setHydrated(true));
  }, [hydrate]);

  const handleSplashFinish = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash || !hydrated || isLoading) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  const navKey = `${hasOnboarded}-${isAuthenticated}`;

  return (
    <NavigationContainer key={navKey} theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!hasOnboarded ? (
          <Stack.Screen name="Onboarding">
            {() => (
              <OnboardingScreen onComplete={() => setHasOnboarded(true)} />
            )}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={HomeScreen} />
            <Stack.Screen
              name="Matching"
              component={MatchingScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen
              name="VideoChat"
              component={VideoChatScreen}
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

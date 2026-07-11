import React, { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { PlayerProvider } from '@/player/PlayerProvider';
import { LibraryProvider } from '@/library/LibraryProvider';
import { MiniPlayer } from '@/components/MiniPlayer';
import { FullPlayerModal } from '@/components/FullPlayerModal';
import { Tabs } from '@/navigation/Tabs';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { isOnboardingCompleted } from '@/onboarding/checkOnboarding';
import { isWelcomeCompleted } from '@/onboarding/welcomeState';
import { colors } from '@/theme/tokens';
import { AnimatedBootSplash } from '@/components/AnimatedBootSplash';
import { UpdateProvider } from '@/updates/UpdateProvider';
import { MobileSettingsProvider } from '@/settings/MobileSettingsProvider';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { NativeNotificationsProvider } from '@/notifications/NativeNotificationsProvider';
import { navigationRef } from '@/navigation/navigationRef';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

export type RootStackParamList = {
  Tabs: { screen?: string; params?: Record<string, unknown> } | undefined;
  Login: { message?: string; returnTo?: { screen: string; params?: Record<string, unknown> } } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Onboarding: { edit?: boolean; returnTo?: { screen: string; params?: Record<string, unknown> } } | undefined;
  Welcome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.accent,
    text: colors.text,
    border: colors.border,
  },
};

function getActiveRouteName(state: any): string {
  const route = state?.routes?.[state.index ?? 0];
  if (!route) return 'Home';
  if (route.state) return getActiveRouteName(route.state);
  return route.name || 'Home';
}

/**
 * Decide l'ecran initial une fois la session restauree (AuthProvider.loading
 * passe a false) : si un utilisateur deja connecte n'a pas termine l'onboarding
 * V1, Tabs n'est jamais monte en premier (donc jamais de flash "Pour toi") -
 * Onboarding devient l'ecran initial du stack racine. Ne s'execute qu'une seule
 * fois par montage de l'app (checkedRef) pour eviter toute boucle.
 */
function RootStackNavigator() {
  const auth = useAuth();
  const { settings } = useMobileSettings();
  const [gate, setGate] = useState<{ ready: boolean; initialRoute: 'Tabs' | 'Onboarding' | 'Welcome' }>({
    ready: false,
    initialRoute: 'Tabs',
  });
  const checkedRef = useRef(false);

  useEffect(() => {
    if (auth.loading || checkedRef.current) return;
    checkedRef.current = true;

    if (!auth.user || !auth.token) {
      void isWelcomeCompleted().then((completed) => {
        setGate({ ready: true, initialRoute: completed ? 'Tabs' : 'Welcome' });
      });
      return;
    }

    let mounted = true;
    isOnboardingCompleted().then((completed) => {
      if (!mounted) return;
      setGate({ ready: true, initialRoute: completed ? 'Tabs' : 'Onboarding' });
    });
    return () => {
      mounted = false;
    };
  }, [auth.loading, auth.user, auth.token]);

  if (!gate.ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: settings.reducedMotion ? 'none' : 'fade_from_bottom',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
      initialRouteName={gate.initialRoute}
    >
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: settings.reducedMotion ? 'none' : 'slide_from_right' }} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: settings.reducedMotion ? 'none' : 'fade' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [playerOpen, setPlayerOpen] = React.useState(false);
  const [activeRoute, setActiveRoute] = React.useState('Home');

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('synaura:open-full-player', () => {
      setPlayerOpen(true);
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <UpdateProvider>
        <MobileSettingsProvider>
          <AuthProvider>
            <LibraryProvider>
              <PlayerProvider>
              <NativeNotificationsProvider>
              <AppErrorBoundary>
              <NavigationContainer
                ref={navigationRef}
                theme={navTheme}
                onStateChange={(state) => {
                  setActiveRoute(getActiveRouteName(state));
                }}
              >
                <StatusBar style={activeRoute === 'Swipe' ? 'light' : 'dark'} />
                <RootStackNavigator />
                <MiniPlayer activeRoute={activeRoute} onOpen={() => setPlayerOpen(true)} />
                <FullPlayerModal visible={playerOpen} onClose={() => setPlayerOpen(false)} />
              </NavigationContainer>
              </AppErrorBoundary>
              <AnimatedBootSplash />
              </NativeNotificationsProvider>
              </PlayerProvider>
            </LibraryProvider>
          </AuthProvider>
        </MobileSettingsProvider>
      </UpdateProvider>
    </SafeAreaProvider>
  );
}

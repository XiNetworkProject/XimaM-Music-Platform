import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { NativeNotificationNudge } from '@/notifications/NativeNotificationNudge';
import { navigationRef } from '@/navigation/navigationRef';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { ClipUploadProvider } from '@/clips/ClipUploadProvider';

export type RootStackParamList = {
  Tabs: { screen?: string; params?: Record<string, unknown> } | undefined;
  Login: { message?: string; returnTo?: { screen: string; params?: Record<string, unknown> } } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Onboarding: { edit?: boolean; returnTo?: { screen: string; params?: Record<string, unknown> } } | undefined;
  Welcome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const ROOT_GATE_TIMEOUT_MS = 2400;
const ROOT_BOOT_WATCHDOG_MS = 1700;

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
  if (route.name === 'AIStudio' && route.params?.playerMode === 'library') return 'AIStudioLibrary';
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
    const watchdog = setTimeout(() => {
      setGate((current) => current.ready ? current : { ready: true, initialRoute: 'Tabs' });
    }, ROOT_BOOT_WATCHDOG_MS);
    return () => clearTimeout(watchdog);
  }, []);

  useEffect(() => {
    if (auth.loading || checkedRef.current) return;
    checkedRef.current = true;
    let mounted = true;
    let settled = false;
    const finish = (initialRoute: 'Tabs' | 'Onboarding' | 'Welcome') => {
      if (!mounted || settled) return;
      settled = true;
      clearTimeout(timeout);
      setGate({ ready: true, initialRoute });
    };

    // Aucune lecture reseau ou locale ne doit pouvoir retenir la navigation sur
    // un ecran vide. En cas de stockage/reseau lent, l'app reste accessible.
    const timeout = setTimeout(() => finish('Tabs'), ROOT_GATE_TIMEOUT_MS);

    if (!auth.user || !auth.token) {
      void isWelcomeCompleted()
        .then((completed) => finish(completed ? 'Tabs' : 'Welcome'))
        .catch(() => finish('Tabs'));
    } else {
      void isOnboardingCompleted()
        .then((completed) => finish(completed ? 'Tabs' : 'Onboarding'))
        .catch(() => finish('Tabs'));
    }

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [auth.loading, auth.user, auth.token]);

  if (!gate.ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.violet} />
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '800' }}>Ouverture de Synaura...</Text>
      </View>
    );
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
  const [activeRoute, setActiveRoute] = React.useState('Swipe');

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('synaura:open-full-player', () => {
      setPlayerOpen(true);
    });
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <UpdateProvider>
        <MobileSettingsProvider>
          <AuthProvider>
            <ClipUploadProvider>
            <LibraryProvider>
              <PlayerProvider>
              <NativeNotificationsProvider>
              <AppErrorBoundary>
              <NavigationContainer
                ref={navigationRef}
                theme={navTheme}
                onReady={() => {
                  const state = navigationRef.getRootState();
                  if (state?.routes?.length) setActiveRoute(getActiveRouteName(state));
                }}
                onStateChange={(state) => {
                  setActiveRoute(getActiveRouteName(state));
                }}
              >
                <StatusBar style="light" />
                <RootStackNavigator />
                <MiniPlayer activeRoute={activeRoute} onOpen={() => setPlayerOpen(true)} />
                <FullPlayerModal visible={playerOpen} onClose={() => setPlayerOpen(false)} />
                <NativeNotificationNudge activeRoute={activeRoute} />
              </NavigationContainer>
              </AppErrorBoundary>
              <AnimatedBootSplash />
              </NativeNotificationsProvider>
              </PlayerProvider>
            </LibraryProvider>
            </ClipUploadProvider>
          </AuthProvider>
        </MobileSettingsProvider>
      </UpdateProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

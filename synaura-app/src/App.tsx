import React, { useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Platform, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { Inter_900Black } from '@expo-google-fonts/inter/900Black';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { entryIdentity, entryRoute, takeAuthDestination, type AuthDestination, type EntryRoute } from '@/auth/entryGate';
import { PlayerProvider } from '@/player/PlayerProvider';
import { LibraryProvider } from '@/library/LibraryProvider';
import { NativePlayerChrome } from '@/components/NativePlayerChrome';
import { Tabs, type RootTabsParamList } from '@/navigation/Tabs';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { PhoneAuthScreen } from '@/screens/PhoneAuthScreen';
import { CompleteAccountScreen } from '@/screens/CompleteAccountScreen';
import { MfaChallengeScreen } from '@/screens/MfaChallengeScreen';
import { BiometricLockScreen } from '@/screens/BiometricLockScreen';
import { HomeV2Screen } from '@/screens/HomeV2Screen';
import { RadarScreen } from '@/screens/RadarScreen';
import { DiscoverMoodScreen } from '@/screens/DiscoverMoodScreen';
import { UploadScreen } from '@/screens/UploadScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { PublicProfileScreen } from '@/screens/PublicProfileScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { PostDetailScreen } from '@/screens/PostDetailScreen';
import { PlaylistDetailScreen } from '@/screens/PlaylistDetailScreen';
import { CommunityScreen } from '@/screens/CommunityScreen';
import { ClubDetailScreen } from '@/screens/ClubDetailScreen';
import { CreateHubScreen } from '@/screens/CreateHubScreen';
import { CreateVariationScreen } from '@/screens/CreateVariationScreen';
import { ClipComposerScreen } from '@/screens/ClipComposerScreen';
import { AIStudioScreen } from '@/screens/AIStudioScreen';
import { CreatePostScreen } from '@/screens/CreatePostScreen';
import { SubscriptionsScreen } from '@/screens/SubscriptionsScreen';
import { BoostersScreen } from '@/screens/BoostersScreen';
import { CityScreen } from '@/screens/CityScreen';
import { TrackDetailScreen } from '@/screens/TrackDetailScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { ChallengeDetailScreen } from '@/screens/ChallengeDetailScreen';
import { StatsScreen } from '@/screens/StatsScreen';
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
import { SynauraQueryProvider } from '@/query/SynauraQueryProvider';
import { ConversationBubbleProvider } from '@/messaging/ConversationBubbleProvider';
import { MessageOutboxProvider } from '@/messaging/MessageOutboxProvider';
import { NativeCallProvider } from '@/calls/NativeCallProvider';
import { NativeCompanion } from '@/companion/NativeCompanion';

export type RootStackParamList = RootTabsParamList & {
  Tabs: { screen?: string; params?: Record<string, unknown> } | undefined;
  Login: { message?: string; returnTo?: { screen: string; params?: Record<string, unknown> } } | undefined;
  Register: undefined;
  PhoneAuth: undefined;
  ForgotPassword: undefined;
  Onboarding: { edit?: boolean; returnTo?: { screen: string; params?: Record<string, unknown> } } | undefined;
  Welcome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
void SplashScreen.preventAutoHideAsync().catch(() => {});
const ROOT_GATE_TIMEOUT_MS = 2400;
const linking = {
  prefixes: ['synaura://'],
  config: {
    screens: {
      Messages: 'messages',
      Conversation: 'messages/:conversationId',
      TrackDetail: 'track/:trackId',
      PostDetail: 'posts/:postId',
      PublicProfile: 'profile/:username',
      PlaylistDetail: 'playlists/:playlistId',
      Community: 'community',
      ClubDetail: 'community/:slug',
      ChallengeDetail: 'challenges/:challengeId',
      City: 'city',
      Radar: 'radar',
      DiscoverMood: 'discover/mood/:moodId',
      Subscriptions: 'subscriptions',
      Boosters: 'boosters',
    },
  },
};
const getMessagesScreen = () => require('@/screens/MessagesScreen').MessagesScreen;
const getConversationScreen = () => require('@/screens/ConversationScreen').ConversationScreen;

function getActiveRouteName(state: any): string {
  const route = state?.routes?.[state.index ?? 0];
  if (!route) return 'Home';
  if (route.state) return getActiveRouteName(route.state);
  if (route.name === 'AIStudio' && route.params?.playerMode === 'library') return 'AIStudioLibrary';
  return route.name || 'Home';
}

// Resolve entry only after security gates, once per identity (not per token).
function RootStackNavigator() {
  const auth = useAuth();
  const { settings } = useMobileSettings();
  const [gate, setGate] = useState<{ identity: string | null; initialRoute: EntryRoute; returnTo?: AuthDestination }>({
    identity: null,
    initialRoute: 'Tabs',
  });
  const authenticated = Boolean(auth.user?.id && auth.token);
  const identity = entryIdentity(auth);

  useEffect(() => {
    if (!identity || gate.identity === identity) return undefined;
    let mounted = true;
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (initialRoute: EntryRoute) => {
      if (!mounted || settled) return;
      settled = true;
      clearTimeout(timeout);
      setGate({ identity, initialRoute, returnTo: identity === 'guest' ? undefined : takeAuthDestination() });
    };

    // Aucune lecture reseau ou locale ne doit pouvoir retenir la navigation sur
    // un ecran vide. En cas de stockage/reseau lent, l'app reste accessible.
    timeout = setTimeout(() => finish('Tabs'), ROOT_GATE_TIMEOUT_MS);

    if (identity === 'guest') {
      void isWelcomeCompleted()
        .then((completed) => finish(entryRoute(identity, completed)))
        .catch(() => finish('Tabs'));
    } else {
      void isOnboardingCompleted()
        .then((completed) => finish(entryRoute(identity, completed)))
        .catch(() => finish('Tabs'));
    }

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [identity, gate.identity]);

  if (!auth.loading && authenticated && auth.biometricLocked) {
    return <BiometricLockScreen />;
  }

  if (!auth.loading && authenticated && auth.mfaRequired) {
    return <MfaChallengeScreen />;
  }

  if (!auth.loading && authenticated && auth.user?.profileComplete === false) {
    return <CompleteAccountScreen />;
  }

  if (!identity || gate.identity !== identity) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.violet} />
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '800' }}>Ouverture de Synaura...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={identity}
      screenOptions={{
        headerShown: false,
        animation: settings.reducedMotion ? 'none' : 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
      initialRouteName={gate.initialRoute}
    >
      <Stack.Screen name="Tabs" component={Tabs} initialParams={gate.returnTo || { screen: 'Swipe' }} />
      <Stack.Screen name="Home" component={HomeV2Screen} />
      <Stack.Screen name="Radar" component={RadarScreen} />
      <Stack.Screen name="DiscoverMood" component={DiscoverMoodScreen} />
      <Stack.Screen name="Community" component={CommunityScreen} />
      <Stack.Screen name="ClubDetail" component={ClubDetailScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Messages" getComponent={getMessagesScreen} />
      <Stack.Screen name="Conversation" getComponent={getConversationScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="TrackDetail" component={TrackDetailScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Stack.Screen name="Boosters" component={BoostersScreen} />
      <Stack.Screen name="City" component={CityScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="CreateHub" component={CreateHubScreen} options={{ animation: settings.reducedMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="Upload" component={UploadScreen} options={{ animation: settings.reducedMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="CreateVariation" component={CreateVariationScreen} options={{ animation: settings.reducedMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="ClipComposer" component={ClipComposerScreen} options={{ animation: settings.reducedMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="AIStudio" component={AIStudioScreen} options={{ animation: settings.reducedMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ animation: settings.reducedMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} initialParams={{ returnTo: gate.returnTo }} options={{ animation: settings.reducedMotion ? 'none' : 'slide_from_right' }} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: settings.reducedMotion ? 'none' : 'fade' }} />
    </Stack.Navigator>
  );
}

function SynauraRuntime() {
  const [playerOpen, setPlayerOpen] = React.useState(false);
  const [activeRoute, setActiveRoute] = React.useState('Swipe');
  const { resolvedTheme } = useMobileSettings();
  const usesDarkSystemChrome = playerOpen || resolvedTheme === 'dark' || ['Swipe', 'Welcome', 'Onboarding', 'Login', 'Register', 'ForgotPassword', 'PhoneAuth'].includes(activeRoute);
  const navigationTheme = React.useMemo(() => ({
    ...DefaultTheme,
    dark: resolvedTheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.background,
      primary: colors.accent,
      text: colors.text,
      border: colors.border,
      notification: colors.coral,
    },
  }), [resolvedTheme]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('synaura:open-full-player', () => {
      setPlayerOpen(true);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void NavigationBar.setButtonStyleAsync(usesDarkSystemChrome ? 'light' : 'dark').catch(() => {});
  }, [usesDarkSystemChrome]);

  return (
    <AuthProvider>
      <ConversationBubbleProvider>
        <SynauraQueryProvider>
          <MessageOutboxProvider>
            <ClipUploadProvider>
              <LibraryProvider>
                <PlayerProvider>
                  <NativeCallProvider>
                  <NativeNotificationsProvider>
                  <NavigationContainer
                    ref={navigationRef}
                    theme={navigationTheme}
                    linking={linking}
                    onReady={() => {
                      const state = navigationRef.getRootState();
                      if (state?.routes?.length) setActiveRoute(getActiveRouteName(state));
                    }}
                    onStateChange={(state) => {
                      setActiveRoute(getActiveRouteName(state));
                    }}
                  >
                    <StatusBar
                      style={usesDarkSystemChrome ? 'light' : 'dark'}
                      backgroundColor={usesDarkSystemChrome ? '#0D0D0D' : '#F7F6F3'}
                    />
                    <RootStackNavigator />
                    <NativePlayerChrome activeRoute={activeRoute} open={playerOpen} onOpen={() => setPlayerOpen(true)} onClose={() => setPlayerOpen(false)} />
                    <NativeNotificationNudge activeRoute={activeRoute} />
                    <NativeCompanion activeRoute={activeRoute} blocked={playerOpen} />
                  </NavigationContainer>
                  <AnimatedBootSplash />
                  </NativeNotificationsProvider>
                  </NativeCallProvider>
                </PlayerProvider>
              </LibraryProvider>
            </ClipUploadProvider>
          </MessageOutboxProvider>
        </SynauraQueryProvider>
      </ConversationBubbleProvider>
    </AuthProvider>
  );
}

export default function App() {
  const [fontDeadlineReached, setFontDeadlineReached] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    const deadline = setTimeout(() => setFontDeadlineReached(true), 2500);
    return () => clearTimeout(deadline);
  }, []);
  useEffect(() => {
    if (fontsLoaded || fontError || fontDeadlineReached) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError, fontDeadlineReached]);

  if (!fontsLoaded && !fontError && !fontDeadlineReached) {
    return <View style={{ flex: 1, backgroundColor: '#060810' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MobileSettingsProvider>
          <AppErrorBoundary>
            <UpdateProvider>
              <SynauraRuntime />
            </UpdateProvider>
          </AppErrorBoundary>
        </MobileSettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Platform, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { PlayerProvider } from '@/player/PlayerProvider';
import { LibraryProvider } from '@/library/LibraryProvider';
import { MiniPlayer } from '@/components/MiniPlayer';
import { FullPlayerModal } from '@/components/FullPlayerModal';
import { Tabs, type RootTabsParamList } from '@/navigation/Tabs';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
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

export type RootStackParamList = RootTabsParamList & {
  Tabs: { screen?: string; params?: Record<string, unknown> } | undefined;
  Login: { message?: string; returnTo?: { screen: string; params?: Record<string, unknown> } } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Onboarding: { edit?: boolean; returnTo?: { screen: string; params?: Record<string, unknown> } } | undefined;
  Welcome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const ROOT_GATE_TIMEOUT_MS = 2400;
const ROOT_BOOT_WATCHDOG_MS = 5000;
const linking = {
  prefixes: ['synaura://'],
  config: {
    screens: {
      Messages: 'messages',
      Conversation: 'messages/:conversationId',
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

/**
 * Decide l'ecran initial une fois la session restauree (AuthProvider.loading
 * passe a false) : si un utilisateur deja connecte n'a pas termine l'onboarding
 * V1, Tabs n'est jamais monte en premier (donc jamais de flash "Pour toi") -
 * Onboarding devient l'ecran initial du stack racine. Ne s'execute qu'une seule
 * fois par montage de l'app. Si la session change pendant la lecture locale,
 * la decision redemarre au lieu de laisser le gate verrouille.
 */
function RootStackNavigator() {
  const auth = useAuth();
  const { settings } = useMobileSettings();
  const [gate, setGate] = useState<{ ready: boolean; initialRoute: 'Tabs' | 'Onboarding' | 'Welcome' }>({
    ready: false,
    initialRoute: 'Tabs',
  });
  const authenticated = Boolean(auth.user?.id && auth.token);

  useEffect(() => {
    if (gate.ready) return undefined;
    const watchdog = setTimeout(() => {
      setGate({ ready: true, initialRoute: 'Tabs' });
    }, ROOT_BOOT_WATCHDOG_MS);
    return () => clearTimeout(watchdog);
  }, [gate.ready]);

  useEffect(() => {
    if (auth.loading || gate.ready) return undefined;
    let mounted = true;
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (initialRoute: 'Tabs' | 'Onboarding' | 'Welcome') => {
      if (!mounted || settled) return;
      settled = true;
      clearTimeout(timeout);
      setGate({ ready: true, initialRoute });
    };

    // Aucune lecture reseau ou locale ne doit pouvoir retenir la navigation sur
    // un ecran vide. En cas de stockage/reseau lent, l'app reste accessible.
    timeout = setTimeout(() => finish('Tabs'), ROOT_GATE_TIMEOUT_MS);

    if (!authenticated) {
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
  }, [auth.loading, authenticated, gate.ready]);

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
        animation: settings.reducedMotion ? 'none' : 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
      initialRouteName={gate.initialRoute}
    >
      <Stack.Screen name="Tabs" component={Tabs} />
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
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: settings.reducedMotion ? 'none' : 'slide_from_right' }} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: settings.reducedMotion ? 'none' : 'fade' }} />
    </Stack.Navigator>
  );
}

function SynauraRuntime() {
  const [playerOpen, setPlayerOpen] = React.useState(false);
  const [activeRoute, setActiveRoute] = React.useState('Swipe');
  const { resolvedTheme } = useMobileSettings();
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
    void NavigationBar.setBackgroundColorAsync(resolvedTheme === 'dark' ? '#0D0D0D' : '#F7F6F3').catch(() => {});
    void NavigationBar.setButtonStyleAsync(resolvedTheme === 'dark' ? 'light' : 'dark').catch(() => {});
  }, [resolvedTheme]);

  return (
    <AuthProvider>
      <ConversationBubbleProvider>
        <SynauraQueryProvider>
          <MessageOutboxProvider>
            <ClipUploadProvider>
              <LibraryProvider>
                <PlayerProvider>
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
                      style={resolvedTheme === 'dark' ? 'light' : 'dark'}
                      backgroundColor={resolvedTheme === 'dark' ? '#0D0D0D' : '#F7F6F3'}
                    />
                    <RootStackNavigator />
                    <MiniPlayer activeRoute={activeRoute} onOpen={() => setPlayerOpen(true)} />
                    <FullPlayerModal visible={playerOpen} onClose={() => setPlayerOpen(false)} />
                    <NativeNotificationNudge activeRoute={activeRoute} />
                  </NavigationContainer>
                  <AnimatedBootSplash />
                  </NativeNotificationsProvider>
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

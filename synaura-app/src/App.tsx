import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth/AuthProvider';
import { PlayerProvider } from '@/player/PlayerProvider';
import { LibraryProvider } from '@/library/LibraryProvider';
import { MiniPlayer } from '@/components/MiniPlayer';
import { FullPlayerModal } from '@/components/FullPlayerModal';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { UniversalSearchModal } from '@/components/HomeOverlays';
import { Tabs } from '@/navigation/Tabs';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { PublicProfileScreen } from '@/screens/PublicProfileScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { PostDetailScreen } from '@/screens/PostDetailScreen';
import { PlaylistDetailScreen } from '@/screens/PlaylistDetailScreen';
import { colors } from '@/theme/tokens';

export type RootStackParamList = {
  Tabs: undefined;
  Settings: undefined;
  PublicProfile: { username: string };
  Notifications: undefined;
  PostDetail: { postId: string };
  PlaylistDetail: { playlistId: string };
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

export default function App() {
  const [playerOpen, setPlayerOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [activeRoute, setActiveRoute] = React.useState('Home');
  const showSearch = !playerOpen && !['Home', 'Swipe', 'Settings'].includes(activeRoute);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LibraryProvider>
          <PlayerProvider>
            <NavigationContainer
              theme={navTheme}
              onStateChange={(state) => {
                setActiveRoute(getActiveRouteName(state));
              }}
            >
              <StatusBar style={activeRoute === 'Swipe' ? 'light' : 'dark'} />
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Tabs" component={Tabs} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="PostDetail" component={PostDetailScreen} />
                <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
              </Stack.Navigator>
              <GlobalSearchBar visible={showSearch} onOpen={() => setSearchOpen(true)} />
              <UniversalSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
              <MiniPlayer activeRoute={activeRoute} onOpen={() => setPlayerOpen(true)} />
              <FullPlayerModal visible={playerOpen} onClose={() => setPlayerOpen(false)} />
            </NavigationContainer>
          </PlayerProvider>
        </LibraryProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

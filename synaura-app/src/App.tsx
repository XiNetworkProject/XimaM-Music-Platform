import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth/AuthProvider';
import { PlayerProvider } from '@/player/PlayerProvider';
import { LibraryProvider } from '@/library/LibraryProvider';
import { MiniPlayer } from '@/components/MiniPlayer';
import { FullPlayerModal } from '@/components/FullPlayerModal';
import { Tabs } from '@/navigation/Tabs';
import { colors } from '@/theme/tokens';

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

export default function App() {
  const [playerOpen, setPlayerOpen] = React.useState(false);
  const [activeRoute, setActiveRoute] = React.useState('Home');

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LibraryProvider>
          <PlayerProvider>
            <NavigationContainer
              theme={navTheme}
              onStateChange={(state) => {
                const route = state?.routes[state.index ?? 0];
                if (route?.name) setActiveRoute(route.name);
              }}
            >
              <StatusBar style={activeRoute === 'Swipe' ? 'light' : 'dark'} />
              <Tabs />
              <MiniPlayer activeRoute={activeRoute} onOpen={() => setPlayerOpen(true)} />
              <FullPlayerModal visible={playerOpen} onClose={() => setPlayerOpen(false)} />
            </NavigationContainer>
          </PlayerProvider>
        </LibraryProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

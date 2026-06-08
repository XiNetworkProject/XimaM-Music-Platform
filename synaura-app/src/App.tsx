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
import { Tabs } from '@/navigation/Tabs';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { colors } from '@/theme/tokens';
import { AnimatedBootSplash } from '@/components/AnimatedBootSplash';
import { UpdateProvider } from '@/updates/UpdateProvider';

export type RootStackParamList = {
  Tabs: { screen?: string; params?: Record<string, unknown> } | undefined;
  Login: { message?: string } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
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
  const [activeRoute, setActiveRoute] = React.useState('Home');

  return (
    <SafeAreaProvider>
      <UpdateProvider>
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
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Register" component={RegisterScreen} />
                  <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                </Stack.Navigator>
                <MiniPlayer activeRoute={activeRoute} onOpen={() => setPlayerOpen(true)} />
                <FullPlayerModal visible={playerOpen} onClose={() => setPlayerOpen(false)} />
              </NavigationContainer>
              <AnimatedBootSplash />
            </PlayerProvider>
          </LibraryProvider>
        </AuthProvider>
      </UpdateProvider>
    </SafeAreaProvider>
  );
}

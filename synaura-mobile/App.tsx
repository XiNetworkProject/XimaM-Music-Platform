import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import { BottomTabs } from './src/navigation/BottomTabs';
import { colors } from './src/theme/colors';
import Splash from './src/screens/Splash';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import TikTokPlayerScreen from './src/screens/TikTokPlayerScreen';
import ForYouScreen from './src/screens/ForYouScreen';
import TrendingScreen from './src/screens/TrendingScreen';
import SimplePlaceholderScreen from './src/screens/SimplePlaceholderScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { PlayerProvider } from './src/contexts/PlayerContext';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={BottomTabs} />
          <Stack.Screen
            name="Player"
            component={TikTokPlayerScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="ForYou" component={ForYouScreen} />
          <Stack.Screen name="Trending" component={TrendingScreen} />
          <Stack.Screen name="Library" component={SimplePlaceholderScreen} />
          <Stack.Screen name="Boosters" component={SimplePlaceholderScreen} />
          <Stack.Screen name="Community" component={SimplePlaceholderScreen} />
          <Stack.Screen name="Upload" component={SimplePlaceholderScreen} />
          <Stack.Screen name="Premium" component={SimplePlaceholderScreen} />
          <Stack.Screen name="Meteo" component={SimplePlaceholderScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function AppGate({ booting, onFinish }: { booting: boolean; onFinish: () => void }) {
  const { loading } = useAuth();

  if (booting || loading) {
    return <Splash onFinish={onFinish} />;
  }

  return <RootNavigator />;
}

export default function App() {
  const [booting, setBooting] = React.useState(true);

  React.useEffect(() => {
    const id = setTimeout(() => setBooting(false), 2200);
    return () => clearTimeout(id);
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PlayerProvider>
          <NavigationContainer theme={DefaultTheme}>
            <StatusBar style="light" />
            <AppGate booting={booting} onFinish={() => setBooting(false)} />
          </NavigationContainer>
        </PlayerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import { BottomTabs } from './src/navigation/BottomTabs';
import Splash from './src/screens/Splash';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import TikTokPlayerScreen from './src/screens/TikTokPlayerScreen';
import ForYouScreen from './src/screens/ForYouScreen';
import TrendingScreen from './src/screens/TrendingScreen';
import TrackScreen from './src/screens/TrackScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import PublicProfileScreen from './src/screens/PublicProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import RequestsScreen from './src/screens/RequestsScreen';
import UploadScreen from './src/screens/UploadScreen';
import BoostersScreen from './src/screens/BoostersScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import StatsScreen from './src/screens/StatsScreen';
import SimplePlaceholderScreen from './src/screens/SimplePlaceholderScreen';
import SwipeScreen from './src/screens/SwipeScreen';
import SearchScreen from './src/screens/SearchScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { PlayerProvider } from './src/contexts/PlayerContext';

const Stack = createNativeStackNavigator();

const linking: any = {
  prefixes: ['synaura://', 'https://synaura.fr', 'https://xima-m-music-platform.vercel.app'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: '',
          Discover: 'discover',
          Studio: 'ai-generator',
          Library: 'library',
          Profile: 'profile',
        },
      },
      Track: 'track/:id',
      Playlist: 'playlists/:id',
      PublicProfile: 'user/:username',
      Player: 'player',
      Settings: 'settings',
      Messages: 'messages',
      Conversation: 'messages/:id',
      Notifications: 'notifications',
      Trending: 'trending',
      ForYou: 'for-you',
      Upload: 'upload',
      Premium: 'subscriptions',
      Boosters: 'boosters',
      Community: 'community',
      Stats: 'stats',
      Search: 'search',
      Login: 'auth/login',
      SignUp: 'auth/register',
    },
  },
};

function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Main"
    >
      <Stack.Screen name="Main" component={BottomTabs} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen
        name="Player"
        component={TikTokPlayerScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="ForYou" component={ForYouScreen} />
      <Stack.Screen name="Trending" component={TrendingScreen} />
      <Stack.Screen name="Track" component={TrackScreen} />
      <Stack.Screen name="Playlist" component={PlaylistScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Requests" component={RequestsScreen} />
      <Stack.Screen name="Upload" component={UploadScreen} />
      <Stack.Screen name="Boosters" component={BoostersScreen} />
      <Stack.Screen name="Community" component={CommunityScreen} />
      <Stack.Screen name="Premium" component={SubscriptionsScreen} />
      <Stack.Screen name="Meteo" component={SimplePlaceholderScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="Swipe" component={SwipeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
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
          <NavigationContainer linking={linking} theme={DefaultTheme}>
            <StatusBar style="light" />
            <AppGate booting={booting} onFinish={() => setBooting(false)} />
          </NavigationContainer>
        </PlayerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

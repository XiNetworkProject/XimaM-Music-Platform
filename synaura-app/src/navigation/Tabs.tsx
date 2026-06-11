import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '@/screens/HomeScreen';
import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SwipeScreen } from '@/screens/SwipeScreen';
import { UploadScreen } from '@/screens/UploadScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { PublicProfileScreen } from '@/screens/PublicProfileScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { PostDetailScreen } from '@/screens/PostDetailScreen';
import { PlaylistDetailScreen } from '@/screens/PlaylistDetailScreen';
import { CommunityScreen } from '@/screens/CommunityScreen';
import { CreateHubScreen } from '@/screens/CreateHubScreen';
import { AIStudioScreen } from '@/screens/AIStudioScreen';
import { CreatePostScreen } from '@/screens/CreatePostScreen';
import { SubscriptionsScreen } from '@/screens/SubscriptionsScreen';
import { colors } from '@/theme/tokens';
import type { Track } from '@/api/types';

export type RootTabsParamList = {
  Home: undefined;
  Discover: undefined;
  Swipe: undefined;
  Community: { compose?: boolean; category?: string; track?: Track } | undefined;
  Profile: undefined;
  Upload: undefined;
  Library: undefined;
  CreateHub: undefined;
  AIStudio: undefined;
  CreatePost: { track?: Track } | undefined;
  Settings: undefined;
  Subscriptions: undefined;
  PublicProfile: { username: string };
  Notifications: undefined;
  PostDetail: { postId: string };
  PlaylistDetail: { playlistId: string };
};

const Tab = createBottomTabNavigator<RootTabsParamList>();
const HIDDEN_ROUTES = new Set<keyof RootTabsParamList>([
  'Upload',
  'Library',
  'CreateHub',
  'AIStudio',
  'CreatePost',
  'Settings',
  'Subscriptions',
  'PublicProfile',
  'Notifications',
  'PostDetail',
  'PlaylistDetail',
]);

function AnimatedTabButton({ children, accessibilityState, onPress, style, ...props }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const selected = Boolean(accessibilityState?.selected);

  useEffect(() => {
    if (!selected) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.12, speed: 35, bounciness: 8, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 25, bounciness: 6, useNativeDriver: true }),
    ]).start();
  }, [scale, selected]);

  const setPressed = (pressed: boolean) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: pressed ? 0.9 : 1, speed: 34, bounciness: pressed ? 0 : 6, useNativeDriver: true }),
      Animated.spring(lift, { toValue: pressed ? 2 : 0, speed: 32, bounciness: 4, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable {...props} accessibilityState={accessibilityState} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={style}>
      <Animated.View style={[styles.tabMotion, { transform: [{ translateY: lift }, { scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function PremiumSwipeIcon() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.07, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.premiumTab, { transform: [{ scale: pulse }] }]}>
      <View style={styles.premiumGradient}>
        <Image source={require('../assets/synaura-symbol-2026.png')} resizeMode="contain" style={styles.premiumLogo} />
      </View>
    </Animated.View>
  );
}

export function Tabs() {
  const insets = useSafeAreaInsets();
  const labels: Partial<Record<keyof RootTabsParamList, string>> = {
    Home: 'Accueil',
    Discover: 'Découvrir',
    Swipe: 'Swipe',
    Community: 'Communauté',
    Profile: 'Profil',
    Upload: 'Upload',
    Library: 'Bibliothèque',
    CreateHub: 'Créer',
    Settings: 'Paramètres',
  };

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarAccessibilityLabel: labels[route.name] || 'Synaura',
        tabBarLabel: route.name === 'Swipe' ? () => null : labels[route.name] || route.name,
        tabBarButtonTestID: `tab-${route.name.toLowerCase()}`,
        tabBarStyle: {
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: Math.max(10, insets.bottom + 2),
          height: 66,
          borderRadius: 26,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(23,19,19,0.14)',
          backgroundColor: 'rgba(255,250,242,0.99)',
          shadowColor: '#1E1914',
          shadowOpacity: 0.24,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 14 },
          elevation: 18,
          paddingTop: 7,
          paddingBottom: Math.max(6, insets.bottom ? 4 : 8),
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '900', marginTop: 0 },
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarItemStyle: HIDDEN_ROUTES.has(route.name) ? { display: 'none' } : route.name === 'Swipe' ? { borderRadius: 18, marginTop: -13 } : { borderRadius: 18 },
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
        tabBarIcon: ({ focused }) => {
          const icon =
            route.name === 'Home' ? 'musical-notes' :
            route.name === 'Discover' ? 'compass' :
            route.name === 'Swipe' ? 'swap-vertical' :
            route.name === 'Community' ? 'people' :
            route.name === 'Upload' ? 'add-circle' :
            route.name === 'Library' ? 'library' :
            route.name === 'Settings' ? 'settings' : 'person-circle';
          const premium = route.name === 'Swipe';
          if (premium) return <PremiumSwipeIcon />;
          return <Ionicons name={icon as any} size={22} color={focused ? colors.black : colors.textTertiary} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="CreateHub" component={CreateHubScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="AIStudio" component={AIStudioScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="CreatePost" component={CreatePostScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="PublicProfile" component={PublicProfileScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="PostDetail" component={PostDetailScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="PlaylistDetail" component={PlaylistDetailScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabMotion: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  premiumTab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    shadowColor: '#FF4B7A',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  premiumGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.96)',
  },
  premiumLogo: { width: 46, height: 46 },
});

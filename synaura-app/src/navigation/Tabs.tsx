import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/screens/HomeScreen';
import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SwipeScreen } from '@/screens/SwipeScreen';
import { UploadScreen } from '@/screens/UploadScreen';
import { colors } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type RootTabsParamList = {
  Home: undefined;
  Discover: undefined;
  Swipe: undefined;
  Upload: undefined;
  Library: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabsParamList>();

export function Tabs() {
  const insets = useSafeAreaInsets();
  const labels: Record<keyof RootTabsParamList, string> = {
    Home: 'Accueil',
    Discover: 'Découvrir',
    Swipe: 'Swipe',
    Upload: 'Upload',
    Library: 'Bibliothèque',
    Profile: 'Profil',
  };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarAccessibilityLabel: labels[route.name],
        tabBarButtonTestID: `tab-${route.name.toLowerCase()}`,
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: Math.max(8, insets.bottom),
          height: 56,
          borderRadius: 22,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: 'rgba(255,250,242,0.97)',
          shadowColor: '#1E1914',
          shadowOpacity: 0.16,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 12 },
          elevation: 10,
        },
        tabBarIcon: ({ focused }) => {
          const icon =
            route.name === 'Home'
              ? 'radio'
              : route.name === 'Discover'
              ? 'compass'
              : route.name === 'Swipe'
              ? 'swap-vertical'
              : route.name === 'Upload'
              ? 'add-circle'
              : route.name === 'Library'
              ? 'library'
              : 'person-circle';
          return <Ionicons name={icon as any} size={route.name === 'Upload' ? 30 : 24} color={focused ? colors.black : colors.textTertiary} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

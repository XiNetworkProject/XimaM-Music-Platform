import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import StudioScreen from '../screens/StudioScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { View } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { MiniPlayer } from '../components/MiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export function BottomTabs() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_BASE_HEIGHT = 62;
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: '#0A071A',
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingBottom: Math.max(6, insets.bottom),
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.accentBrand,
          tabBarInactiveTintColor: colors.textTertiary,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
            title: 'Accueil',
          }}
        />
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
            ),
            title: 'Explorer',
          }}
        />
        <Tab.Screen
          name="Studio"
          component={StudioScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={size} color={color} />
            ),
            title: 'Studio',
          }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'library' : 'library-outline'} size={size} color={color} />
            ),
            title: 'Biblio',
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
            ),
            title: 'Profil',
          }}
        />
      </Tab.Navigator>

      <MiniPlayer tabBarHeight={tabBarHeight} />
    </View>
  );
}

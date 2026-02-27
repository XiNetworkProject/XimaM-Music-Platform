import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import StudioScreen from '../screens/StudioScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { MiniPlayer } from '../components/MiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Placeholder({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.textTertiary, marginTop: 6 }}>Bientôt disponible</Text>
    </View>
  );
}

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
          name="Search"
          component={SearchScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
            ),
            title: 'Recherche',
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



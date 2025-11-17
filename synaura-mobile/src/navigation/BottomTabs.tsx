import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import { View } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

function Placeholder({ title }: { title: string }) {
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}

const Tab = createBottomTabNavigator();

export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A071A',
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accentBrand,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="Search"
        children={() => <Placeholder title="Search" />}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
          title: 'Search',
        }}
      />
      <Tab.Screen
        name="Library"
        children={() => <Placeholder title="Library" />}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
          title: 'Library',
        }}
      />
      <Tab.Screen
        name="Profile"
        children={() => <Placeholder title="Profile" />}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}



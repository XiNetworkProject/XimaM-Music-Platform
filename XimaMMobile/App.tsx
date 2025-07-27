/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Providers
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import LoadingScreen from './src/screens/LoadingScreen';

// Bottom Navigation Component (fidèle au web)
const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) => {
  const { user } = useAuth();
  
  // Simuler les notifications (à connecter avec le vrai système)
  const unreadCount = 0; // TODO: Connecter avec useMessageNotifications

  const navItems = [
    {
      icon: 'home',
      label: 'Accueil',
      name: 'Home',
      active: activeTab === 'Home'
    },
    {
      icon: 'explore',
      label: 'Découvrir',
      name: 'Discover',
      active: activeTab === 'Discover'
    },
    {
      icon: 'library-music',
      label: 'Bibliothèque',
      name: 'Library',
      active: activeTab === 'Library'
    },
    {
      icon: 'chat',
      label: 'Messages',
      name: 'Messages',
      active: activeTab === 'Messages',
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      icon: 'settings',
      label: 'Paramètres',
      name: 'Settings',
      active: activeTab === 'Settings'
    }
  ];

  const TabButton = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.tabButton, item.active && styles.activeTabButton]}
      onPress={() => setActiveTab(item.name)}
    >
      <View style={styles.tabIconContainer}>
        <Icon 
          name={item.icon} 
          size={20} 
          color={item.active ? '#8B5CF6' : 'rgba(255, 255, 255, 0.6)'} 
        />
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.badge > 9 ? '9+' : item.badge}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabText, item.active && styles.activeTabText]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.tabBar}>
      {/* Bouton lecteur (comme dans le web) */}
      <TouchableOpacity style={styles.playerButton}>
        <Icon name="music-note" size={22} color="#8B5CF6" />
        <Text style={styles.playerButtonText}>Lecteur</Text>
      </TouchableOpacity>

      {/* Onglets principaux */}
      {navItems.map((item) => (
        <TabButton key={item.name} item={item} />
      ))}

      {/* Bouton Profil */}
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'Profile' && styles.activeTabButton]}
        onPress={() => setActiveTab('Profile')}
      >
        <View style={styles.tabIconContainer}>
          {user?.avatar ? (
            <View style={styles.avatarContainer}>
              {/* TODO: Implémenter Image pour l'avatar */}
              <Icon name="person" size={20} color="#8B5CF6" />
            </View>
          ) : (
            <Icon 
              name="person" 
              size={20} 
              color={activeTab === 'Profile' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.6)'} 
            />
          )}
        </View>
        <Text style={[styles.tabText, activeTab === 'Profile' && styles.activeTabText]}>
          Profil
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Main Tabs Navigator
const MainTabs = () => {
  const [activeTab, setActiveTab] = useState('Home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen navigation={{ navigate: () => {} }} />;
      case 'Discover':
        return <DiscoverScreen />;
      case 'Library':
        return <LibraryScreen />;
      case 'Messages':
        return <MessagesScreen />;
      case 'Settings':
        return <SettingsScreen />;
      case 'Profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen navigation={{ navigate: () => {} }} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <MainTabs />;
  } else {
    return <AuthScreen />;
  }
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <AppNavigator />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  playerButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    marginRight: 8,
  },
  playerButtonText: {
    fontSize: 10,
    color: '#8B5CF6',
    marginTop: 2,
    fontWeight: '600',
  },
  tabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: 60,
  },
  activeTabButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  activeTabText: {
    color: '#8B5CF6',
  },
  avatarContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;

import React, { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Keyboard, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CreateMenuSheet } from '@/components/create/CreateMenuSheet';
import { DiscoverV2Screen } from '@/screens/DiscoverV2Screen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SwipeScreen } from '@/screens/SwipeScreen';
import { CreateHubScreen } from '@/screens/CreateHubScreen';
import { colors } from '@/theme/tokens';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import type { MusicChallenge, Track } from '@/api/types';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { EntryMotionScope } from '@/components/entry/EntryAtmosphere';

export type MessagingSharePayload = {
  type: 'track' | 'clip' | 'post' | 'playlist';
  entityId: string;
  metadata: { title: string; subtitle?: string; artistName?: string; coverUrl?: string; duration?: number; url?: string };
};

export type RootTabsParamList = {
  Home: undefined;
  Discover: undefined;
  Radar: undefined;
  DiscoverMood: { moodId: string };
  Swipe: { mode?: 'clips'; sourceTrackId?: string; clipId?: string } | undefined;
  Community: { compose?: boolean; category?: string; track?: Track } | undefined;
  ClubDetail: { slug: string; compose?: boolean; track?: Track } | undefined;
  Profile: { tab?: 'sons' | 'clips' | 'variations' | 'playlists' | 'posts'; openPendingVariations?: boolean } | undefined;
  Create: undefined;
  Upload: { challengeId?: string } | undefined;
  Library: undefined;
  CreateHub: { challengeId?: string } | undefined;
  CreateVariation: { challengeId?: string } | undefined;
  ClipComposer: { sourceTrackId?: string; sourceTrackType?: 'track' | 'ai_track'; challengeId?: string; editUploadTaskId?: string } | undefined;
  AIStudio: { sourceTrackId?: string; sourceTrackType?: 'track' | 'ai_track'; mode?: 'remix'; challengeId?: string; playerMode?: 'library' | 'hidden' } | undefined;
  CreatePost: { track?: Track } | undefined;
  Settings: { section?: 'notifications' } | undefined;
  Subscriptions: undefined;
  Boosters: undefined;
  City: undefined;
  Stats: { trackId?: string } | undefined;
  PublicProfile: { username: string };
  Notifications: undefined;
  Messages: { tab?: 'conversations' | 'requests' | 'contacts'; share?: MessagingSharePayload } | undefined;
  Conversation: { conversationId: string; roomId?: string };
  PostDetail: { postId: string };
  PlaylistDetail: { playlistId: string };
  TrackDetail: { trackId: string; track?: Track };
  Search: { query?: string } | undefined;
  ChallengeDetail: { challengeId: string; challenge?: MusicChallenge } | undefined;
};

type PrimaryTabParamList = Pick<RootTabsParamList, 'Swipe' | 'Discover' | 'Create' | 'Library' | 'Profile'>;
const Tab = createBottomTabNavigator<PrimaryTabParamList>();

import { EntryPressable } from '@/components/entry/EntryPressable';
import { mobile } from '@/components/mobile/SoundRoom';

const ROUTES = {
  Swipe: { label: 'Live', icon: 'radio-outline', selected: 'radio' },
  Discover: { label: 'Explorer', icon: 'compass-outline', selected: 'compass' },
  Create: { label: 'Créer', icon: 'add', selected: 'add' },
  Library: { label: 'Bibliothèque', icon: 'library-outline', selected: 'library' },
  Profile: { label: 'Profil', icon: 'person-outline', selected: 'person' },
} as const;

function SynauraTabBar({ state, navigation }: BottomTabBarProps) {
  const layout = useResponsiveLayout();
  const { resolvedTheme } = useMobileSettings();
  const dark = resolvedTheme === 'dark';
  const signal = dark || state.routes[state.index]?.name === 'Swipe';
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboard) return null;
  return <View pointerEvents="box-none" style={[styles.dockWrap, { backgroundColor: signal ? mobile.bg : '#F5F7FA', paddingBottom: Math.max(layout.insets.bottom, 7), paddingLeft: layout.insets.left, paddingRight: layout.insets.right }]}>
    <View style={[styles.dock, { height: layout.dockHeight, width: Math.min(layout.safeWidth, 620) }]}>
      {state.routes.map(route => {
        const item = ROUTES[route.name as keyof typeof ROUTES];
        if (!item) return null;
        const focused = state.routes[state.index]?.key === route.key;
        const create = route.name === 'Create';
        const color = focused ? signal ? mobile.blue : '#244C8E' : signal ? '#9AA6B9' : '#596579';
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) return;
          void Haptics.selectionAsync().catch(() => {});
          if (focused && route.name === 'Swipe') DeviceEventEmitter.emit('synaura:open-home-prelude');
          else if (!focused) navigation.navigate(route.name, route.params);
        };
        return <EntryPressable key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: focused }} testID={'tab-' + route.name.toLowerCase()} onPress={onPress} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} style={styles.item} scaleTo={.9}>
          {create ? <LinearGradient colors={signal ? ['#B8DFFF', '#9EB2F8'] : ['#C7DEFA', '#ADBEF1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.create}><Ionicons name="add" size={26} color="#0D192B" /></LinearGradient> : <View style={styles.icon}><Ionicons name={focused ? item.selected : item.icon} size={23} color={color} /></View>}
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.label, { color }]}>{item.label}</Text>
          {focused && !create ? <View style={[styles.selected, { backgroundColor: color }]} /> : null}
        </EntryPressable>;
      })}
    </View>
  </View>;
}

export function Tabs() {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const tabNavigationRef = useRef<any>(null);
  const { settings } = useMobileSettings();

  const navigateRoot = (name: keyof RootTabsParamList, params?: Record<string, unknown>) => {
    const tabNavigation = tabNavigationRef.current;
    const rootNavigation = tabNavigation?.getParent?.();
    (rootNavigation || tabNavigation)?.navigate(name, params);
  };

  return (
    <>
      <Tab.Navigator
        initialRouteName="Swipe"
        backBehavior="history"
        tabBar={(props) => <EntryMotionScope><SynauraTabBar {...props} /></EntryMotionScope>}
        screenOptions={() => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
          animation: settings.reducedMotion ? 'none' : 'shift',
          lazy: true,
          sceneStyle: { backgroundColor: colors.background },
        })}
      >
        <Tab.Screen name="Swipe" component={SwipeScreen} />
        <Tab.Screen name="Discover" component={DiscoverV2Screen} />
        <Tab.Screen
          name="Create"
          component={CreateHubScreen}
          listeners={({ navigation }) => ({
            tabPress: (event) => {
              event.preventDefault();
              tabNavigationRef.current = navigation;
              void Haptics.selectionAsync().catch(() => {});
              setCreateMenuOpen(true);
            },
          })}
        />
        <Tab.Screen name="Library" component={LibraryScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      <CreateMenuSheet
        visible={createMenuOpen}
        onClose={() => setCreateMenuOpen(false)}
        onCreatePost={() => {
          setCreateMenuOpen(false);
          navigateRoot('CreatePost');
        }}
        onCreateWithAI={() => {
          setCreateMenuOpen(false);
          navigateRoot('AIStudio');
        }}
        onPublishTrack={() => {
          setCreateMenuOpen(false);
          navigateRoot('Upload');
        }}
        onPublishClip={() => {
          setCreateMenuOpen(false);
          navigateRoot('ClipComposer');
        }}
        onCreateVariation={() => {
          setCreateMenuOpen(false);
          navigateRoot('CreateVariation');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dockWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 80 },
  dock: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3 },
  item: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { height: 30, justifyContent: 'center', alignItems: 'center' }, create: { width: 43, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '500' }, selected: { position: 'absolute', bottom: 0, width: 12, height: 2, borderRadius: 1 },
});

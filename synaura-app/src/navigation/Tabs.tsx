import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { CreateMenuSheet } from '@/components/create/CreateMenuSheet';
import { HomeV2Screen } from '@/screens/HomeV2Screen';
import { DiscoverV2Screen } from '@/screens/DiscoverV2Screen';
import { RadarScreen } from '@/screens/RadarScreen';
import { DiscoverMoodScreen } from '@/screens/DiscoverMoodScreen';
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
import { ClubDetailScreen } from '@/screens/ClubDetailScreen';
import { CreateHubScreen } from '@/screens/CreateHubScreen';
import { CreateVariationScreen } from '@/screens/CreateVariationScreen';
import { ClipComposerScreen } from '@/screens/ClipComposerScreen';
import { AIStudioScreen } from '@/screens/AIStudioScreen';
import { CreatePostScreen } from '@/screens/CreatePostScreen';
import { SubscriptionsScreen } from '@/screens/SubscriptionsScreen';
import { CityScreen } from '@/screens/CityScreen';
import { TrackDetailScreen } from '@/screens/TrackDetailScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { ChallengeDetailScreen } from '@/screens/ChallengeDetailScreen';
import { colors } from '@/theme/tokens';
import type { MusicChallenge, Track } from '@/api/types';

export type RootTabsParamList = {
  Home: undefined;
  Discover: undefined;
  Radar: undefined;
  DiscoverMood: { moodId: string };
  Swipe: { mode?: 'clips'; sourceTrackId?: string } | undefined;
  Community: { compose?: boolean; category?: string; track?: Track } | undefined;
  ClubDetail: { slug: string; compose?: boolean; track?: Track } | undefined;
  Profile: { tab?: 'sons' | 'clips' | 'variations' | 'playlists' | 'posts'; openPendingVariations?: boolean } | undefined;
  Create: undefined;
  Upload: { challengeId?: string } | undefined;
  Library: undefined;
  CreateHub: { challengeId?: string } | undefined;
  CreateVariation: { challengeId?: string } | undefined;
  ClipComposer: { sourceTrackId?: string; sourceTrackType?: 'track' | 'ai_track'; challengeId?: string } | undefined;
  AIStudio: { sourceTrackId?: string; sourceTrackType?: 'track' | 'ai_track'; mode?: 'remix'; challengeId?: string } | undefined;
  CreatePost: { track?: Track } | undefined;
  Settings: undefined;
  Subscriptions: undefined;
  City: undefined;
  PublicProfile: { username: string };
  Notifications: undefined;
  PostDetail: { postId: string };
  PlaylistDetail: { playlistId: string };
  TrackDetail: { trackId: string; track?: Track };
  Search: { query?: string } | undefined;
  ChallengeDetail: { challengeId: string; challenge?: MusicChallenge } | undefined;
};

const Tab = createBottomTabNavigator<RootTabsParamList>();
const HIDDEN_ROUTES = new Set<keyof RootTabsParamList>([
  'Home',
  'Radar',
  'AIStudio',
  'Upload',
  'Library',
  'CreateHub',
  'CreateVariation',
  'ClipComposer',
  'ClubDetail',
  'DiscoverMood',
  'CreatePost',
  'Settings',
  'Subscriptions',
  'City',
  'PublicProfile',
  'Notifications',
  'PostDetail',
  'PlaylistDetail',
  'TrackDetail',
  'Search',
  'ChallengeDetail',
]);

function AnimatedTabButton({ children, accessibilityState, onPress, style, ...props }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const selected = Boolean(accessibilityState?.selected);

  useEffect(() => {
    if (!selected) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.08, speed: 34, bounciness: 6, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 28, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [scale, selected]);

  return (
    <Pressable
      {...props}
      accessibilityState={accessibilityState}
      onPress={(event) => {
        void Haptics.selectionAsync().catch(() => {});
        onPress?.(event);
      }}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, speed: 34, bounciness: 0, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, speed: 28, bounciness: 4, useNativeDriver: true }).start()}
      style={style}
    >
      <Animated.View style={[styles.tabMotion, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function SynauraScrollIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.scrollTab, focused && styles.scrollTabActive]}>
      <Text style={[styles.scrollLetter, focused && styles.scrollLetterActive]}>S</Text>
    </View>
  );
}

const PRIMARY_ROUTES = ['Swipe', 'Discover', 'Create', 'Community', 'Profile'] as const;
const PRIMARY_LABELS: Record<(typeof PRIMARY_ROUTES)[number], string> = {
  Swipe: 'Pour toi',
  Discover: 'Découvrir',
  Create: 'Créer',
  Community: 'Clubs',
  Profile: 'Moi',
};
const PRIMARY_ICONS: Record<Exclude<(typeof PRIMARY_ROUTES)[number], 'Swipe'>, keyof typeof Ionicons.glyphMap> = {
  Discover: 'compass-outline',
  Create: 'add-circle-outline',
  Community: 'people-outline',
  Profile: 'person-outline',
};

function SynauraTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => PRIMARY_ROUTES.includes(route.name as any));

  return (
    <View pointerEvents="box-none" style={[styles.dockWrap, { paddingBottom: insets.bottom }]}>
      <BlurView intensity={72} tint="light" style={styles.dock}>
        {routes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const isScroll = route.name === 'Swipe';
          const label = PRIMARY_LABELS[route.name as keyof typeof PRIMARY_LABELS];
          const onPress = () => {
            void Haptics.selectionAsync().catch(() => {});
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              testID={`tab-${route.name.toLowerCase()}`}
              onPress={onPress}
              style={[styles.dockItem, isScroll && styles.dockItemScroll]}
            >
              {isScroll ? (
                <SynauraScrollIcon focused={focused} />
              ) : (
                <View style={[styles.iconDock, focused && styles.iconDockActive]}>
                  <Ionicons
                    name={PRIMARY_ICONS[route.name as keyof typeof PRIMARY_ICONS]}
                    size={20}
                    color={focused ? colors.black : colors.textTertiary}
                  />
                </View>
              )}
              <Text numberOfLines={1} style={[styles.dockLabel, focused && styles.dockLabelActive, isScroll && styles.dockLabelScroll]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

export function Tabs() {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const tabNavigationRef = useRef<any>(null);

  return (
    <>
      <Tab.Navigator
        backBehavior="history"
        tabBar={(props) => <SynauraTabBar {...props} />}
        screenOptions={() => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
        })}
      >
        <Tab.Screen name="Swipe" component={SwipeScreen} />
        <Tab.Screen name="Discover" component={DiscoverV2Screen} />
        <Tab.Screen name="Radar" component={RadarScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="DiscoverMood" component={DiscoverMoodScreen} options={{ tabBarButton: () => null }} />
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
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="ClubDetail" component={ClubDetailScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
        <Tab.Screen name="Home" component={HomeV2Screen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="AIStudio" component={AIStudioScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Upload" component={UploadScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Library" component={LibraryScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="CreateHub" component={CreateHubScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="CreateVariation" component={CreateVariationScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="ClipComposer" component={ClipComposerScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="CreatePost" component={CreatePostScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="City" component={CityScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="PublicProfile" component={PublicProfileScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="PostDetail" component={PostDetailScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="PlaylistDetail" component={PlaylistDetailScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="TrackDetail" component={TrackDetailScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="ChallengeDetail" component={ChallengeDetailScreen} options={{ tabBarButton: () => null }} />
      </Tab.Navigator>
      <CreateMenuSheet
        visible={createMenuOpen}
        onClose={() => setCreateMenuOpen(false)}
        onCreateWithAI={() => {
          setCreateMenuOpen(false);
          tabNavigationRef.current?.navigate('AIStudio');
        }}
        onPublishTrack={() => {
          setCreateMenuOpen(false);
          tabNavigationRef.current?.navigate('Upload');
        }}
        onPublishClip={() => {
          setCreateMenuOpen(false);
          tabNavigationRef.current?.navigate('ClipComposer');
        }}
        onCreateVariation={() => {
          setCreateMenuOpen(false);
          tabNavigationRef.current?.navigate('CreateVariation');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabMotion: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconDock: {
    width: 32,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDockActive: { backgroundColor: 'rgba(115,87,198,0.11)' },
  scrollTab: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE8F7',
  },
  scrollTabActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  scrollLetter: {
    color: '#7357C6',
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '900',
  },
  scrollLetterActive: { color: '#FFFAF2' },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
    backgroundColor: 'rgba(250,250,249,0.96)',
  },
  dock: {
    height: 60,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    backgroundColor: 'rgba(250,250,249,0.94)',
    paddingHorizontal: 8,
  },
  dockItem: {
    flex: 1,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dockItemScroll: {},
  dockLabel: {
    maxWidth: '100%',
    color: colors.textTertiary,
    fontSize: 9,
    fontWeight: '800',
  },
  dockLabelActive: { color: colors.black },
  dockLabelScroll: { marginTop: -1 },
});

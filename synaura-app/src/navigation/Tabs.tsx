import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
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
import { StatsScreen } from '@/screens/StatsScreen';
import { colors } from '@/theme/tokens';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import type { MusicChallenge, Track } from '@/api/types';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

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
  Settings: undefined;
  Subscriptions: undefined;
  City: undefined;
  Stats: { trackId?: string } | undefined;
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
  'Stats',
  'PublicProfile',
  'PostDetail',
  'PlaylistDetail',
  'TrackDetail',
  'Search',
  'ChallengeDetail',
  'Notifications',
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

function SynauraScrollIcon({ focused, dark }: { focused: boolean; dark: boolean }) {
  return (
    <View style={[styles.scrollTab, dark && styles.scrollTabDark, focused && styles.scrollTabActive, dark && focused && styles.scrollTabActiveDark]}>
      <Text style={[styles.scrollLetter, dark && styles.scrollLetterDark, focused && styles.scrollLetterActive, dark && focused && styles.scrollLetterActiveDark]}>S</Text>
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
function primaryIcon(routeName: (typeof PRIMARY_ROUTES)[number], focused: boolean): keyof typeof Ionicons.glyphMap {
  if (routeName === 'Discover') return focused ? 'compass' : 'compass-outline';
  if (routeName === 'Community') return focused ? 'people' : 'people-outline';
  return focused ? 'person' : 'person-outline';
}

function SynauraTabBar({ state, navigation }: BottomTabBarProps) {
  const layout = useResponsiveLayout();
  const activeRoute = state.routes[state.index]?.name as keyof RootTabsParamList | undefined;
  if (activeRoute && HIDDEN_ROUTES.has(activeRoute)) return null;
  const dark = activeRoute === 'Swipe';
  const routes = state.routes.filter((route) => PRIMARY_ROUTES.includes(route.name as any));
  const dockWidth = Math.min(layout.safeWidth - (layout.isNarrow ? 12 : 18), layout.isTablet ? 620 : 520);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockWrap,
        {
          left: layout.insets.left + (layout.safeWidth - dockWidth) / 2,
          width: dockWidth,
          paddingBottom: Math.max(layout.insets.bottom, 7),
        },
      ]}
    >
      <BlurView
        intensity={82}
        tint={dark ? 'dark' : 'light'}
        style={[styles.dock, { height: layout.dockHeight }, dark ? styles.dockDark : styles.dockLight]}
      >
        {routes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const isScroll = route.name === 'Swipe';
          const isCreate = route.name === 'Create';
          const label = PRIMARY_LABELS[route.name as keyof typeof PRIMARY_LABELS];
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <AnimatedTabButton
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              testID={`tab-${route.name.toLowerCase()}`}
              onPress={onPress}
              style={[styles.dockItem, { height: layout.dockHeight - 2 }, isCreate && styles.dockItemCreate]}
            >
              {isScroll ? (
                <SynauraScrollIcon focused={focused} dark={dark} />
              ) : isCreate ? (
                <View style={[styles.createDock, layout.compactControls && styles.createDockCompact, dark && styles.createDockDark]}>
                  <Ionicons name="add" size={layout.compactControls ? 23 : 25} color={dark ? colors.black : colors.white} />
                </View>
              ) : (
                <View style={[styles.iconDock, focused && styles.iconDockActive, dark && focused && styles.iconDockActiveDark]}>
                  <Ionicons
                    name={primaryIcon(route.name as (typeof PRIMARY_ROUTES)[number], focused)}
                    size={21}
                    color={focused ? (dark ? colors.white : colors.black) : (dark ? 'rgba(255,255,255,0.48)' : colors.textTertiary)}
                  />
                </View>
              )}
              <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.dockLabel, layout.isNarrow && styles.dockLabelNarrow, dark && styles.dockLabelDark, focused && styles.dockLabelActive, dark && focused && styles.dockLabelActiveDark, isCreate && styles.dockLabelCreate]}>
                {label}
              </Text>
              {focused && !isCreate ? <View style={[styles.activeIndicator, dark && styles.activeIndicatorDark]} /> : null}
            </AnimatedTabButton>
          );
        })}
      </BlurView>
    </View>
  );
}

export function Tabs() {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const tabNavigationRef = useRef<any>(null);
  const { settings } = useMobileSettings();

  return (
    <>
      <Tab.Navigator
        backBehavior="history"
        tabBar={(props) => <SynauraTabBar {...props} />}
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
        <Tab.Screen name="Stats" component={StatsScreen} options={{ tabBarButton: () => null }} />
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDockActive: { backgroundColor: 'rgba(115,87,198,0.11)' },
  iconDockActiveDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  scrollTab: {
    width: 36,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE8F7',
  },
  scrollTabDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  scrollTabActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  scrollTabActiveDark: { backgroundColor: colors.white, borderColor: colors.white },
  scrollLetter: {
    color: '#7357C6',
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '900',
  },
  scrollLetterDark: { color: 'rgba(255,255,255,0.65)' },
  scrollLetterActive: { color: '#FFFAF2' },
  scrollLetterActiveDark: { color: colors.black },
  dockWrap: {
    position: 'absolute',
    bottom: 2,
    zIndex: 80,
    backgroundColor: 'transparent',
  },
  dock: {
    height: 66,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 5,
  },
  dockLight: { borderColor: 'rgba(17,17,17,0.09)', backgroundColor: 'rgba(255,255,255,0.9)' },
  dockDark: { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(17,17,17,0.82)' },
  dockItem: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dockItemCreate: { paddingTop: 1 },
  createDock: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black, shadowColor: colors.black, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  createDockCompact: { width: 40, height: 40, borderRadius: 12 },
  createDockDark: { backgroundColor: colors.white, shadowOpacity: 0.12 },
  dockLabel: {
    maxWidth: '100%',
    color: colors.textTertiary,
    fontSize: 9,
    fontWeight: '800',
  },
  dockLabelDark: { color: 'rgba(255,255,255,0.48)' },
  dockLabelNarrow: { fontSize: 8 },
  dockLabelActive: { color: colors.black },
  dockLabelActiveDark: { color: colors.white },
  dockLabelCreate: { marginTop: -2 },
  activeIndicator: { position: 'absolute', bottom: 2, width: 14, height: 2, borderRadius: 1, backgroundColor: colors.violet },
  activeIndicatorDark: { backgroundColor: colors.cyan },
});

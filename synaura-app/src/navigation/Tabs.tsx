import React, { useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, Pressable, StyleSheet, Text, View } from 'react-native';
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
  'Community',
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
      <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={22} color={focused ? (dark ? colors.white : colors.black) : (dark ? 'rgba(255,255,255,0.56)' : colors.textTertiary)} />
    </View>
  );
}

const PRIMARY_ROUTES = ['Swipe', 'Discover', 'Create', 'Library', 'Profile'] as const;
const PRIMARY_LABELS: Record<(typeof PRIMARY_ROUTES)[number], string> = {
  Swipe: 'Accueil',
  Discover: 'Découvrir',
  Create: 'Créer',
  Library: 'Bibliothèque',
  Profile: 'Profil',
};
function primaryIcon(routeName: (typeof PRIMARY_ROUTES)[number], focused: boolean): keyof typeof Ionicons.glyphMap {
  if (routeName === 'Discover') return focused ? 'compass' : 'compass-outline';
  if (routeName === 'Create') return focused ? 'add-circle' : 'add-circle-outline';
  if (routeName === 'Library') return focused ? 'library' : 'library-outline';
  return focused ? 'person' : 'person-outline';
}

function SynauraTabBar({ state, navigation }: BottomTabBarProps) {
  const layout = useResponsiveLayout();
  const activeRoute = state.routes[state.index]?.name as keyof RootTabsParamList | undefined;
  if (activeRoute && HIDDEN_ROUTES.has(activeRoute)) return null;
  const dark = true;
  const routes = state.routes.filter((route) => PRIMARY_ROUTES.includes(route.name as any));
  const dockWidth = Math.min(layout.safeWidth, layout.isTablet ? 640 : 560);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockWrap,
        {
          left: 0,
          right: 0,
          paddingLeft: layout.insets.left,
          paddingRight: layout.insets.right,
          paddingBottom: Math.max(layout.insets.bottom, 7),
        },
      ]}
    >
      <BlurView
        intensity={68}
        tint={dark ? 'dark' : 'light'}
        style={[styles.dock, { width: dockWidth, height: layout.dockHeight }, dark ? styles.dockDark : styles.dockLight]}
      >
        {routes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const isScroll = route.name === 'Swipe';
          const isCreate = route.name === 'Create';
          const label = PRIMARY_LABELS[route.name as keyof typeof PRIMARY_LABELS];
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (focused && isScroll && !event.defaultPrevented) {
              DeviceEventEmitter.emit('synaura:open-home-prelude');
              return;
            }
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
                  <Ionicons name="add" size={layout.compactControls ? 23 : 25} color={colors.black} />
                </View>
              ) : (
                <View style={[styles.iconDock, focused && styles.iconDockActive, dark && focused && styles.iconDockActiveDark]}>
                  <Ionicons
                    name={primaryIcon(route.name as (typeof PRIMARY_ROUTES)[number], focused)}
                    size={21}
                    color={focused ? colors.white : colors.textTertiary}
                  />
                </View>
              )}
              <Text maxFontSizeMultiplier={1.1} numberOfLines={1} adjustsFontSizeToFit style={[styles.dockLabel, layout.isNarrow && styles.dockLabelNarrow, dark && styles.dockLabelDark, focused && styles.dockLabelActive, dark && focused && styles.dockLabelActiveDark, isCreate && styles.dockLabelCreate]}>
                {label}
              </Text>
              {focused && !isCreate ? <View style={styles.activeIndicator} /> : null}
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
        initialRouteName="Swipe"
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
        <Tab.Screen name="Library" component={LibraryScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="ClubDetail" component={ClubDetailScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
        <Tab.Screen name="Home" component={HomeV2Screen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="AIStudio" component={AIStudioScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Upload" component={UploadScreen} options={{ tabBarButton: () => null }} />
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
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDockActive: { transform: [{ translateY: -1 }] },
  iconDockActiveDark: { transform: [{ translateY: -1 }] },
  scrollTab: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollTabDark: {},
  scrollTabActive: { transform: [{ translateY: -1 }] },
  scrollTabActiveDark: { transform: [{ translateY: -1 }] },
  dockWrap: {
    position: 'absolute',
    bottom: 0,
    zIndex: 80,
    backgroundColor: '#0D0D0D',
  },
  dock: {
    alignSelf: 'center',
    height: 70,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  dockLight: { borderColor: colors.border, backgroundColor: colors.glassDark },
  dockDark: { borderColor: colors.border, backgroundColor: '#0D0D0D' },
  dockItem: {
    flex: 1,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dockItemCreate: { paddingBottom: 1 },
  createDock: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, borderWidth: 3, borderColor: '#0D0D0D', shadowColor: colors.violet, shadowOpacity: 0.34, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8, transform: [{ translateY: -7 }] },
  createDockCompact: { width: 42, height: 42, borderRadius: 21 },
  createDockDark: { backgroundColor: colors.paper },
  dockLabel: {
    maxWidth: '100%',
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
  },
  dockLabelDark: { color: 'rgba(255,255,255,0.48)' },
  dockLabelNarrow: { fontSize: 9 },
  dockLabelActive: { color: colors.black },
  dockLabelActiveDark: { color: colors.white },
  dockLabelCreate: { marginTop: -7 },
  activeIndicator: { position: 'absolute', top: 0, width: 22, height: 2, borderRadius: 1, backgroundColor: colors.cyan },
  activeIndicatorDark: {},
});

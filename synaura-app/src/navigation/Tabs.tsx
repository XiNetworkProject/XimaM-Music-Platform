import React, { useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
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
import { EntryMotionScope, useEntryMotion } from '@/components/entry/EntryAtmosphere';

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
  Settings: undefined;
  Subscriptions: undefined;
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

function AnimatedTabButton({ children, accessibilityState, onPress, style, ...props }: any) {
  const motion = useEntryMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const selected = Boolean(accessibilityState?.selected);

  useEffect(() => {
    if (!motion) { scale.stopAnimation(); scale.setValue(1); return; }
    if (!selected) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.08, speed: 34, bounciness: 6, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 28, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [scale, selected, motion]);

  return (
    <Pressable
      {...props}
      accessibilityState={accessibilityState}
      onPress={(event) => {
        void Haptics.selectionAsync().catch(() => {});
        onPress?.(event);
      }}
      onPressIn={() => { if (motion) Animated.spring(scale, { toValue: 0.92, speed: 34, bounciness: 0, useNativeDriver: true }).start(); }}
      onPressOut={() => { if (motion) Animated.spring(scale, { toValue: 1, speed: 28, bounciness: 4, useNativeDriver: true }).start(); }}
      style={style}
    >
      <Animated.View style={[styles.tabMotion, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function SynauraScrollIcon({ focused, signal }: { focused: boolean; signal: boolean }) {
  return (
    <View style={[styles.scrollTab, signal && styles.signalIconBubble, focused && styles.scrollTabActive, signal && focused && styles.signalIconBubbleActive]}>
      <Ionicons
        name="radio-outline"
        size={22}
        color={focused && signal ? '#E2D9FF' : focused ? colors.cyan : signal ? '#9299B0' : colors.textTertiary}
      />
    </View>
  );
}

const PRIMARY_ROUTES = ['Swipe', 'Discover', 'Create', 'Library', 'Profile'] as const;
const PRIMARY_LABELS: Record<(typeof PRIMARY_ROUTES)[number], string> = {
  Swipe: 'Live',
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
  const { resolvedTheme } = useMobileSettings();
  const dark = resolvedTheme === 'dark';
  const activeRouteName = state.routes[state.index]?.name;
  const flowActive = activeRouteName === 'Swipe';
  const signal = dark || flowActive;
  const routes = state.routes.filter((route) => PRIMARY_ROUTES.includes(route.name as any));
  const dockWidth = Math.min(layout.safeWidth, layout.isTablet ? 640 : 560);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockWrap,
        signal ? styles.dockWrapSignal : styles.dockWrapEditorial,
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
        intensity={signal ? 78 : 68}
        tint={signal ? 'dark' : 'light'}
        style={[
          styles.dock,
          { width: dockWidth, height: layout.dockHeight },
          signal ? styles.dockSignal : styles.dockLight,
        ]}
      >
        {signal ? (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(6,8,16,0)', 'rgba(6,8,16,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={styles.signalTopLine}>
              <LinearGradient
                colors={['#7357C6', '#4A9EAA', '#D96D63']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
            <View pointerEvents="none" style={styles.signalWhiteLine} />
          </>
        ) : null}

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
                <SynauraScrollIcon focused={focused} signal={signal} />
              ) : isCreate ? (
                <LinearGradient
                  colors={signal ? ['transparent', 'transparent'] : [colors.paper, colors.paper]}
                  style={[styles.createDockFrame, layout.compactControls && styles.createDockFrameCompact, signal && { elevation: 0, shadowOpacity: 0, transform: [{ translateY: 0 }] }]}
                >
                  <View style={[styles.createDock, layout.compactControls && styles.createDockCompact, signal && styles.createDockSignal]}>
                    <Ionicons name="add" size={signal ? 32 : 25} color={signal ? '#CCB7FF' : colors.black} />
                  </View>
                </LinearGradient>
              ) : (
                <View style={[styles.iconDock, signal && styles.signalIconBubble, focused && styles.iconDockActive, signal && focused && styles.signalIconBubbleActive]}>
                  <Ionicons
                    name={primaryIcon(route.name as (typeof PRIMARY_ROUTES)[number], focused)}
                    size={21}
                    color={focused && signal ? '#E2D9FF' : focused ? colors.cyan : signal ? '#9299B0' : colors.textTertiary}
                  />
                </View>
              )}

              <Text
                maxFontSizeMultiplier={1.1}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.dockLabel,
                  layout.isNarrow && styles.dockLabelNarrow,
                  signal && styles.dockLabelSignal,
                  focused && styles.dockLabelActive,
                  signal && focused && styles.dockLabelActiveSignal,
                  isCreate && styles.dockLabelCreate,
                  signal && { fontWeight: '500', fontSize: 10 },
                ]}
              >
                {label}
              </Text>

              {focused && !isCreate ? (
                <View style={[styles.activeIndicatorClip, signal && { top: undefined, bottom: 3, width: 3, height: 3, borderRadius: 2 }]}>
                  <LinearGradient
                    colors={signal ? ['#CCB7FF', '#CCB7FF'] : [colors.cyan, colors.cyan]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
              ) : null}
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
  tabMotion: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconDock: { width: 36, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconDockActive: { transform: [{ translateY: -1 }] },
  scrollTab: { width: 36, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scrollTabActive: { transform: [{ translateY: -1 }] },
  signalIconBubble: { backgroundColor: 'transparent' },
  signalIconBubbleActive: { backgroundColor: 'transparent' },
  dockWrap: { position: 'absolute', bottom: 0, zIndex: 80 },
  dockWrapEditorial: { backgroundColor: colors.background },
  dockWrapSignal: { backgroundColor: '#060810' },
  dock: { alignSelf: 'center', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  dockLight: { borderColor: colors.border, backgroundColor: colors.glassDark },
  dockSignal: { backgroundColor: '#060810' },
  signalTopLine: { display: 'none' },
  signalWhiteLine: { display: 'none' },
  dockItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dockItemCreate: { paddingBottom: 1 },
  createDockFrame: { width: 48, height: 48, borderRadius: 24, padding: 2, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8, transform: [{ translateY: -7 }] },
  createDockFrameCompact: { width: 44, height: 44, borderRadius: 22 },
  createDock: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.background },
  createDockCompact: { width: 40, height: 40, borderRadius: 20 },
  createDockSignal: { borderWidth: 0, backgroundColor: 'transparent' },
  dockLabel: { maxWidth: '100%', color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  dockLabelSignal: { color: 'rgba(255,255,255,0.48)' },
  dockLabelNarrow: { fontSize: 9 },
  dockLabelActive: { color: colors.black },
  dockLabelActiveSignal: { color: '#E2D9FF', fontWeight: '600' },
  dockLabelCreate: { marginTop: -7 },
  activeIndicatorClip: { position: 'absolute', top: 0, width: 28, height: 2.5, overflow: 'hidden', borderRadius: 2 },
});

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

function SynauraScrollIcon({ focused, signal }: { focused: boolean; signal: boolean }) {
  return (
    <View style={[styles.scrollTab, signal && styles.signalIconBubble, focused && styles.scrollTabActive, signal && focused && styles.signalIconBubbleActive]}>
      <Ionicons
        name={focused ? 'pulse' : 'pulse-outline'}
        size={22}
        color={focused ? colors.cyan : signal ? 'rgba(255,255,255,0.58)' : colors.textTertiary}
      />
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
              colors={['rgba(115,87,198,0.18)', 'rgba(74,158,170,0.08)', 'rgba(217,109,99,0.17)']}
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
                  colors={signal ? ['#F7F6F3', '#ECE8FF', '#FBE7E3'] : [colors.paper, colors.paper]}
                  style={[styles.createDockFrame, layout.compactControls && styles.createDockFrameCompact]}
                >
                  <View style={[styles.createDock, layout.compactControls && styles.createDockCompact, signal && styles.createDockSignal]}>
                    <Ionicons name="add" size={layout.compactControls ? 23 : 25} color={colors.black} />
                  </View>
                </LinearGradient>
              ) : (
                <View style={[styles.iconDock, signal && styles.signalIconBubble, focused && styles.iconDockActive, signal && focused && styles.signalIconBubbleActive]}>
                  <Ionicons
                    name={primaryIcon(route.name as (typeof PRIMARY_ROUTES)[number], focused)}
                    size={21}
                    color={focused ? colors.cyan : signal ? 'rgba(255,255,255,0.58)' : colors.textTertiary}
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
                ]}
              >
                {label}
              </Text>

              {focused && !isCreate ? (
                <View style={styles.activeIndicatorClip}>
                  <LinearGradient
                    colors={signal ? ['#7357C6', '#4A9EAA', '#D96D63'] : [colors.cyan, colors.cyan]}
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
  signalIconBubble: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.025)' },
  signalIconBubbleActive: { borderColor: 'rgba(114,187,197,0.36)', backgroundColor: 'rgba(74,158,170,0.12)', shadowColor: '#4A9EAA', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  dockWrap: { position: 'absolute', bottom: 0, zIndex: 80 },
  dockWrapEditorial: { backgroundColor: colors.background },
  dockWrapSignal: { backgroundColor: 'rgba(9,9,11,0.97)' },
  dock: { alignSelf: 'center', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingHorizontal: 4 },
  dockLight: { borderColor: colors.border, backgroundColor: colors.glassDark },
  dockSignal: { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(13,10,14,0.94)' },
  signalTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, opacity: 0.92 },
  signalWhiteLine: { position: 'absolute', top: 2.5, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  dockItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dockItemCreate: { paddingBottom: 1 },
  createDockFrame: { width: 48, height: 48, borderRadius: 24, padding: 2, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8, transform: [{ translateY: -7 }] },
  createDockFrameCompact: { width: 44, height: 44, borderRadius: 22 },
  createDock: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.background },
  createDockCompact: { width: 40, height: 40, borderRadius: 20 },
  createDockSignal: { borderColor: 'rgba(9,9,11,0.82)' },
  dockLabel: { maxWidth: '100%', color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  dockLabelSignal: { color: 'rgba(255,255,255,0.48)' },
  dockLabelNarrow: { fontSize: 9 },
  dockLabelActive: { color: colors.black },
  dockLabelActiveSignal: { color: colors.cyan, fontWeight: '900' },
  dockLabelCreate: { marginTop: -7 },
  activeIndicatorClip: { position: 'absolute', top: 0, width: 28, height: 2.5, overflow: 'hidden', borderRadius: 2 },
});

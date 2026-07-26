import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import {
  HomeFlowPrelude as SeamlessHomeFlowPrelude,
} from './HomeFlowPreludeSeamless';
import type { HomePost, Track } from '@/api/types';

type Props = {
  visible: boolean;
  tracks: Track[];
  posts: HomePost[];
  currentTrack?: Track | null;
  currentPlaying?: boolean;
  userName?: string | null;
  topPad: number;
  bottomPad: number;
  onEnterFlow: () => void;
  onPlayTrack: (track: Track) => void;
  onOpenTrack: (track: Track) => void;
  onOpenPost: (post: HomePost) => void;
  onSearch: () => void;
  onNotifications: () => void;
  onDiscover: () => void;
  onRadar: () => void;
  onStudio: () => void;
  onEvents: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function HomeFlowPrelude(props: Props) {
  const { visible, onEnterFlow } = props;
  const responsive = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const progress = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(0);
  const finishingRef = useRef(false);

  useEffect(() => {
    const id = progress.addListener(({ value }) => { progressValue.current = value; });
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    if (!visible) return;
    finishingRef.current = false;
    progress.stopAnimation();
    progress.setValue(0);
    progressValue.current = 0;
  }, [progress, visible]);

  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    void Haptics.selectionAsync().catch(() => {});

    if (settings.reducedMotion) {
      progress.setValue(1);
      onEnterFlow();
      return;
    }

    Animated.timing(progress, {
      toValue: 1,
      duration: 340,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onEnterFlow();
      else finishingRef.current = false;
    });
  }, [onEnterFlow, progress, settings.reducedMotion]);

  const reset = useCallback(() => {
    if (finishingRef.current) return;
    Animated.spring(progress, {
      toValue: 0,
      speed: 30,
      bounciness: 2,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => (
      gesture.dy < -6 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.16
    ),
    onMoveShouldSetPanResponderCapture: (_, gesture) => (
      gesture.dy < -6 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.16
    ),
    onPanResponderMove: (_, gesture) => {
      progress.setValue(clamp(-gesture.dy / Math.max(230, responsive.height * 0.48), 0, 1));
    },
    onPanResponderRelease: (_, gesture) => {
      if (progressValue.current > 0.14 || gesture.vy < -0.31) finish();
      else reset();
    },
    onPanResponderTerminate: reset,
    onPanResponderTerminationRequest: () => false,
  }), [finish, progress, reset, responsive.height]);

  if (!visible) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Math.max(360, responsive.height * 0.68)],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0.9, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.transitionLayer,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <SeamlessHomeFlowPrelude {...props} onEnterFlow={onEnterFlow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  transitionLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 121,
    backgroundColor: 'transparent',
  },
});

export default HomeFlowPrelude;

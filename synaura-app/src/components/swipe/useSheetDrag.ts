import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';
import { shouldDismissSheet } from './liveLayout';

/** Attach to the dedicated grip only: never steal a button, list or input gesture. */
export function useSheetDrag(visible: boolean, onDismiss: () => void, enabled = true) {
  const motion = useEntryMotion();
  const translateY = useRef(new Animated.Value(0)).current;
  const dismiss = useRef(onDismiss); dismiss.current = onDismiss;
  useEffect(() => { translateY.stopAnimation(); translateY.setValue(0); }, [visible, enabled, translateY]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => enabled,
    onMoveShouldSetPanResponder: (_, gesture) => enabled && gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx) * 1.5,
    onPanResponderMove: (_, gesture) => { if (motion) translateY.setValue(Math.max(0, gesture.dy)); },
    onPanResponderRelease: (_, gesture) => {
      if (shouldDismissSheet(gesture.dy, gesture.vy)) { dismiss.current(); translateY.setValue(0); }
      else if (motion) Animated.spring(translateY, { toValue: 0, speed: 26, bounciness: 2, useNativeDriver: true, isInteraction: false }).start();
    },
    onPanResponderTerminate: () => translateY.setValue(0),
  }), [enabled, motion, translateY]);
  return { panHandlers: responder.panHandlers, transform: [{ translateY }] };
}

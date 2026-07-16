import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { trackArtistName } from './helpers';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors } from '@/theme/tokens';

type Props = {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
};

export function LyricsSheet({ visible, track, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const lyrics = track?.lyrics?.trim() || '';
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: 240, useNativeDriver: true }).start();
  }, [slide, visible]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(13,10,14,0.6)', opacity: slide }]}>
        <Pressable accessibilityLabel="Fermer les paroles" onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { left: responsive.overlayLeftInset, right: responsive.overlayRightInset, paddingTop: insets.top + 14, paddingBottom: Math.max(insets.bottom, 18) + 12, transform: [{ translateY }] }]}>
        <View style={styles.header}>
          <View style={styles.coverThumb}>
            <TrackCover track={track} active={visible} style={StyleSheet.absoluteFill} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>Paroles</Text>
            <Text numberOfLines={1} style={styles.title}>{track?.title || 'Paroles'}</Text>
            <Text style={styles.artist} numberOfLines={1}>{trackArtistName(track || ({} as Track))}</Text>
          </View>
          <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.lyricsText}>{lyrics || 'Aucune parole disponible pour ce titre.'}</Text>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 64,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  coverThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 },
  artist: { color: colors.textSecondary, fontSize: 12, marginTop: 3, fontWeight: '700' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  body: { padding: 22, paddingBottom: 80 },
  lyricsText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 26,
    fontWeight: '500',
  },
});

export default LyricsSheet;

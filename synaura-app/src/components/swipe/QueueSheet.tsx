import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '@/player/PlayerProvider';
import { TrackCover } from '@/components/TrackCover';
import { trackArtistName } from './helpers';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function QueueSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [slide, visible]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(13,10,14,0.55)', opacity: slide }]}>
        <Pressable accessibilityLabel="Fermer la file" onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18), transform: [{ translateY }] }]}>
        <View style={styles.handleArea}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>File d'attente</Text>
            <Text style={styles.title}>{player.queue.length} titre{player.queue.length > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Activer le shuffle"
              onPress={() => void player.toggleShuffle()}
              style={[styles.toggle, player.shuffleEnabled && styles.toggleActive]}
            >
              <Ionicons name="shuffle" size={16} color={player.shuffleEnabled ? '#FFFAF2' : '#171313'} />
            </Pressable>
            <Pressable
              accessibilityLabel="Changer le mode boucle"
              onPress={() => void player.cycleRepeatMode()}
              style={[styles.toggle, player.repeatMode !== 'off' && styles.toggleActive]}
            >
              <Ionicons name={player.repeatMode === 'one' ? 'repeat' : 'repeat-outline'} size={16} color={player.repeatMode !== 'off' ? '#FFFAF2' : '#171313'} />
            </Pressable>
            <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#171313" />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {player.queue.map((track, index) => {
            const active = index === player.currentIndex;
            return (
              <Pressable
                key={`${track._id}-${index}`}
                accessibilityLabel={`Lire ${track.title}`}
                onPress={() => void player.playQueueIndex(index)}
                style={[styles.row, active && styles.rowActive]}
              >
                <View style={styles.coverWrap}>
                  <TrackCover track={track} active={visible} style={StyleSheet.absoluteFill} />
                </View>
                <View style={styles.meta}>
                  <Text numberOfLines={1} style={[styles.itemTitle, active && styles.itemTitleActive]}>{track.title}</Text>
                  <Text numberOfLines={1} style={styles.itemArtist}>{trackArtistName(track)}</Text>
                </View>
                {active ? (
                  <View style={styles.playingBadge}>
                    <Ionicons name="volume-high" size={14} color="#7C5CFF" />
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityLabel="Monter dans la file"
                      disabled={index <= 0 || index - 1 === player.currentIndex}
                      onPress={() => void player.moveInQueue(index, index - 1)}
                      style={styles.icon}
                    >
                      <Ionicons name="chevron-up" size={16} color="rgba(23,19,19,0.55)" />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Descendre dans la file"
                      disabled={index >= player.queue.length - 1}
                      onPress={() => void player.moveInQueue(index, index + 1)}
                      style={styles.icon}
                    >
                      <Ionicons name="chevron-down" size={16} color="rgba(23,19,19,0.55)" />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Retirer de la file"
                      onPress={() => void player.removeFromQueue(index)}
                      style={styles.icon}
                    >
                      <Ionicons name="trash-outline" size={15} color="#E64545" />
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })}
          {!player.queue.length ? (
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={32} color="rgba(23,19,19,0.4)" />
              <Text style={styles.emptyText}>Aucun titre dans la file pour le moment.</Text>
            </View>
          ) : null}
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
    maxHeight: '82%',
    minHeight: '50%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFAF2',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
  handleArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  handleBar: { width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(23,19,19,0.18)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(23,19,19,0.08)',
    gap: 12,
  },
  kicker: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: '#171313', fontSize: 17, fontWeight: '900', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  toggleActive: { backgroundColor: '#171313' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  list: { padding: 14, paddingBottom: 30, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(23,19,19,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.05)',
  },
  rowActive: {
    backgroundColor: 'rgba(124,92,255,0.10)',
    borderColor: 'rgba(124,92,255,0.30)',
  },
  coverWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: 'rgba(23,19,19,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, minWidth: 0 },
  itemTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  itemTitleActive: { color: '#171313' },
  itemArtist: { color: 'rgba(23,19,19,0.5)', fontSize: 11, fontWeight: '700', marginTop: 3 },
  playingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,92,255,0.18)',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  icon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 50 },
  emptyText: { color: 'rgba(23,19,19,0.5)', fontSize: 13, textAlign: 'center', paddingHorizontal: 28 },
});

export default QueueSheet;

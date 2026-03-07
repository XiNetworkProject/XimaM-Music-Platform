import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { usePlayer } from '../contexts/PlayerContext';
import { api, type ApiTrack } from '../services/api';

type TrackActionSheetProps = {
  visible: boolean;
  track: ApiTrack | null;
  onClose: () => void;
};

type ActionItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function TrackActionSheet({ visible, track, onClose }: TrackActionSheetProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { playTrack } = usePlayer();
  const [liked, setLiked] = useState(track?.isLiked ?? false);

  React.useEffect(() => {
    if (track) setLiked(track.isLiked ?? false);
  }, [track]);

  const artistName =
    track?.artist?.artistName ||
    track?.artist?.name ||
    track?.artist?.username ||
    'Artiste inconnu';

  const handlePlay = useCallback(() => {
    if (!track) return;
    playTrack(track);
    onClose();
  }, [track, playTrack, onClose]);

  const handleAddToQueue = useCallback(() => {
    if (!track) return;
    playTrack(track);
    onClose();
  }, [track, playTrack, onClose]);

  const handleAddToPlaylist = useCallback(() => {
    Alert.alert('Ajouter à une playlist', 'Cette fonctionnalité arrive bientôt.');
    onClose();
  }, [onClose]);

  const handleToggleLike = useCallback(async () => {
    if (!track) return;
    try {
      const res = await api.likeTrack(track._id);
      if (res.success) setLiked(res.data.liked);
    } catch {}
    onClose();
  }, [track, onClose]);

  const handleViewArtist = useCallback(() => {
    if (!track?.artist?.username) return;
    const nav = navigation.getParent?.() || navigation;
    nav.navigate('PublicProfile', { username: track.artist.username });
    onClose();
  }, [track, navigation, onClose]);

  const handleShare = useCallback(async () => {
    if (!track) return;
    try {
      await Share.share({
        message: `${track.title} par ${artistName} — Écoute sur Synaura !`,
      });
    } catch {}
    onClose();
  }, [track, artistName, onClose]);

  const handleViewTrack = useCallback(() => {
    if (!track) return;
    const nav = navigation.getParent?.() || navigation;
    nav.navigate('Track', { id: track._id });
    onClose();
  }, [track, navigation, onClose]);

  if (!track) return null;

  const actions: ActionItem[] = [
    { icon: 'play-circle-outline', label: 'Mettre en lecture', onPress: handlePlay },
    { icon: 'list-outline', label: 'Ajouter à la file d\u2019attente', onPress: handleAddToQueue },
    { icon: 'add-circle-outline', label: 'Ajouter à une playlist', onPress: handleAddToPlaylist },
    {
      icon: liked ? 'heart' : 'heart-outline',
      label: liked ? 'Je n\u2019aime plus' : 'J\u2019aime',
      onPress: handleToggleLike,
    },
    { icon: 'person-outline', label: 'Voir l\u2019artiste', onPress: handleViewArtist },
    { icon: 'share-social-outline', label: 'Partager', onPress: handleShare },
    { icon: 'musical-note-outline', label: 'Voir la piste', onPress: handleViewTrack },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Track info */}
          <View style={styles.trackInfo}>
            <View style={styles.cover}>
              {track.coverUrl ? (
                <Image source={{ uri: track.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={styles.coverFallback}>
                  <Ionicons name="musical-note" size={22} color={colors.accentBrand} />
                </View>
              )}
            </View>
            <View style={styles.meta}>
              <Text numberOfLines={1} style={styles.title}>{track.title || 'Sans titre'}</Text>
              <Text numberOfLines={1} style={styles.artist}>{artistName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Actions */}
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}
              onPress={action.onPress}
            >
              <Ionicons
                name={action.icon}
                size={22}
                color={action.icon === 'heart' ? '#FF4D6A' : colors.accentBrand}
                style={styles.actionIcon}
              />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 16,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
  },
  cover: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,97,255,0.18)',
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  artist: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  actionPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionIcon: {
    width: 30,
    textAlign: 'center',
    marginRight: 14,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default TrackActionSheet;

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { Track } from '@/api/types';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { TrackCover } from '@/components/TrackCover';
import { ShareSheet } from '@/components/swipe/ShareSheet';
import { BottomSheet } from './BottomSheet';
import { colors, radius, spacing } from '@/theme/tokens';

export function TrackActionsSheet({ track, onClose }: { track: Track | null; onClose: () => void }) {
  const navigation = useNavigation<any>();
  const library = useLibrary();
  const player = usePlayer();
  const [shareOpen, setShareOpen] = React.useState(false);
  const favorite = track ? library.isFavorite(track._id) : false;
  const downloaded = track ? library.isDownloaded(track._id) : false;

  const closeAnd = (action: () => void) => {
    onClose();
    requestAnimationFrame(action);
  };

  return (
    <>
      <BottomSheet visible={Boolean(track) && !shareOpen} title="Actions du morceau" subtitle={track?.title} onClose={onClose}>
        {track ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.preview}>
              <TrackCover track={track} style={styles.cover} />
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
                <Text numberOfLines={1} style={styles.artist}>{track.artist?.name || track.artist?.username || 'Artiste Synaura'}</Text>
              </View>
              <Pressable accessibilityLabel="Lire" onPress={() => closeAnd(() => void player.playTrack(track))} style={styles.play}>
                <Ionicons name="play" size={18} color={colors.white} />
              </Pressable>
            </View>
            <Action icon="information-circle-outline" title="Voir les détails" onPress={() => closeAnd(() => navigation.navigate('TrackDetail', { trackId: track._id, track }))} />
            <Action icon={favorite ? 'heart' : 'heart-outline'} title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onPress={() => library.toggleFavorite(track)} />
            <Action icon={downloaded ? 'trash-outline' : 'download-outline'} title={downloaded ? 'Retirer le téléchargement' : 'Télécharger'} onPress={() => downloaded ? void library.removeDownload(track._id) : void library.downloadTrack(track)} />
            <Action icon="share-social-outline" title="Partager" onPress={() => setShareOpen(true)} />
            {track.artist?.username ? <Action icon="person-outline" title="Voir l'artiste" onPress={() => closeAnd(() => navigation.navigate('PublicProfile', { username: track.artist?.username }))} /> : null}
          </ScrollView>
        ) : null}
      </BottomSheet>
      <ShareSheet visible={shareOpen} track={track} onClose={() => { setShareOpen(false); onClose(); }} />
    </>
  );
}

function Action({ icon, title, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <View style={styles.actionIcon}><Ionicons name={icon} size={19} color={colors.text} /></View>
      <Text style={styles.actionText}>{title}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xs, padding: spacing.lg, paddingTop: spacing.md },
  preview: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, borderRadius: radius.lg, backgroundColor: 'rgba(17,17,17,0.045)', padding: spacing.sm },
  cover: { width: 58, height: 58, borderRadius: radius.md },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  artist: { marginTop: 3, color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  play: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  action: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  actionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.05)' },
  actionText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
});

import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MobileProfileTrack } from '@/api/client';
import { TrackCover } from '@/components/TrackCover';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  track: MobileProfileTrack | null;
  playing: boolean;
  confirmDelete: boolean;
  deleting: boolean;
  error?: string | null;
  onClose: () => void;
  onPlay: (track: MobileProfileTrack) => void;
  onOpen: (track: MobileProfileTrack) => void;
  onEdit: (track: MobileProfileTrack) => void;
  onShare: (track: MobileProfileTrack) => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

export function ProfileTrackActionsSheet({
  track,
  playing,
  confirmDelete,
  deleting,
  error,
  onClose,
  onPlay,
  onOpen,
  onEdit,
  onShare,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: Props) {
  const isPrivate = track?.isPublic === false;

  return (
    <BottomSheet
      visible={Boolean(track)}
      title={confirmDelete ? 'Supprimer le morceau' : 'Gérer le morceau'}
      subtitle={track?.title}
      onClose={deleting ? () => undefined : onClose}
      maxHeight="82%"
    >
      {track ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.preview}>
            <TrackCover track={track} active={playing} autoPlayVideo={playing} style={styles.cover} />
            <View style={styles.previewCopy}>
              <Text numberOfLines={2} style={styles.title}>{track.title}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: isPrivate ? colors.coral : colors.cyan }]} />
                <Text style={styles.statusText}>{isPrivate ? 'Brouillon privé' : 'Morceau public'}</Text>
              </View>
            </View>
            {!confirmDelete ? (
              <Pressable accessibilityLabel={playing ? 'Mettre en pause' : 'Lire'} onPress={() => onPlay(track)} style={styles.playButton}>
                <Ionicons name={playing ? 'pause' : 'play'} size={18} color={colors.warmWhite} />
              </Pressable>
            ) : null}
          </View>

          {confirmDelete ? (
            <View style={styles.deletePanel}>
              <View style={styles.deleteIcon}><Ionicons name="trash-outline" size={22} color={colors.coral} /></View>
              <Text style={styles.deleteTitle}>Cette suppression est définitive.</Text>
              <Text style={styles.deleteText}>Le morceau sera retiré du profil et ne pourra plus être écouté depuis Synaura.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.confirmRow}>
                <Pressable disabled={deleting} onPress={onCancelDelete} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Annuler</Text>
                </Pressable>
                <Pressable disabled={deleting} onPress={onConfirmDelete} style={[styles.deleteButton, deleting && styles.disabled]}>
                  {deleting ? <ActivityIndicator color={colors.warmWhite} /> : <Ionicons name="trash" size={16} color={colors.warmWhite} />}
                  <Text style={styles.deleteButtonText}>{deleting ? 'Suppression...' : 'Supprimer'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Action icon="information-circle-outline" title="Ouvrir le morceau" detail="Lecteur, waveform et commentaires" onPress={() => onOpen(track)} />
              <Action icon="create-outline" title="Modifier" detail="Titre, visibilité, tags et permissions" onPress={() => onEdit(track)} />
              <Action
                icon={isPrivate ? 'lock-closed-outline' : 'share-social-outline'}
                title={isPrivate ? 'Partage indisponible' : 'Partager'}
                detail={isPrivate ? 'Publie le brouillon avant de créer sa carte.' : 'Créer une carte ou copier le lien'}
                disabled={isPrivate}
                onPress={() => onShare(track)}
              />
              <Action icon="trash-outline" title="Supprimer" detail="Retirer définitivement ce morceau" destructive onPress={onRequestDelete} />
            </View>
          )}
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

function Action({
  icon,
  title,
  detail,
  onPress,
  destructive = false,
  disabled = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}>
      <View style={[styles.actionIcon, destructive && styles.actionIconDanger]}>
        <Ionicons name={icon} size={19} color={destructive ? colors.coral : colors.text} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, destructive && styles.actionTitleDanger]}>{title}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingTop: spacing.md },
  preview: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.sm, backgroundColor: colors.surfaceMuted },
  cover: { width: 66, height: 66, borderRadius: radius.md },
  previewCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  statusRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  playButton: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  actions: { gap: 2 },
  action: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  actionIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  actionIconDanger: { backgroundColor: colors.coralSoft },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  actionTitleDanger: { color: colors.coral },
  actionDetail: { marginTop: 3, color: colors.textTertiary, fontSize: 9, lineHeight: 13, fontWeight: '700' },
  deletePanel: { alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colors.coralSoft, borderWidth: 1, borderColor: 'rgba(217,109,99,0.24)' },
  deleteIcon: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  deleteTitle: { marginTop: spacing.xs, color: colors.text, textAlign: 'center', fontSize: 16, fontWeight: '900' },
  deleteText: { maxWidth: 360, color: colors.textSecondary, textAlign: 'center', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  error: { color: colors.danger, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  confirmRow: { width: '100%', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface },
  cancelText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  deleteButton: { flex: 1.15, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.pill, backgroundColor: colors.coral },
  deleteButtonText: { color: colors.warmWhite, fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.42 },
});

import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MusicClip } from '@/api/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { colors, radius, spacing } from '@/theme/tokens';

const VISIBILITY_LABELS: Record<MusicClip['visibility'], string> = {
  published: 'Clip public',
  hidden: 'Clip privé',
  draft: 'Brouillon',
};

type Props = {
  clip: MusicClip | null;
  confirmDelete: boolean;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onOpen: (clip: MusicClip) => void;
  onEdit: (clip: MusicClip) => void;
  onShare: (clip: MusicClip) => void;
  onChangeVisibility: (clip: MusicClip, visibility: MusicClip['visibility']) => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

export function ProfileClipActionsSheet({
  clip,
  confirmDelete,
  busy,
  error,
  onClose,
  onOpen,
  onEdit,
  onShare,
  onChangeVisibility,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: Props) {
  const isPublished = clip?.visibility === 'published';
  const artwork = clip?.posterUrl || clip?.sourceTrack.coverUrl || null;

  return (
    <BottomSheet
      visible={Boolean(clip)}
      title={confirmDelete ? 'Supprimer le Clip' : 'Gérer le Clip'}
      subtitle={clip?.sourceTrack.title}
      onClose={busy ? () => undefined : onClose}
      maxHeight="84%"
    >
      {clip ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.preview}>
            <View style={styles.poster}>
              {artwork ? <Image source={{ uri: artwork }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /> : <Ionicons name="film-outline" size={24} color={colors.textTertiary} />}
            </View>
            <View style={styles.previewCopy}>
              <Text numberOfLines={2} style={styles.title}>{clip.caption || clip.sourceTrack.title}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: isPublished ? colors.cyan : colors.coral }]} />
                <Text style={styles.statusText}>{VISIBILITY_LABELS[clip.visibility]}</Text>
              </View>
            </View>
          </View>

          {confirmDelete ? (
            <View style={styles.deletePanel}>
              <View style={styles.deleteIcon}><Ionicons name="trash-outline" size={22} color={colors.coral} /></View>
              <Text style={styles.deleteTitle}>Supprimer définitivement ce Clip ?</Text>
              <Text style={styles.deleteText}>La vidéo, ses likes et ses commentaires seront retirés de Synaura. Cette action est irréversible.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.confirmRow}>
                <Pressable disabled={busy} onPress={onCancelDelete} style={styles.cancelButton}><Text style={styles.cancelText}>Annuler</Text></Pressable>
                <Pressable disabled={busy} onPress={onConfirmDelete} style={[styles.deleteButton, busy && styles.disabled]}>
                  {busy ? <ActivityIndicator color={colors.warmWhite} /> : <Ionicons name="trash" size={16} color={colors.warmWhite} />}
                  <Text style={styles.deleteButtonText}>{busy ? 'Suppression...' : 'Supprimer'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Action icon="play-circle-outline" title={isPublished ? 'Ouvrir le Clip' : 'Ouvrir le morceau associé'} detail={isPublished ? 'Lecture, likes et commentaires' : 'Le brouillon reste invisible aux autres'} onPress={() => onOpen(clip)} />
              <Action icon="create-outline" title="Modifier" detail="Légende, tags et visibilité" onPress={() => onEdit(clip)} />
              <Action
                icon={isPublished ? 'eye-off-outline' : 'earth-outline'}
                title={isPublished ? 'Rendre privé' : 'Publier'}
                detail={isPublished ? 'Le Clip disparaîtra des profils publics et du Flow' : 'Le Clip sera visible sur ton profil et dans le Flow'}
                disabled={busy || (!isPublished && !clip.videoUrl)}
                loading={busy}
                onPress={() => onChangeVisibility(clip, isPublished ? 'hidden' : 'published')}
              />
              <Action icon="share-social-outline" title="Partager" detail={isPublished ? 'Créer une carte ou copier le lien' : 'Disponible une fois le Clip publié'} disabled={!isPublished} onPress={() => onShare(clip)} />
              <Action icon="trash-outline" title="Supprimer" detail="Retirer définitivement la vidéo" destructive onPress={onRequestDelete} />
            </View>
          )}
          {!confirmDelete && error ? <Text style={styles.errorBanner}>{error}</Text> : null}
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
  loading = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}>
      <View style={[styles.actionIcon, destructive && styles.actionIconDanger]}>
        {loading ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name={icon} size={19} color={destructive ? colors.coral : colors.text} />}
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
  preview: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.sm, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  poster: { width: 54, height: 76, overflow: 'hidden', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  previewCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  statusRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  actions: { gap: spacing.xs },
  action: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
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
  confirmRow: { width: '100%', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface },
  cancelText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  deleteButton: { flex: 1.15, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.pill, backgroundColor: colors.coral },
  deleteButtonText: { color: colors.warmWhite, fontSize: 12, fontWeight: '900' },
  error: { color: colors.coral, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  errorBanner: { borderRadius: radius.sm, padding: spacing.md, color: colors.coral, backgroundColor: colors.coralSoft, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  disabled: { opacity: 0.42 },
});

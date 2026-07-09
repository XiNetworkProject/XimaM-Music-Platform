import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMomentReaction, createComment } from '@/api/client';
import type { MomentReactionType, Track } from '@/api/types';
import { MOMENT_REACTIONS } from '@/components/mobile/MomentWaveform';
import { invalidateTrackMoments } from '@/components/swipe/WaveformSeekBar';
import { fmtTime } from '@/components/swipe/helpers';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  visible: boolean;
  track: Track | null;
  /** Instant de lecture figé à l'ouverture de la feuille. */
  timestampSeconds: number;
  onClose: () => void;
  onCommentCreated?: () => void;
};

// Feuille "Réagir à ce moment" du lecteur plein écran : une réaction rapide en
// un geste, ou un commentaire ancré à l'instant courant. Remplace l'ancien
// rail de réactions/composer affiché en permanence (trop encombrant pour
// tenir sur un seul écran).
export function MomentSheet({ visible, track, timestampSeconds, onClose, onCommentCreated }: Props) {
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reactionBusy, setReactionBusy] = useState<MomentReactionType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const trackId = track?._id || '';

  useEffect(() => {
    if (!visible) return;
    setCommentText('');
    setMessage(null);
    setConfirmation(null);
  }, [visible]);

  const react = async (reactionType: MomentReactionType) => {
    if (!trackId || reactionBusy) return;
    setReactionBusy(reactionType);
    setMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await addMomentReaction(trackId, reactionType, timestampSeconds);
      invalidateTrackMoments(trackId);
      const meta = MOMENT_REACTIONS.find((reaction) => reaction.type === reactionType);
      setConfirmation(`${meta?.label || 'Réaction'} ajoutée à ${fmtTime(timestampSeconds)}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error && /auth|autor|connect/i.test(error.message)
        ? 'Connecte-toi pour réagir à ce moment.'
        : 'Réaction impossible pour le moment.');
    } finally {
      setReactionBusy(null);
    }
  };

  const submitComment = async () => {
    const value = commentText.trim();
    if (!trackId || !value || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await createComment('track', trackId, value, { timestampSeconds });
      invalidateTrackMoments(trackId);
      setCommentText('');
      setConfirmation(`Commentaire ancré à ${fmtTime(timestampSeconds)}`);
      onCommentCreated?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error && /auth|autor|connect/i.test(error.message)
        ? 'Connecte-toi pour commenter ce moment.'
        : 'Impossible de publier ce commentaire.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Fermer" style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.head}>
              <View style={styles.timeChip}>
                <Ionicons name="pulse" size={13} color={colors.paper} />
                <Text style={styles.timeChipText}>{fmtTime(timestampSeconds)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.kicker}>Réagir à ce moment</Text>
                <Text numberOfLines={1} style={styles.trackTitle}>{track?.title || ''}</Text>
              </View>
            </View>

            <View style={styles.reactionGrid}>
              {MOMENT_REACTIONS.map((reaction) => (
                <Pressable
                  key={reaction.type}
                  accessibilityLabel={reaction.label}
                  disabled={Boolean(reactionBusy)}
                  onPress={() => void react(reaction.type)}
                  style={[styles.reactionChip, { borderColor: `${reaction.color}55` }]}
                >
                  {reactionBusy === reaction.type ? (
                    <ActivityIndicator size="small" color={reaction.color} />
                  ) : (
                    <Ionicons name={reaction.icon} size={17} color={reaction.color} />
                  )}
                  <Text style={styles.reactionLabel}>{reaction.shortLabel}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.composer}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={`Que se passe-t-il à ${fmtTime(timestampSeconds)} ?`}
                placeholderTextColor="rgba(17,17,17,0.38)"
                multiline
                style={styles.input}
              />
              <Pressable
                accessibilityLabel="Publier le commentaire"
                disabled={!commentText.trim() || submitting}
                onPress={() => void submitComment()}
                style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
              >
                {submitting ? <ActivityIndicator color={colors.paper} /> : <Ionicons name="send" size={16} color={colors.paper} />}
              </Pressable>
            </View>

            {confirmation ? (
              <View style={styles.confirmation}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.confirmationText}>{confirmation}</Text>
              </View>
            ) : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#F7F6F3',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(17,17,17,0.18)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
  },
  timeChipText: { color: colors.paper, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  kicker: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  trackTitle: { marginTop: 2, color: colors.text, fontSize: 15, fontWeight: '900' },
  reactionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reactionChip: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.sm,
  },
  reactionLabel: { color: colors.text, fontSize: 11, fontWeight: '900' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  sendButtonDisabled: { opacity: 0.38 },
  confirmation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmationText: { flex: 1, color: colors.success, fontSize: 11, fontWeight: '800' },
  message: { color: colors.danger, fontSize: 11, fontWeight: '800' },
});

export default MomentSheet;

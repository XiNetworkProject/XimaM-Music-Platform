import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MusicClip } from '@/api/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { colors, radius, spacing } from '@/theme/tokens';

export type ClipEditForm = {
  caption: string;
  tags: string[];
  visibility: MusicClip['visibility'];
};

export function ClipEditBottomSheet({
  clip,
  saving,
  error,
  onClose,
  onSave,
}: {
  clip: MusicClip | null;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (form: ClipEditForm) => void;
}) {
  const [caption, setCaption] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [visibility, setVisibility] = useState<MusicClip['visibility']>('draft');

  useEffect(() => {
    if (!clip) return;
    setCaption(clip.caption || '');
    setTagsText(clip.tags.join(', '));
    setVisibility(clip.visibility);
  }, [clip]);

  const artwork = clip?.posterUrl || clip?.sourceTrack.coverUrl || null;
  const cannotPublish = visibility === 'published' && !clip?.videoUrl;

  return (
    <BottomSheet
      visible={Boolean(clip)}
      title="Modifier le Clip"
      subtitle={clip?.sourceTrack.title}
      keyboard
      maxHeight="92%"
      onClose={saving ? () => undefined : onClose}
    >
      {clip ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.preview}>
            <View style={styles.poster}>
              {artwork ? <Image source={{ uri: artwork }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /> : <Ionicons name="film-outline" size={24} color={colors.textTertiary} />}
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.eyebrow}>Vidéo musicale</Text>
              <Text numberOfLines={2} style={styles.trackTitle}>{clip.sourceTrack.title}</Text>
              <Text numberOfLines={1} style={styles.artist}>{clip.creator.name || clip.creator.username}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}><Text style={styles.label}>Légende</Text><Text style={styles.counter}>{caption.length}/280</Text></View>
            <TextInput
              value={caption}
              maxLength={280}
              multiline
              textAlignVertical="top"
              onChangeText={setCaption}
              placeholder="Raconte le moment derrière ce Clip..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, styles.captionInput]}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tags</Text>
            <TextInput
              value={tagsText}
              autoCapitalize="none"
              onChangeText={setTagsText}
              placeholder="live, studio, remix"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            <Text style={styles.hint}>Sépare les tags par des virgules. Ils servent à la découverte, pas à fabriquer de faux signaux.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Visibilité</Text>
            <SegmentedControl
              value={visibility}
              compact
              dark
              options={[
                { value: 'published', label: 'Public', icon: 'earth-outline' },
                { value: 'hidden', label: 'Privé', icon: 'eye-off-outline' },
                { value: 'draft', label: 'Brouillon', icon: 'document-text-outline' },
              ]}
              onChange={setVisibility}
            />
            <View style={styles.visibilityHelp}>
              <Ionicons name={visibility === 'published' ? 'globe-outline' : visibility === 'hidden' ? 'lock-closed-outline' : 'document-outline'} size={15} color={visibility === 'published' ? colors.cyan : colors.coral} />
              <Text style={styles.visibilityText}>
                {visibility === 'published' ? 'Visible sur ton profil et dans les espaces Clips.' : visibility === 'hidden' ? 'Visible uniquement par toi.' : 'Conservé dans ton profil privé sans être publié.'}
              </Text>
            </View>
          </View>

          {cannotPublish ? <Text style={styles.error}>Ajoute une vidéo lisible avant de publier ce brouillon.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable disabled={saving} onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Annuler</Text></Pressable>
            <Pressable
              disabled={saving || cannotPublish}
              onPress={() => onSave({
                caption: caption.trim(),
                tags: tagsText.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean),
                visibility,
              })}
              style={[styles.save, (saving || cannotPublish) && styles.disabled]}
            >
              {saving ? <ActivityIndicator color={colors.warmWhite} /> : <Ionicons name="checkmark" size={17} color={colors.warmWhite} />}
              <Text style={styles.saveText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg, paddingTop: spacing.md },
  preview: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.sm, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  poster: { width: 52, height: 70, overflow: 'hidden', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  previewCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.cyan, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  trackTitle: { marginTop: 4, color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  artist: { marginTop: 4, color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  field: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 12, fontWeight: '900' },
  counter: { color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  input: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.borderStrong, color: colors.text, fontSize: 13, fontWeight: '700' },
  captionInput: { minHeight: 96, paddingTop: spacing.md, paddingBottom: spacing.md },
  hint: { color: colors.textTertiary, fontSize: 9, lineHeight: 13, fontWeight: '600' },
  visibilityHelp: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surfaceStrong },
  visibilityText: { flex: 1, color: colors.textSecondary, fontSize: 9, lineHeight: 14, fontWeight: '700' },
  error: { borderRadius: radius.sm, padding: spacing.md, color: colors.coral, backgroundColor: colors.coralSoft, textAlign: 'center', fontSize: 10, lineHeight: 15, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  cancel: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  cancelText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  save: { flex: 1.35, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.pill, backgroundColor: colors.violet },
  saveText: { color: colors.warmWhite, fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.42 },
});

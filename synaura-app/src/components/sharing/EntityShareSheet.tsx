import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { cacheRemoteShareImage, shareCachedImage } from '@/sharing/shareAsset';
import { colors, radius, spacing } from '@/theme/tokens';

export function EntityShareSheet({
  visible,
  title,
  subtitle,
  kindLabel,
  url,
  imageUrl,
  fileKey,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  kindLabel: string;
  url: string;
  imageUrl?: string | null;
  fileKey: string;
  onClose: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState<'loading' | 'ready' | 'error'>(imageUrl ? 'loading' : 'error');
  const [sharingImage, setSharingImage] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const resolvedImageUrl = imageUrl ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}v=${revision}` : '';

  useEffect(() => {
    if (!visible) return;
    setPreview(imageUrl ? 'loading' : 'error');
    setProgress(0);
    setFeedback(null);
  }, [imageUrl, visible]);

  const shareLink = async () => {
    try {
      const result = await Share.share({ title, message: `${title}${subtitle ? ` · ${subtitle}` : ''}\n${url}`, url });
      if (result.action === Share.sharedAction) onClose();
    } catch {
      setFeedback('Le partage du lien a échoué.');
    }
  };

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(url);
      setFeedback('Lien copié.');
    } catch {
      setFeedback('Impossible de copier le lien.');
    }
  };

  const shareImage = async () => {
    if (!resolvedImageUrl || sharingImage) return;
    setSharingImage(true);
    setProgress(0);
    setFeedback(null);
    try {
      const cached = await cacheRemoteShareImage(resolvedImageUrl, fileKey, ({ ratio }) => setProgress(ratio));
      await shareCachedImage(cached.uri, `Partager ${title} sur Synaura`);
      setFeedback('Carte prête à partager.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Carte indisponible. Le lien reste partageable.');
    } finally {
      setSharingImage(false);
    }
  };

  return (
    <BottomSheet visible={visible} title={`Partager ${kindLabel.toLowerCase()}`} subtitle={subtitle || title} onClose={onClose} maxHeight="90%">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewPanel}>
          <View style={styles.previewHeader}>
            <View style={styles.mark}><Text style={styles.markText}>S</Text></View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>Carte {kindLabel.toLowerCase()}</Text>
              <Text style={styles.previewSubtitle}>Une image Synaura prête à être partagée.</Text>
            </View>
          </View>
          <View style={styles.preview}>
            {resolvedImageUrl ? (
              <Image
                key={resolvedImageUrl}
                source={{ uri: resolvedImageUrl }}
                resizeMode="cover"
                style={StyleSheet.absoluteFillObject}
                onLoadStart={() => setPreview('loading')}
                onLoad={() => setPreview('ready')}
                onError={() => setPreview('error')}
              />
            ) : null}
            {preview === 'loading' ? <View style={styles.previewState}><ActivityIndicator color={colors.warmWhite} /><Text style={styles.previewStateText}>Création de la carte...</Text></View> : null}
            {preview === 'error' ? (
              <View style={styles.previewState}>
                <Ionicons name="image-outline" size={24} color={colors.warmWhite} />
                <Text style={styles.previewStateText}>Aperçu indisponible. Le lien fonctionne toujours.</Text>
                {resolvedImageUrl ? <Pressable onPress={() => setRevision((value) => value + 1)} style={styles.retry}><Ionicons name="refresh" size={14} color={colors.black} /><Text style={styles.retryText}>Réessayer</Text></Pressable> : null}
              </View>
            ) : null}
          </View>
          <Pressable disabled={preview !== 'ready' || sharingImage} onPress={() => void shareImage()} style={[styles.primary, (preview !== 'ready' || sharingImage) && styles.disabled]}>
            {sharingImage ? <ActivityIndicator color={colors.black} /> : <Ionicons name="image-outline" size={18} color={colors.black} />}
            <Text style={styles.primaryText}>{sharingImage ? `Préparation ${Math.round(progress * 100)}%` : 'Partager la carte'}</Text>
          </Pressable>
          {sharingImage ? <View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.max(8, progress * 100)}%` as `${number}%` }]} /></View> : null}
        </View>

        <View style={styles.linkPanel}>
          <Text numberOfLines={2} style={styles.link}>{url}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => void shareLink()} style={styles.shareButton}><Ionicons name="share-social-outline" size={17} color={colors.warmWhite} /><Text style={styles.shareText}>Partager le lien</Text></Pressable>
            <Pressable onPress={() => void copyLink()} style={styles.copyButton}><Ionicons name="copy-outline" size={17} color={colors.text} /><Text style={styles.copyText}>Copier</Text></Pressable>
          </View>
        </View>
        {feedback ? <View style={styles.feedback}><Ionicons name="information-circle-outline" size={17} color={colors.cyan} /><Text style={styles.feedbackText}>{feedback}</Text></View> : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingTop: spacing.md },
  previewPanel: { gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.dark, borderWidth: 1, borderColor: 'rgba(247,246,243,0.12)' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warmWhite },
  markText: { color: colors.black, fontSize: 16, fontWeight: '900' },
  previewCopy: { flex: 1, minWidth: 0 },
  previewTitle: { color: colors.warmWhite, fontSize: 12, fontWeight: '900' },
  previewSubtitle: { marginTop: 2, color: 'rgba(247,246,243,0.52)', fontSize: 10, fontWeight: '700' },
  preview: { width: '100%', aspectRatio: 1200 / 630, overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.darkSurfaceRaised, borderWidth: 1, borderColor: 'rgba(247,246,243,0.12)' },
  previewState: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(17,17,17,0.88)' },
  previewStateText: { maxWidth: 280, color: colors.warmWhite, textAlign: 'center', fontSize: 11, lineHeight: 16, fontWeight: '800' },
  retry: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, paddingHorizontal: 14, backgroundColor: colors.warmWhite },
  retryText: { color: colors.black, fontSize: 10, fontWeight: '900' },
  primary: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.warmWhite },
  primaryText: { color: colors.black, fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.48 },
  progress: { height: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(247,246,243,0.13)' },
  progressFill: { height: '100%', backgroundColor: colors.cyan },
  linkPanel: { gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  link: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  shareButton: { flex: 1.2, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.md, backgroundColor: colors.violet },
  shareText: { color: colors.warmWhite, fontSize: 11, fontWeight: '900' },
  copyButton: { flex: 0.8, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  copyText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  feedback: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.cyanSoft, borderWidth: 1, borderColor: 'rgba(74,158,170,0.24)' },
  feedbackText: { flex: 1, color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '700' },
});

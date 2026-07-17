import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { API_BASE_URL, type MobileProfile } from '@/api/client';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { cacheRemoteShareImage, shareCachedImage } from '@/sharing/shareAsset';
import { colors, radius, spacing } from '@/theme/tokens';

export function ProfileShareSheet({
  visible,
  profile,
  onClose,
}: {
  visible: boolean;
  profile: MobileProfile | null;
  onClose: () => void;
}) {
  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sharingCard, setSharingCard] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const profileUrl = useMemo(
    () => profile?.username ? `${API_BASE_URL}/profile/${encodeURIComponent(profile.username)}` : '',
    [profile?.username],
  );
  const cardUrl = useMemo(() => {
    if (!profile?.username) return '';
    return `${profileUrl}/opengraph-image?v=${previewRevision}`;
  }, [previewRevision, profile?.username, profileUrl]);
  const shareMessage = profile
    ? `Découvre ${profile.name} (@${profile.username}) sur Synaura.\n${profileUrl}`
    : '';

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      setFeedback(null);
      return;
    }
    setPreviewStatus('loading');
    setFeedback(null);
  }, [cardUrl, visible]);

  const shareLink = async () => {
    if (!profile || !profileUrl) return;
    setFeedback(null);
    try {
      const result = await Share.share({
        title: `${profile.name} sur Synaura`,
        message: shareMessage,
        url: profileUrl,
      });
      if (result.action === Share.sharedAction) onClose();
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Le partage du lien a échoué.' });
    }
  };

  const copyLink = async () => {
    if (!profileUrl) return;
    try {
      await Clipboard.setStringAsync(profileUrl);
      setFeedback({ tone: 'success', text: 'Lien du profil copié.' });
    } catch {
      setFeedback({ tone: 'error', text: 'Impossible de copier le lien.' });
    }
  };

  const shareCard = async () => {
    if (!profile || !cardUrl || sharingCard) return;
    setSharingCard(true);
    setProgress(0);
    setFeedback(null);
    try {
      const cached = await cacheRemoteShareImage(
        cardUrl,
        `profil-${profile.username}`,
        ({ ratio }) => setProgress(ratio),
      );
      await shareCachedImage(cached.uri, `Partager le profil de ${profile.name}`);
      setFeedback({ tone: 'success', text: 'Carte de profil prête à partager.' });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'La carte de profil est indisponible.',
      });
    } finally {
      setSharingCard(false);
    }
  };

  return (
    <BottomSheet
      visible={visible && Boolean(profile)}
      title="Partager le profil"
      subtitle={profile ? `${profile.name} · @${profile.username}` : undefined}
      onClose={onClose}
      maxHeight="90%"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewPanel}>
          <View style={styles.previewHeader}>
            <View style={styles.previewMark}><Text style={styles.previewMarkText}>S</Text></View>
            <View style={styles.previewHeaderCopy}>
              <Text style={styles.previewKicker}>Carte artiste</Text>
              <Text style={styles.previewHint}>Une image prête pour les réseaux.</Text>
            </View>
          </View>

          <View style={styles.preview}>
            {cardUrl ? (
              <Image
                key={cardUrl}
                source={{ uri: cardUrl }}
                resizeMode="cover"
                style={StyleSheet.absoluteFillObject}
                onLoadStart={() => setPreviewStatus('loading')}
                onLoad={() => setPreviewStatus('ready')}
                onError={() => setPreviewStatus('error')}
              />
            ) : null}
            {previewStatus === 'loading' ? (
              <View style={styles.previewState}>
                <ActivityIndicator color={colors.warmWhite} />
                <Text style={styles.previewStateText}>Création de la carte...</Text>
              </View>
            ) : null}
            {previewStatus === 'error' ? (
              <View style={styles.previewState}>
                <Ionicons name="cloud-offline-outline" size={24} color={colors.warmWhite} />
                <Text style={styles.previewStateText}>L’aperçu n’a pas chargé.</Text>
                <Pressable onPress={() => setPreviewRevision((value) => value + 1)} style={styles.retryButton}>
                  <Ionicons name="refresh" size={14} color={colors.black} />
                  <Text style={styles.retryText}>Réessayer</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Pressable
            accessibilityLabel="Partager la carte du profil"
            disabled={sharingCard || previewStatus === 'error'}
            onPress={() => void shareCard()}
            style={[styles.primaryButton, (sharingCard || previewStatus === 'error') && styles.buttonDisabled]}
          >
            {sharingCard ? <ActivityIndicator color={colors.black} /> : <Ionicons name="image-outline" size={18} color={colors.black} />}
            <Text style={styles.primaryButtonText}>{sharingCard ? `Préparation ${Math.round(progress * 100)}%` : 'Partager la carte'}</Text>
          </Pressable>
          {sharingCard ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(8, progress * 100)}%` as `${number}%` }]} /></View> : null}
        </View>

        <View style={styles.linkPanel}>
          <View style={styles.linkCopy}>
            <Text style={styles.linkTitle}>Lien du profil</Text>
            <Text numberOfLines={2} style={styles.linkValue}>{profileUrl}</Text>
          </View>
          <View style={styles.actionsRow}>
            <Pressable accessibilityLabel="Partager le lien du profil" onPress={() => void shareLink()} style={styles.linkButton}>
              <Ionicons name="share-social-outline" size={17} color={colors.warmWhite} />
              <Text style={styles.linkButtonText}>Partager le lien</Text>
            </Pressable>
            <Pressable accessibilityLabel="Copier le lien du profil" onPress={() => void copyLink()} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={17} color={colors.text} />
              <Text style={styles.copyButtonText}>Copier</Text>
            </Pressable>
          </View>
        </View>

        {feedback ? (
          <View style={[styles.feedback, feedback.tone === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
            <Ionicons name={feedback.tone === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={17} color={feedback.tone === 'error' ? colors.coral : colors.cyan} />
            <Text style={styles.feedbackText}>{feedback.text}</Text>
            {feedback.tone === 'error' ? <Pressable onPress={() => void shareLink()}><Text style={styles.feedbackAction}>Partager le lien</Text></Pressable> : null}
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingTop: spacing.md },
  previewPanel: { gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.dark, borderWidth: 1, borderColor: 'rgba(247,246,243,0.12)' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewMark: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warmWhite },
  previewMarkText: { color: colors.black, fontSize: 16, fontWeight: '900' },
  previewHeaderCopy: { flex: 1, minWidth: 0 },
  previewKicker: { color: colors.warmWhite, fontSize: 12, fontWeight: '900' },
  previewHint: { marginTop: 2, color: 'rgba(247,246,243,0.52)', fontSize: 10, fontWeight: '700' },
  preview: { width: '100%', aspectRatio: 1200 / 630, overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.darkSurfaceRaised, borderWidth: 1, borderColor: 'rgba(247,246,243,0.12)' },
  previewState: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(17,17,17,0.8)' },
  previewStateText: { color: colors.warmWhite, textAlign: 'center', fontSize: 11, fontWeight: '800' },
  retryButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, paddingHorizontal: 14, backgroundColor: colors.warmWhite },
  retryText: { color: colors.black, fontSize: 10, fontWeight: '900' },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.warmWhite },
  primaryButtonText: { color: colors.black, fontSize: 13, fontWeight: '900' },
  buttonDisabled: { opacity: 0.48 },
  progressTrack: { height: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(247,246,243,0.13)' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.cyan },
  linkPanel: { gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  linkCopy: { gap: 4 },
  linkTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  linkValue: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  linkButton: { flex: 1.2, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.md, backgroundColor: colors.violet },
  linkButtonText: { color: colors.warmWhite, fontSize: 11, fontWeight: '900' },
  copyButton: { flex: 0.8, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  copyButtonText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  feedback: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1 },
  feedbackError: { backgroundColor: colors.coralSoft, borderColor: 'rgba(217,109,99,0.25)' },
  feedbackSuccess: { backgroundColor: colors.cyanSoft, borderColor: 'rgba(74,158,170,0.25)' },
  feedbackText: { flex: 1, color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  feedbackAction: { color: colors.text, fontSize: 10, fontWeight: '900', textDecorationLine: 'underline' },
});

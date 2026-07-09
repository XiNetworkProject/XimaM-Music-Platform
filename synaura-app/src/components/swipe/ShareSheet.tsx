import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { buildShareCardImageUrl, buildShareUrls, SHARE_CARD_FORMATS, shareTrackToFeed, type ShareCardFormatId } from '@/api/client';
import type { Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

type Props = {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
  onShared?: (trackId: string, source: string) => void;
};

const QUICK_CAPTIONS = ['Coup de cœur', 'À mettre en boucle', "Besoin d'avis"];

export function ShareSheet({ visible, track, onClose, onShared }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [cardText, setCardText] = useState('');
  const [cardFormat, setCardFormat] = useState<ShareCardFormatId>('square');
  const [publishing, setPublishing] = useState(false);
  const [imageDownloading, setImageDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const slide = useRef(new Animated.Value(0)).current;

  const trackId = track?._id || '';
  const isRadio = trackId.startsWith('radio-');
  const isAi = trackId.startsWith('ai-');
  const canInternal = !!trackId && !isRadio && !isAi;

  const { trackUrl, shareText } = useMemo(() => buildShareUrls(track), [track]);
  const selectedCardFormat = useMemo(
    () => SHARE_CARD_FORMATS.find((item) => item.id === cardFormat) || SHARE_CARD_FORMATS[1],
    [cardFormat],
  );
  const cardImageUrl = useMemo(() => buildShareCardImageUrl(track, cardFormat, cardText), [cardFormat, cardText, track]);
  const cardShareText = useMemo(() => [cardText.trim(), shareText].filter(Boolean).join('\n\n'), [cardText, shareText]);

  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [slide, visible]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const copyValue = useCallback(async (value: string, label: string) => {
    if (!value) return;
    try {
      await Clipboard.setStringAsync(value);
      showToast(`${label} copié`);
      onShared?.(trackId, `mobile-share-${label.toLowerCase().replace(/\s+/g, '-')}`);
    } catch {
      showToast('Copie impossible');
    }
  }, [onShared, showToast, trackId]);

  const nativeShare = useCallback(async () => {
    if (!shareText) return;
    try {
      const result = await Share.share({ message: cardShareText || shareText, url: trackUrl, title: track?.title || 'Synaura' });
      if (result.action === Share.sharedAction) {
        onShared?.(trackId, 'mobile-share-native');
        onClose();
      }
    } catch {
      // ignore
    }
  }, [cardShareText, onClose, onShared, shareText, track?.title, trackId, trackUrl]);

  const downloadShareCard = useCallback(async () => {
    if (!cardImageUrl || !trackId) return;
    setImageDownloading(true);
    try {
      const safeId = trackId.replace(/[^a-z0-9_-]/gi, '-');
      const localUri = `${FileSystem.cacheDirectory}synaura-share-${safeId}-${cardFormat}.png`;
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => undefined);
      const result = await FileSystem.downloadAsync(cardImageUrl, localUri);
      if (!result?.uri) throw new Error('Image introuvable');
      showToast('Carte prete a partager');
      onShared?.(trackId, 'mobile-share-card-image');
      await Share.share({ url: result.uri, message: cardShareText || shareText, title: track?.title || 'Synaura' });
    } catch {
      showToast('Image impossible a telecharger');
    } finally {
      setImageDownloading(false);
    }
  }, [cardFormat, cardImageUrl, cardShareText, onShared, shareText, showToast, track?.title, trackId]);

  const publishInternal = useCallback(async () => {
    if (!canInternal || !user) return;
    setPublishing(true);
    try {
      const post = await shareTrackToFeed(trackId, caption);
      if (post) {
        onShared?.(trackId, 'mobile-share-internal-post');
        showToast('Son publié dans le feed');
        setCaption('');
        onClose();
      } else {
        showToast('Publication impossible');
      }
    } catch {
      showToast('Publication impossible. Vérifie ta connexion.');
    } finally {
      setPublishing(false);
    }
  }, [canInternal, caption, onClose, onShared, showToast, trackId, user]);

  const askCommunity = useCallback(() => {
    if (!track || !canInternal) return;
    onClose();
    navigation.navigate('Community', { compose: true, category: 'feedback', track });
  }, [canInternal, navigation, onClose, track]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(13,10,14,0.55)', opacity: slide }]}>
        <Pressable accessibilityLabel="Fermer le partage" onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 14 : Math.max(insets.bottom, 16) + 16,
          },
        ]}
      >
        <View style={styles.handleArea}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>Partager</Text>
            <Text numberOfLines={1} style={styles.title}>{track?.title || 'Partager le son'}</Text>
            <Text style={styles.subtitle}>Choisis ton canal favori sans quitter le player.</Text>
          </View>
          <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#171313" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.darkSection}>
            <View style={styles.darkSectionHeader}>
              <Ionicons name="image-outline" size={16} color="rgba(255,250,242,0.62)" />
              <Text style={styles.darkSectionTitle}>Carte de partage</Text>
            </View>
            <View
              style={[
                styles.cardPreview,
                {
                  aspectRatio: selectedCardFormat.width / selectedCardFormat.height,
                  width: cardFormat === 'story' ? '62%' : '100%',
                },
              ]}
            >
              {cardImageUrl ? (
                <Image source={{ uri: cardImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <View style={styles.cardPreviewFallback}><Ionicons name="musical-notes" size={28} color="rgba(255,250,242,0.44)" /></View>
              )}
            </View>
            <View style={styles.formatRow}>
              {SHARE_CARD_FORMATS.map((item) => {
                const active = item.id === cardFormat;
                return (
                  <Pressable key={item.id} accessibilityLabel={`Format ${item.label}`} onPress={() => setCardFormat(item.id)} style={[styles.formatChip, active && styles.formatChipActive]}>
                    <Text style={[styles.formatChipText, active && styles.formatChipTextActive]}>{item.label}</Text>
                    <Text style={[styles.formatChipSub, active && styles.formatChipSubActive]}>{item.ratioLabel}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={cardText}
              onChangeText={(value) => setCardText(value.slice(0, 112))}
              placeholder="Ajoute une phrase courte..."
              placeholderTextColor="rgba(255,250,242,0.38)"
              multiline
              style={styles.cardTextInput}
            />
            <View style={styles.cardActionRow}>
              <Pressable accessibilityLabel="Telecharger l'image de partage" disabled={imageDownloading || !cardImageUrl} onPress={() => void downloadShareCard()} style={[styles.cardAction, (imageDownloading || !cardImageUrl) && styles.cardActionDisabled]}>
                {imageDownloading ? <ActivityIndicator color="#171313" /> : <Ionicons name="download-outline" size={16} color="#171313" />}
                <Text style={styles.cardActionText}>Telecharger l'image</Text>
              </Pressable>
              <Pressable accessibilityLabel="Copier le lien de la carte" onPress={() => void copyValue(cardImageUrl, 'Image')} style={styles.cardGhostAction}>
                <Ionicons name="copy-outline" size={15} color="#FFFAF2" />
                <Text style={styles.cardGhostActionText}>Copier l'image</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="share-social" size={16} color="rgba(23,19,19,0.5)" />
              <Text style={styles.sectionTitle}>Partage rapide</Text>
            </View>
            <Pressable accessibilityLabel="Partager via le menu système" onPress={() => void nativeShare()} style={styles.primaryAction}>
              <Ionicons name="share" size={18} color="#FFFAF2" />
              <Text style={styles.primaryActionText}>Partager via le système</Text>
            </Pressable>
            <View style={styles.linkRow}>
              <Pressable accessibilityLabel="Copier le lien" onPress={() => void copyValue(trackUrl, 'Lien')} style={styles.copyButton}>
                <Ionicons name="link" size={15} color="#171313" />
                <Text style={styles.copyButtonText}>Copier le lien</Text>
              </Pressable>
              <Pressable accessibilityLabel="Copier le texte" onPress={() => void copyValue(cardShareText || shareText, 'Texte')} style={styles.copyButton}>
                <Ionicons name="document-text-outline" size={15} color="#171313" />
                <Text style={styles.copyButtonText}>Copier le texte</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="megaphone-outline" size={16} color="rgba(23,19,19,0.5)" />
              <Text style={styles.sectionTitle}>Republier dans le feed Synaura</Text>
            </View>
            {canInternal ? (
              <View style={{ gap: 12 }}>
                <Pressable accessibilityLabel="Demander un avis à la communauté" onPress={askCommunity} style={styles.communityAction}>
                  <View style={styles.communityIcon}><Ionicons name="people" size={17} color="#FFFAF2" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.communityTitle}>Demander un avis</Text>
                    <Text style={styles.communityText}>Attache ce son à une discussion Communauté.</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#171313" />
                </Pressable>
                <TextInput
                  value={caption}
                  onChangeText={(value) => setCaption(value.slice(0, 220))}
                  placeholder="Ajoute une phrase pour ton feed…"
                  placeholderTextColor="rgba(23,19,19,0.36)"
                  multiline
                  style={styles.input}
                />
                <View style={styles.captionsRow}>
                  {QUICK_CAPTIONS.map((chip) => (
                    <Pressable
                      key={chip}
                      accessibilityLabel={`Ajouter le tag ${chip}`}
                      onPress={() => setCaption((current) => (current.trim() ? `${current.trim()} ${chip}` : chip))}
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>{chip}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.publishRow}>
                  <Text style={styles.counter}>{user ? `${caption.length}/220` : 'Connexion requise'}</Text>
                  <Pressable
                    accessibilityLabel="Publier dans le feed"
                    disabled={publishing || !user}
                    onPress={() => void publishInternal()}
                    style={[styles.publishButton, (publishing || !user) && styles.publishButtonDisabled]}
                  >
                    {publishing ? (
                      <ActivityIndicator color="#FFFAF2" />
                    ) : (
                      <>
                        <Ionicons name="rocket" size={15} color="#FFFAF2" />
                        <Text style={styles.publishButtonText}>Publier</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>Les sons IA ne se republient pas encore. Utilise le partage par lien.</Text>
              </View>
            )}
          </View>

          <View style={styles.urlBox}>
            <Text style={styles.urlAuthor}>{track?.artist?.name || track?.artist?.username || 'Synaura'}</Text>
            <Text numberOfLines={2} style={styles.urlText}>{trackUrl || 'Aucun lien disponible'}</Text>
          </View>
        </ScrollView>

        {toast ? (
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={16} color="#11D27A" />
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
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
    maxHeight: '94%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFAF2',
    borderTopWidth: 1,
    borderTopColor: 'rgba(23,19,19,0.06)',
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
  kicker: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: '#171313', fontSize: 18, fontWeight: '900', marginTop: 4 },
  subtitle: { color: 'rgba(23,19,19,0.5)', fontSize: 12, marginTop: 4, fontWeight: '700' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  scroll: { paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  darkSection: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.1)',
    gap: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  darkSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  darkSectionTitle: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  cardPreview: {
    alignSelf: 'center',
    maxHeight: 420,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.14)',
    backgroundColor: 'rgba(255,250,242,0.06)',
  },
  cardPreviewFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  formatRow: { flexDirection: 'row', gap: 8 },
  formatChip: {
    flex: 1,
    minHeight: 54,
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.12)',
    backgroundColor: 'rgba(255,250,242,0.07)',
  },
  formatChipActive: { backgroundColor: '#FFFAF2', borderColor: '#FFFAF2' },
  formatChipText: { color: '#FFFAF2', fontSize: 12, fontWeight: '900' },
  formatChipTextActive: { color: '#171313' },
  formatChipSub: { marginTop: 2, color: 'rgba(255,250,242,0.42)', fontSize: 9, fontWeight: '800' },
  formatChipSubActive: { color: 'rgba(23,19,19,0.48)' },
  cardTextInput: {
    minHeight: 72,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: '#FFFAF2',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(255,250,242,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.11)',
  },
  cardActionRow: { flexDirection: 'row', gap: 8 },
  cardAction: {
    flex: 1.18,
    minHeight: 44,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFFAF2',
  },
  cardActionDisabled: { opacity: 0.5 },
  cardActionText: { color: '#171313', fontSize: 12, fontWeight: '900' },
  cardGhostAction: {
    flex: 0.9,
    minHeight: 44,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.15)',
    backgroundColor: 'rgba(255,250,242,0.06)',
  },
  cardGhostActionText: { color: '#FFFAF2', fontSize: 11, fontWeight: '900' },
  section: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.06)',
    gap: 12,
    marginBottom: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: '#171313',
  },
  primaryActionText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  linkRow: { flexDirection: 'row', gap: 8 },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.1)',
    backgroundColor: '#FFFAF2',
  },
  copyButtonText: { color: '#171313', fontSize: 12, fontWeight: '900' },
  input: {
    minHeight: 76,
    maxHeight: 130,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#171313',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#FFFAF2',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.1)',
  },
  captionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  communityAction: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 17, backgroundColor: 'rgba(124,92,255,0.11)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.2)' },
  communityIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C5CFF' },
  communityTitle: { color: '#171313', fontSize: 12, fontWeight: '900' },
  communityText: { color: 'rgba(23,19,19,0.5)', fontSize: 9, lineHeight: 13, fontWeight: '700', marginTop: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  chipText: { color: 'rgba(23,19,19,0.78)', fontSize: 11, fontWeight: '900' },
  publishRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  counter: { color: 'rgba(23,19,19,0.42)', fontSize: 11, fontWeight: '700' },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#171313',
  },
  publishButtonDisabled: { opacity: 0.36 },
  publishButtonText: { color: '#FFFAF2', fontSize: 12, fontWeight: '900' },
  notice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFAF2',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  noticeText: { color: 'rgba(23,19,19,0.55)', fontSize: 12, lineHeight: 18 },
  urlBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFAF2',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  urlAuthor: { color: '#171313', fontSize: 13, fontWeight: '900' },
  urlText: { color: 'rgba(23,19,19,0.45)', fontSize: 11, marginTop: 6, lineHeight: 16 },
  toast: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#171313',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastText: { color: '#FFFAF2', fontSize: 12, fontWeight: '800' },
});

export default ShareSheet;

import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getMusicChallenge } from '@/api/client';
import type { MusicChallenge, MusicChallengeContentType, MusicChallengeDetail, MusicChallengeEntry } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { CollectionSurface, CollectionHeader, CollectionIconButton } from '@/components/mobile/CollectionUI';
import { useSurfaceColors } from '@/components/mobile/useSurfaceColors';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { SoftCard } from '@/components/ui/SoftCard';
import { radius, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { navigatePrimaryTab } from '@/navigation/navigatePrimaryTab';

const CONTENT_TYPE_LABEL: Record<MusicChallengeContentType, string> = {
  clip: 'Clip',
  variation: 'Variation IA',
  track: 'Morceau',
  open: 'Création libre',
};

function remainingLabel(status: MusicChallenge['status'], startsAt: string, endsAt: string) {
  const now = Date.now();
  if (status === 'upcoming') {
    const hours = Math.max(1, Math.round((new Date(startsAt).getTime() - now) / 3_600_000));
    return hours < 24 ? `Démarre dans ${hours} h` : `Démarre dans ${Math.ceil(hours / 24)} j`;
  }
  if (status === 'ended') return 'Terminé';
  const hours = Math.max(1, Math.round((new Date(endsAt).getTime() - now) / 3_600_000));
  return hours < 24 ? `${hours} h restantes` : `${Math.ceil(hours / 24)} j restants`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

export function ChallengeDetailScreen() {
  const colors = useSurfaceColors(); const styles = React.useMemo(() => createStyles(colors), [colors]);
  const responsive = useResponsiveLayout();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const initial = route.params?.challenge as MusicChallenge | undefined;
  const challengeId = String(route.params?.challengeId || initial?.id || '');
  const [challenge, setChallenge] = React.useState<MusicChallengeDetail | null>(initial ? { ...initial, entries: [], userHasEntry: false } : null);
  const [loading, setLoading] = React.useState(!initial);
  const [error, setError] = React.useState<string | null>(null);

  const requestId = React.useRef(0);
  const load = React.useCallback(async () => {
    const epoch = ++requestId.current;
    if (!challengeId) { setLoading(false); return; }
    setLoading(true); setChallenge(current => current?.id === challengeId ? current : null);
    setError(null);
    try {
      const next = await getMusicChallenge(challengeId);
      if (epoch === requestId.current) setChallenge(next);
    } catch (e) {
      if (epoch === requestId.current) setError(e instanceof Error ? e.message : 'Impossible de charger ce défi');
    } finally {
      if (epoch === requestId.current) setLoading(false);
    }
  }, [challengeId]);

  React.useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);

  if (loading && (!challenge || challenge.id !== challengeId)) {
    return <CollectionSurface><AppHeader title="Défi" onBack={() => navigation.goBack()} /><LoadingSkeleton rows={5} style={styles.loading} /></CollectionSurface>;
  }

  if (!challenge) {
    return (
      <CollectionSurface>
        <AppHeader title="Défi" onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <EmptyState icon="trophy-outline" title="Défi introuvable" text={error || "Ce défi n'existe plus ou n'est plus disponible."} actionLabel="Réessayer" onAction={() => void load()} />
        </View>
      </CollectionSurface>
    );
  }

  const accent = challenge.accentColor || '#D96D63';

  const handleParticipate = () => {
    if (challenge.status !== 'active') return;
    if (!auth.user) {
      navigation.navigate('Login', { returnTo: { screen: 'ChallengeDetail', params: { challengeId: challenge.id } } });
      return;
    }
    const contentType = challenge.contentType;
    if (contentType === 'clip') {
      navigation.navigate('ClipComposer', {
        sourceTrackId: challenge.sourceTrackId || undefined,
        sourceTrackType: challenge.sourceTrackType || undefined,
        challengeId: challenge.id,
      });
    } else if (contentType === 'variation') {
      navigation.navigate('AIStudio', {
        sourceTrackId: challenge.sourceTrackId || undefined,
        sourceTrackType: challenge.sourceTrackType || undefined,
        mode: 'remix',
        challengeId: challenge.id,
      });
    } else if (contentType === 'track') {
      navigation.navigate('Upload', { challengeId: challenge.id });
    } else {
      navigation.navigate('CreateHub', { challengeId: challenge.id });
    }
  };

  return (
    <CollectionSurface>
      <ScrollView
        contentContainerStyle={[styles.content, responsive.pageContent, { paddingTop: responsive.insets.top, paddingBottom: responsive.miniPlayerClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <CollectionHeader title="À toi de jouer" eyebrow="DÉFI MUSICAL" onBack={() => navigation.goBack()} />

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Ionicons name="trophy" size={20} color={colors.white} /></View>
            <View style={[styles.statusPill, challenge.status === 'active' && styles.statusPillActive]}>
              <View style={[styles.statusDot, challenge.status === 'active' && styles.statusDotActive]} />
              <Text style={styles.statusText}>{challenge.status === 'active' ? 'Défi actif' : challenge.status === 'upcoming' ? 'À venir' : 'Terminé'}</Text>
            </View>
          </View>
          <Text style={styles.kicker}>{CONTENT_TYPE_LABEL[challenge.contentType]}</Text>
          <Text style={styles.title}>{challenge.title}</Text>
          <Text style={styles.prompt}>{challenge.prompt}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}><Ionicons name="time-outline" size={13} color={colors.textSecondary} /><Text style={styles.metaText}>{remainingLabel(challenge.status, challenge.startsAt, challenge.endsAt)}</Text></View>
            <View style={styles.metaPill}><Ionicons name="people-outline" size={13} color={colors.textSecondary} /><Text style={styles.metaText}>{challenge.entryCount} participation{challenge.entryCount > 1 ? 's' : ''}</Text></View>
          </View>
          <Text style={styles.dates}>Du {formatDate(challenge.startsAt)} au {formatDate(challenge.endsAt)}</Text>

          <EntryPressable disabled={challenge.status !== 'active'} onPress={handleParticipate} style={[styles.cta, challenge.status !== 'active' && styles.ctaDisabled]}>
            <Text style={styles.ctaText}>
              {challenge.status === 'active' ? 'Participer' : challenge.status === 'upcoming' ? "Ce défi n'a pas encore commencé" : 'Ce défi est terminé'}
            </Text>
            {challenge.status === 'active' ? <Ionicons name="arrow-forward" size={16} color={colors.paper} /> : null}
          </EntryPressable>
          {challenge.userHasEntry ? <Text style={styles.userEntryNote}>Tu as déjà une participation publiée dans ce défi.</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Participations</Text>
          {challenge.entries.length === 0 ? (
            <Text style={styles.emptyText}>Aucune participation pour l'instant.</Text>
          ) : (
            <View style={styles.entries}>
              {challenge.entries.map((entry) => <EntryRow key={entry.id} entry={entry} navigation={navigation} />)}
            </View>
          )}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </CollectionSurface>
  );
}

function EntryRow({ entry, navigation }: { entry: MusicChallengeEntry; navigation: any }) {
  const colors = useSurfaceColors(); const styles = React.useMemo(() => createStyles(colors), [colors]);
  const clipId = entry.contentType === 'clip' ? entry.contentId : null;
  const canOpen = entry.contentType === 'track' || entry.contentType === 'variation' || Boolean(clipId);
  const content = (
    <>
      {entry.coverUrl ? <Image source={{ uri: entry.coverUrl }} style={styles.entryCover} /> : <View style={styles.entryCover} />}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.entryTitle}>{entry.title}</Text>
        <Text numberOfLines={1} style={styles.entrySubtitle}>{entry.name} · {CONTENT_TYPE_LABEL[entry.contentType]}</Text>
      </View>
    </>
  );
  if (!canOpen) return <View style={styles.entryRow}>{content}</View>;
  const onPress = () => {
    if (clipId) {
      navigatePrimaryTab(navigation, 'Swipe', { mode: 'clips', clipId });
    } else {
      navigation.navigate('TrackDetail', { trackId: entry.contentId });
    }
  };
  return (
    <EntryPressable accessibilityRole="button" accessibilityLabel={"Ouvrir " + entry.title} style={styles.entryRow} onPress={onPress}>
      {content}
    </EntryPressable>
  );
}

const createStyles = (colors: ReturnType<typeof useSurfaceColors>) => StyleSheet.create({
  content: { paddingBottom: 170, gap: spacing.lg, paddingHorizontal: spacing.lg },
  loading: { paddingHorizontal: spacing.lg },
  hero: { gap: 12, borderRadius: 29, backgroundColor: colors.surface, padding: 24 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 6 },
  statusPillActive: { backgroundColor: 'rgba(43,201,111,0.14)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(17,17,17,0.3)' },
  statusDotActive: { backgroundColor: '#2bc96f' },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.textSecondary },
  kicker: { marginTop: spacing.sm, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.textTertiary },
  title: { marginTop: 4, fontSize: 32, lineHeight: 38, fontWeight: '700', color: colors.text },
  prompt: { marginTop: spacing.xs, fontSize: 15, lineHeight: 24, fontWeight: '600', color: colors.textSecondary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, paddingVertical: 6 },
  metaText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  dates: { marginTop: spacing.xs, fontSize: 12, fontWeight: '700', color: colors.textTertiary },
  cta: { marginTop: spacing.md, minHeight: 52, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.violet },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: colors.paper, fontSize: 14, fontWeight: '700' },
  userEntryNote: { marginTop: spacing.sm, fontSize: 12, fontWeight: '800', color: '#168746' },
  sectionTitle: { marginBottom: spacing.sm, fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  entries: { gap: spacing.sm },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface },
  entryCover: { width: 60, height: 60, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  entryTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  entrySubtitle: { marginTop: 2, fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  error: { color: colors.danger, textAlign: 'center', fontSize: 12, fontWeight: '700' },
});

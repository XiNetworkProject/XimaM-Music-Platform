import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getMusicChallenge } from '@/api/client';
import type { MusicChallenge, MusicChallengeContentType, MusicChallengeDetail, MusicChallengeEntry } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { SynauraBackground } from '@/components/SynauraBackground';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { SoftCard } from '@/components/ui/SoftCard';
import { colors, radius, spacing } from '@/theme/tokens';

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
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const initial = route.params?.challenge as MusicChallenge | undefined;
  const challengeId = String(route.params?.challengeId || initial?.id || '');
  const [challenge, setChallenge] = React.useState<MusicChallengeDetail | null>(initial ? { ...initial, entries: [], userHasEntry: false } : null);
  const [loading, setLoading] = React.useState(!initial);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getMusicChallenge(challengeId);
      setChallenge(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger ce défi');
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  React.useEffect(() => { void load(); }, [load]);

  if (loading && !challenge) {
    return <SynauraBackground><AppHeader title="Défi" onBack={() => navigation.goBack()} /><LoadingSkeleton rows={5} style={styles.loading} /></SynauraBackground>;
  }

  if (!challenge) {
    return (
      <SynauraBackground>
        <AppHeader title="Défi" onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <EmptyState icon="trophy-outline" title="Défi introuvable" text={error || "Ce défi n'existe plus ou n'est plus disponible."} actionLabel="Réessayer" onAction={() => void load()} />
        </View>
      </SynauraBackground>
    );
  }

  const accent = challenge.accentColor || '#D96D63';

  const handleParticipate = () => {
    if (challenge.status !== 'active') return;
    if (!auth.user) {
      navigation.getParent()?.navigate('Login', { returnTo: { screen: 'ChallengeDetail', params: { challengeId: challenge.id } } });
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
    <SynauraBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Défi" onBack={() => navigation.goBack()} />

        <SoftCard style={[styles.hero, { backgroundColor: `${accent}1a` }]}>
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

          <Pressable disabled={challenge.status !== 'active'} onPress={handleParticipate} style={[styles.cta, challenge.status !== 'active' && styles.ctaDisabled]}>
            <Text style={styles.ctaText}>
              {challenge.status === 'active' ? 'Participer' : challenge.status === 'upcoming' ? "Ce défi n'a pas encore commencé" : 'Ce défi est terminé'}
            </Text>
            {challenge.status === 'active' ? <Ionicons name="arrow-forward" size={16} color={colors.paper} /> : null}
          </Pressable>
          {challenge.userHasEntry ? <Text style={styles.userEntryNote}>Tu as déjà une participation publiée dans ce défi.</Text> : null}
        </SoftCard>

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
    </SynauraBackground>
  );
}

// Le Clip n'a pas de page de detail dediee (meme convention que le web,
// resolveEntryContent() dans lib/musicChallenges.ts) : on ouvre le Scroll filtre
// sur son morceau source, dont l'id est extrait de entry.href (seule source pour
// ce champ, MusicChallengeEntry n'expose pas sourceTrackId directement).
function sourceTrackIdFromHref(href: string): string | null {
  const match = href.match(/[?&]sourceTrackId=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function EntryRow({ entry, navigation }: { entry: MusicChallengeEntry; navigation: any }) {
  const clipSourceTrackId = entry.contentType === 'clip' ? sourceTrackIdFromHref(entry.href) : null;
  const canOpen = entry.contentType === 'track' || entry.contentType === 'variation' || Boolean(clipSourceTrackId);
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
    if (clipSourceTrackId) {
      navigation.navigate('Swipe', { mode: 'clips', sourceTrackId: clipSourceTrackId });
    } else {
      navigation.navigate('TrackDetail', { trackId: entry.contentId });
    }
  };
  return (
    <Pressable style={styles.entryRow} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 170, gap: spacing.lg, paddingHorizontal: spacing.lg },
  loading: { paddingHorizontal: spacing.lg },
  hero: { gap: spacing.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(17,17,17,0.06)' },
  statusPillActive: { backgroundColor: 'rgba(43,201,111,0.14)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(17,17,17,0.3)' },
  statusDotActive: { backgroundColor: '#2bc96f' },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.textSecondary },
  kicker: { marginTop: spacing.sm, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: colors.textTertiary },
  title: { marginTop: 4, fontSize: 24, fontWeight: '900', color: colors.text },
  prompt: { marginTop: spacing.xs, fontSize: 13, lineHeight: 20, fontWeight: '600', color: colors.textSecondary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.6)' },
  metaText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  dates: { marginTop: spacing.xs, fontSize: 11, fontWeight: '700', color: colors.textTertiary },
  cta: { marginTop: spacing.md, height: 48, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.black },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: colors.paper, fontSize: 14, fontWeight: '900' },
  userEntryNote: { marginTop: spacing.sm, fontSize: 11, fontWeight: '800', color: '#168746' },
  sectionTitle: { marginBottom: spacing.sm, fontSize: 17, fontWeight: '900', color: colors.text },
  emptyText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  entries: { gap: spacing.sm },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  entryCover: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(17,17,17,0.08)' },
  entryTitle: { fontSize: 13, fontWeight: '900', color: colors.text },
  entrySubtitle: { marginTop: 2, fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  error: { color: colors.danger, textAlign: 'center', fontSize: 11, fontWeight: '700' },
});

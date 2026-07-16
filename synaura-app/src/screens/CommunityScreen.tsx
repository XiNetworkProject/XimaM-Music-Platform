import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCommunityClubs, getCommunityFaq, getUserPreferences } from '@/api/client';
import type { CommunityClubAggregate, CommunityFaq } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { useAuth } from '@/auth/AuthProvider';
import { COMMUNITY_CLUBS, getClubByCategory, type ClubConfig } from '@/community/clubs';
import { colors } from '@/theme/tokens';
import { ScreenIntro } from '@/components/ui/ScreenIntro';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { NotificationBellButton } from '@/components/notifications/NotificationBellButton';

// Intentions creatives (onboarding "Personnaliser mes gouts") qui mettent un Club
// en avant. Ne masque jamais les autres Clubs, se contente de les prioriser.
const INTENTION_TO_CLUB_SLUG: Record<string, string> = {
  remix: 'remix',
  collab: 'collab',
  create_ai: 'ai',
};

function relativeDate(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

export function CommunityScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const auth = useAuth();
  const [aggregates, setAggregates] = useState<Record<string, CommunityClubAggregate>>({});
  const [loading, setLoading] = useState(true);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqs, setFaqs] = useState<CommunityFaq[]>([]);
  const [highlightedSlugs, setHighlightedSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.requireAuth()) return;
    let mounted = true;
    getUserPreferences()
      .then((preferences) => {
        if (!mounted) return;
        const intentions: string[] = Array.isArray((preferences as any)?.onboarding?.creatorIntentions)
          ? (preferences as any).onboarding.creatorIntentions
          : [];
        setHighlightedSlugs(intentions.map((id) => INTENTION_TO_CLUB_SLUG[id]).filter((slug): slug is string => Boolean(slug)));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedClubs = useMemo(() => {
    if (!highlightedSlugs.length) return COMMUNITY_CLUBS;
    return [...COMMUNITY_CLUBS].sort((a, b) => {
      const aFav = highlightedSlugs.includes(a.slug) ? 0 : 1;
      const bFav = highlightedSlugs.includes(b.slug) ? 0 : 1;
      return aFav - bFav;
    });
  }, [highlightedSlugs]);

  // Anciennes entrées (ShareSheet, CreateHub, HomeV2) ouvraient directement le
  // composer sur "Community" avec {compose, category, track} : on les redirige vers
  // le Club correspondant, composer ouvert, plutôt que de casser ces points d'entrée.
  useEffect(() => {
    if (!route.params?.compose) return;
    const club = getClubByCategory(route.params.category) || COMMUNITY_CLUBS[0];
    navigation.navigate('ClubDetail', { slug: club.slug, compose: true, track: route.params.track });
    navigation.setParams({ compose: undefined, category: undefined, track: undefined });
  }, [navigation, route.params]);

  useEffect(() => {
    let mounted = true;
    getCommunityClubs()
      .then((clubs) => {
        if (!mounted) return;
        const map: Record<string, CommunityClubAggregate> = {};
        clubs.forEach((club) => {
          map[club.slug] = club;
        });
        setAggregates(map);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!faqOpen || faqs.length) return;
    void getCommunityFaq(20).then(setFaqs).catch(() => setFaqs([]));
  }, [faqOpen, faqs.length]);

  const openClub = useCallback((club: ClubConfig) => {
    navigation.navigate('ClubDetail', { slug: club.slug });
  }, [navigation]);

  return (
    <SynauraBackground variant="warm">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          { paddingTop: insets.top + 18, paddingBottom: Math.max(insets.bottom + 150, responsive.miniPlayerClearance) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenIntro
          eyebrow="Espace musical"
          title="Clubs"
          description="Trouve des personnes, des idées et des sons à faire évoluer ensemble."
          trailing={(
            <View style={styles.headerActions}>
              <NotificationBellButton />
              <MotionPressable accessibilityLabel="FAQ communauté" onPress={() => setFaqOpen(true)} style={styles.circleButton} scaleTo={0.9}>
                <Ionicons name="help-circle-outline" size={21} color={colors.text} />
              </MotionPressable>
              <MobileAccountButton compact />
            </View>
          )}
        />

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Chargement des Clubs...</Text>
          </View>
        ) : (
          <View style={styles.clubGrid}>
            {orderedClubs.map((club, index) => (
              <Reveal key={club.slug} delay={index * 55} distance={10}>
                <ClubCard
                  club={club}
                  aggregate={aggregates[club.slug]}
                  onPress={() => openClub(club)}
                  highlighted={highlightedSlugs.includes(club.slug)}
                />
              </Reveal>
            ))}
          </View>
        )}
      </ScrollView>

      <FaqModal visible={faqOpen} faqs={faqs} onClose={() => setFaqOpen(false)} />
    </SynauraBackground>
  );
}

function ClubCard({
  club,
  aggregate,
  onPress,
  highlighted,
}: {
  club: ClubConfig;
  aggregate?: CommunityClubAggregate;
  onPress: () => void;
  highlighted?: boolean;
}) {
  const postsCount = aggregate?.postsCount || 0;
  const latestPost = aggregate?.latestPost;

  return (
    <MotionPressable onPress={onPress} style={[styles.clubCard, highlighted && styles.clubCardHighlighted]} scaleTo={0.97}>
      {highlighted ? (
        <View style={styles.clubBadge}>
          <Text style={styles.clubBadgeText}>Pour toi</Text>
        </View>
      ) : null}
      <View style={[styles.clubAccent, { backgroundColor: club.accent }]} />
      <View style={[styles.clubIcon, { backgroundColor: club.accent }]}>
        <Ionicons name={club.icon as any} size={20} color="#FFFAF2" />
      </View>
      <Text style={styles.clubName}>{club.name}</Text>
      <Text style={styles.clubPromise}>{club.promise}</Text>

      <View style={styles.clubLatest}>
        {latestPost ? (
          <>
            <Text numberOfLines={1} style={styles.clubLatestTitle}>{latestPost.title}</Text>
            <Text numberOfLines={1} style={styles.clubLatestMeta}>{latestPost.author.name} · {relativeDate(latestPost.createdAt)}</Text>
          </>
        ) : (
          <Text style={styles.clubLatestEmpty}>Aucun post pour l'instant. Sois le premier.</Text>
        )}
      </View>

      <View style={styles.clubFooter}>
        <Text style={styles.clubCount}>{postsCount > 0 ? `${postsCount} post${postsCount > 1 ? 's' : ''}` : 'Nouveau'}</Text>
        <View style={[styles.enterButton, { backgroundColor: club.accent }]}>
          <Text style={styles.enterButtonText}>Entrer</Text>
          <Ionicons name="arrow-forward" size={13} color="#FFFAF2" />
        </View>
      </View>
    </MotionPressable>
  );
}

function FaqModal({ visible, faqs, onClose }: { visible: boolean; faqs: CommunityFaq[]; onClose: () => void }) {
  const [openId, setOpenId] = useState('');
  return (
    <BottomSheet visible={visible} onClose={onClose} title="FAQ communauté" subtitle="Les réponses aux questions fréquentes." maxHeight="84%">
        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {faqs.map((faq) => (
            <MotionPressable key={faq.id} onPress={() => setOpenId((current) => current === faq.id ? '' : faq.id)} style={styles.faqItem} scaleTo={0.99}>
              <View style={styles.faqQuestionRow}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons name={openId === faq.id ? 'chevron-up' : 'chevron-down'} size={18} color="#171313" />
              </View>
              {openId === faq.id ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
            </MotionPressable>
          ))}
          {!faqs.length ? <Text style={styles.faqEmpty}>La FAQ est vide pour le moment.</Text> : null}
        </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 20 },
  headerActions: { flexDirection: 'row', gap: 7 },
  circleButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  loadingState: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: 'rgba(23,19,19,0.5)', fontSize: 12, fontWeight: '700' },
  clubGrid: { gap: 0 },
  clubCard: { position: 'relative', overflow: 'hidden', minHeight: 188, borderRadius: 0, backgroundColor: 'transparent', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, paddingVertical: 18, paddingHorizontal: 12 },
  clubCardHighlighted: { borderColor: colors.violet, borderWidth: 1.5 },
  clubBadge: { position: 'absolute', right: 14, top: 14, zIndex: 1, borderRadius: 999, backgroundColor: colors.violet, paddingHorizontal: 9, paddingVertical: 4 },
  clubBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  clubAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  clubIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  clubName: { marginTop: 12, color: '#171313', fontSize: 20, fontWeight: '900' },
  clubPromise: { marginTop: 4, color: 'rgba(23,19,19,0.5)', fontSize: 12, lineHeight: 17, fontWeight: '700', maxWidth: '92%' },
  clubLatest: { marginTop: 12, borderRadius: 4, backgroundColor: 'rgba(23,19,19,0.035)', borderLeftWidth: 3, borderLeftColor: colors.borderStrong, padding: 10 },
  clubLatestTitle: { color: '#171313', fontSize: 12, fontWeight: '900' },
  clubLatestMeta: { marginTop: 2, color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '700' },
  clubLatestEmpty: { color: 'rgba(23,19,19,0.38)', fontSize: 11, fontWeight: '700' },
  clubFooter: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clubCount: { color: 'rgba(23,19,19,0.4)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  enterButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 9 },
  enterButtonText: { color: '#FFFAF2', fontSize: 12, fontWeight: '900' },
  modalContent: { paddingHorizontal: 18, paddingBottom: 12, gap: 10 },
  faqItem: { paddingVertical: 14, borderRadius: 0, backgroundColor: 'transparent', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(23,19,19,0.14)' },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  faqQuestion: { flex: 1, color: '#171313', fontSize: 14, fontWeight: '900' },
  faqAnswer: { color: 'rgba(23,19,19,0.62)', fontSize: 12, lineHeight: 19, fontWeight: '600', marginTop: 12 },
  faqEmpty: { color: 'rgba(23,19,19,0.52)', fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
});

export default CommunityScreen;

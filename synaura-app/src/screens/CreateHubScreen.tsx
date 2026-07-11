import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SynauraBackground } from '@/components/SynauraBackground';
import { CreateArrivalBanner } from '@/components/create/CreateArrivalBanner';
import { useAuth } from '@/auth/AuthProvider';
import { getMusicChallenge, getUserPreferences } from '@/api/client';
import { colors } from '@/theme/tokens';
import { AppHeader } from '@/components/ui/AppHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BreathingView, MotionPressable, Reveal } from '@/components/motion/Motion';

// Suggestion discrete basee sur l'intention creative choisie a l'onboarding
// (Personnaliser mes gouts). N'importe jamais les autres options du Hub.
type IntentionSuggestion = { route: string; title: string; text: string; icon: string; tint: string };

const INTENTION_SUGGESTIONS: Record<string, IntentionSuggestion> = {
  create_ai: { route: 'AIStudio', title: "Créer avec l'IA", text: 'Basé sur ce que tu as choisi à ton arrivée.', icon: 'sparkles', tint: colors.violet },
  publish: { route: 'Upload', title: 'Publier un morceau', text: 'Basé sur ce que tu as choisi à ton arrivée.', icon: 'cloud-upload-outline', tint: colors.gold },
  clips: { route: 'ClipComposer', title: 'Publier un Clip', text: 'Basé sur ce que tu as choisi à ton arrivée.', icon: 'film-outline', tint: colors.coral },
  remix: { route: 'CreateVariation', title: 'Créer une variation', text: 'Basé sur ce que tu as choisi à ton arrivée.', icon: 'color-wand-outline', tint: colors.cyan },
};
const INTENTION_PRIORITY = ['create_ai', 'publish', 'clips', 'remix'];

const secondaryActions = [
  { title: 'Publier un morceau', text: 'Partage un titre que tu as déjà créé.', icon: 'cloud-upload-outline', tint: colors.gold, route: 'Upload' },
  { title: 'Publier un Clip', text: 'Fais vivre un son avec une vidéo verticale.', icon: 'film-outline', tint: colors.coral, route: 'ClipComposer' },
  { title: 'Créer une variation', text: 'Transforme un morceau Synaura autorisé.', icon: 'color-wand-outline', tint: colors.cyan, route: 'CreateVariation' },
] as const;

const communityActions = [
  { title: 'Demander un avis', text: 'Obtiens des retours utiles', icon: 'chatbubbles-outline', tint: colors.coral, params: { compose: true, category: 'feedback' } },
  { title: 'Chercher une collab', text: 'Trouve une voix, un beatmaker ou un feat', icon: 'people-outline', tint: colors.violet, params: { compose: true, category: 'collab' } },
  { title: 'Lancer un défi remix', text: 'Propose une source à transformer', icon: 'repeat-outline', tint: colors.cyan, params: { compose: true, category: 'remix' } },
] as const;

export function CreateHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [suggestion, setSuggestion] = useState<IntentionSuggestion | null>(null);
  const challengeId: string = route.params?.challengeId || '';
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!challengeId) return;
    let mounted = true;
    getMusicChallenge(challengeId).then((next) => mounted && setChallengeTitle(next.title)).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [challengeId]);

  useEffect(() => {
    if (!auth.requireAuth()) return;
    let mounted = true;
    getUserPreferences()
      .then((preferences) => {
        if (!mounted) return;
        const intentions: string[] = Array.isArray((preferences as any)?.onboarding?.creatorIntentions)
          ? (preferences as any).onboarding.creatorIntentions
          : [];
        const matched = INTENTION_PRIORITY.find((id) => intentions.includes(id));
        setSuggestion(matched ? INTENTION_SUGGESTIONS[matched] : null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (routeName: string, params?: Record<string, unknown>) => {
    void Haptics.selectionAsync();
    navigation.navigate(routeName, challengeId ? { ...params, challengeId } : params);
  };

  return (
    <SynauraBackground variant="warm">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: 0, paddingBottom: insets.bottom + 112 }]}
      >
        <AppHeader flush eyebrow="Ton espace créatif" title="Créer" subtitle="Commence par une idée, un fichier ou un morceau Synaura." onBack={() => navigation.goBack()} />

        {challengeId ? <CreateArrivalBanner context="challenge" title={challengeTitle} /> : null}

        {suggestion ? (
          <MotionPressable onPress={() => open(suggestion.route)} style={styles.suggestionRow} scaleTo={0.985}>
            <View style={[styles.suggestionIcon, { backgroundColor: colors.violet }]}>
              <Ionicons name={suggestion.icon as any} size={17} color="#FFFFFF" />
            </View>
            <View style={styles.suggestionCopy}>
              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              <Text style={styles.suggestionText}>{suggestion.text}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.violet} />
          </MotionPressable>
        ) : null}

        <Reveal distance={8} scaleFrom={0.99}>
        <MotionPressable onPress={() => open('AIStudio')} style={styles.studioShell} scaleTo={0.985}>
          <LinearGradient
            colors={['#111111', '#292431', '#1E3D40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.studioHero}
          >
            <View style={styles.studioTop}>
              <View>
                <Text style={styles.studioKicker}>STUDIO IA</Text>
                <Text style={styles.studioStatus}>Prêt à composer</Text>
              </View>
              <BreathingView style={styles.studioOrb} scaleTo={1.06}>
                <Ionicons name="sparkles" size={21} color={colors.paper} />
              </BreathingView>
            </View>
            <Text style={styles.studioTitle}>Créer avec l'IA</Text>
            <Text style={styles.studioText}>Imagine un morceau à partir d'une idée.</Text>
            <View style={styles.studioButton}>
              <Text style={styles.studioButtonText}>Entrer dans le Studio</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.text} />
            </View>
          </LinearGradient>
        </MotionPressable>
        </Reveal>

        <View style={styles.actionList}>
          {secondaryActions.map((action) => (
            <ActionRow
              key={action.title}
              {...action}
              onPress={() => open(action.route)}
            />
          ))}
        </View>

        <SectionHeader title="Crée avec les autres" subtitle="Demande un regard, trouve une collaboration ou lance un défi." />
        <View style={styles.actionList}>
          {communityActions.map((action) => (
            <ActionRow
              key={action.title}
              {...action}
              onPress={() => open('Community', action.params)}
            />
          ))}
        </View>
      </ScrollView>
    </SynauraBackground>
  );
}

function ActionRow({ title, text, icon, tint, onPress }: { title: string; text: string; icon: string; tint: string; onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={styles.actionRow} scaleTo={0.985}>
      <View style={[styles.actionIcon, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon as any} size={22} color={tint} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{text}</Text>
      </View>
      <View style={styles.actionArrow}>
        <Ionicons name="arrow-forward" size={17} color={colors.text} />
      </View>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  back: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  headerCopy: { flex: 1 },
  kicker: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { marginTop: 2, color: colors.text, fontSize: 25, lineHeight: 28, fontWeight: '900' },
  logoButton: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  logo: { width: 43, height: 43 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 9,
    padding: 11,
    backgroundColor: 'rgba(115,87,198,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(115,87,198,0.2)',
  },
  suggestionIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  suggestionCopy: { flex: 1, minWidth: 0 },
  suggestionTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  suggestionText: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  studioShell: { borderRadius: 12, overflow: 'hidden' },
  studioHero: { minHeight: 238, padding: 16, justifyContent: 'flex-end' },
  studioTop: { position: 'absolute', left: 19, right: 19, top: 18, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  studioKicker: { color: '#E7DBFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  studioStatus: { marginTop: 5, color: 'rgba(255,250,242,0.5)', fontSize: 11, fontWeight: '800' },
  studioOrb: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  studioTitle: { maxWidth: 310, color: colors.paper, fontSize: 24, lineHeight: 27, fontWeight: '900' },
  studioText: { marginTop: 9, maxWidth: 310, color: 'rgba(255,250,242,0.56)', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  studioButton: { marginTop: 14, minHeight: 46, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, paddingHorizontal: 17, backgroundColor: colors.paper },
  studioButtonText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  sectionTitle: { marginTop: 13, marginBottom: 2 },
  sectionEyebrow: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  sectionHeading: { marginTop: 4, color: colors.text, fontSize: 22, lineHeight: 25, fontWeight: '900' },
  actionList: { gap: 8 },
  actionRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 9, padding: 10, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: colors.border },
  actionIcon: { width: 50, height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  actionText: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  actionArrow: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.055)' },
});

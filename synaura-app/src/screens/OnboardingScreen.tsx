import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SynauraBackground } from '@/components/SynauraBackground';
import { colors } from '@/theme/tokens';
import { getUserPreferences, updateUserPreferences } from '@/api/client';
import {
  CREATOR_INTENTIONS,
  ONBOARDING_UNIVERSES,
  deriveTasteFromUniverses,
  parseOnboardingPreferences,
  universeIdsFromTaste,
  type CreatorIntentionId,
  type OnboardingUniverseId,
} from '@/onboarding/options';

const UNIVERSE_ICON: Record<OnboardingUniverseId, keyof typeof Ionicons.glyphMap> = {
  pop: 'musical-notes-outline',
  rap: 'mic-outline',
  electro: 'pulse-outline',
  club: 'flash-outline',
  night: 'moon-outline',
  focus: 'leaf-outline',
  rock: 'musical-notes-outline',
  ai: 'sparkles-outline',
};

const INTENTION_ICON: Record<CreatorIntentionId, keyof typeof Ionicons.glyphMap> = {
  discover: 'compass-outline',
  follow: 'person-add-outline',
  create_ai: 'sparkles-outline',
  publish: 'cloud-upload-outline',
  clips: 'film-outline',
  remix: 'color-wand-outline',
  collab: 'people-outline',
};

type OnboardingRouteParams = {
  edit?: boolean;
  returnTo?: { screen: string; params?: Record<string, unknown> };
};

export function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params: OnboardingRouteParams = route.params || {};
  const isEdit = Boolean(params.edit);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(isEdit ? 2 : 1);
  const [universes, setUniverses] = useState<OnboardingUniverseId[]>([]);
  const [intentions, setIntentions] = useState<CreatorIntentionId[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset (pas navigate) pour les sorties "racine" : Onboarding a pu etre l'ecran
  // initial du stack (session restauree non terminee, ou premiere connexion), donc
  // naviguer simplement empilerait Tabs par-dessus et laisserait un retour arriere
  // possible vers Onboarding. Le mode edition reste un goBack classique : l'utilisateur
  // venait deja de l'interieur de Tabs (bouton "Mes gouts" du profil) et doit y revenir
  // exactement ou il etait.
  const goToTarget = () => {
    if (params.returnTo?.screen) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs', params: { screen: params.returnTo.screen, params: params.returnTo.params } }],
      });
      return;
    }
    if (isEdit && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Swipe' } }] });
  };

  useEffect(() => {
    let mounted = true;
    getUserPreferences()
      .then((preferences) => {
        if (!mounted) return;
        const prefs = parseOnboardingPreferences((preferences as any)?.onboarding);
        if (isEdit) {
          setUniverses(universeIdsFromTaste(prefs.favoriteMoods, prefs.favoriteGenres));
          setIntentions(prefs.creatorIntentions);
        } else if (prefs.onboardingCompleted) {
          goToTarget();
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleUniverse = (id: OnboardingUniverseId) => {
    setUniverses((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleIntention = (id: CreatorIntentionId) => {
    setIntentions((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const finish = async () => {
    setSaving(true);
    const { favoriteMoods, favoriteGenres } = deriveTasteFromUniverses(universes);
    try {
      await updateUserPreferences({
        onboarding: {
          onboardingCompleted: true,
          favoriteMoods,
          favoriteGenres,
          creatorIntentions: intentions,
          completedAt: new Date().toISOString(),
        },
      });
    } catch {}
    setSaving(false);
    goToTarget();
  };

  const skipEverything = async () => {
    setSaving(true);
    try {
      await updateUserPreferences({
        onboarding: {
          onboardingCompleted: true,
          favoriteMoods: [],
          favoriteGenres: [],
          creatorIntentions: [],
          completedAt: new Date().toISOString(),
        },
      });
    } catch {}
    setSaving(false);
    goToTarget();
  };

  const universeLabels = universes
    .map((id) => ONBOARDING_UNIVERSES.find((o) => o.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const intentionLabels = intentions
    .map((id) => CREATOR_INTENTIONS.find((c) => c.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  if (!ready) {
    return (
      <SynauraBackground variant="warm">
        <View style={styles.loadingFill}>
          <ActivityIndicator color={colors.violet} />
        </View>
      </SynauraBackground>
    );
  }

  return (
    <SynauraBackground variant="warm">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((value) => (
            <View
              key={value}
              style={[
                styles.progressDot,
                { width: value === step ? 26 : 8, backgroundColor: value <= step ? colors.violet : 'rgba(17,17,17,0.12)' },
              ]}
            />
          ))}
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <View style={styles.centered}>
              <View style={styles.iconBadge}>
                <Ionicons name="sparkles" size={26} color={colors.violet} />
              </View>
              <Text style={styles.title}>Entre dans ton univers musical.</Text>
              <Text style={styles.subtitle}>Choisis ce que tu veux écouter, créer et faire évoluer sur Synaura.</Text>
              <Pressable style={styles.primaryButton} onPress={() => setStep(2)}>
                <Text style={styles.primaryText}>Personnaliser mon expérience</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFAF2" />
              </Pressable>
              <Pressable onPress={skipEverything} disabled={saving} style={styles.skipLink}>
                <Text style={styles.skipText}>Passer pour l&apos;instant</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <StepHeader
                onBack={isEdit ? undefined : () => setStep(1)}
                eyebrow="Étape 1 sur 2"
                title="Tes univers"
                subtitle="Choisis un ou plusieurs univers. Ça reste modifiable à tout moment."
              />
              <View style={styles.grid}>
                {ONBOARDING_UNIVERSES.map((option) => {
                  const active = universes.includes(option.id);
                  return (
                    <Pressable key={option.id} onPress={() => toggleUniverse(option.id)} style={[styles.tile, active && styles.tileActive]}>
                      <View style={[styles.tileIcon, active && styles.tileIconActive]}>
                        <Ionicons name={UNIVERSE_ICON[option.id]} size={18} color={active ? '#FFFFFF' : colors.text} />
                      </View>
                      <Text style={styles.tileLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helper}>Choisis au moins un univers pour un Pour toi plus précis (facultatif).</Text>
              <StepFooter onContinue={() => setStep(3)} onSkip={() => setStep(3)} label="Continuer" />
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <StepHeader
                onBack={() => setStep(2)}
                eyebrow="Étape 2 sur 2"
                title="Ce que tu veux faire"
                subtitle="Ça personnalise tes raccourcis. Rien n'est jamais caché définitivement."
              />
              <View style={styles.list}>
                {CREATOR_INTENTIONS.map((option) => {
                  const active = intentions.includes(option.id);
                  return (
                    <Pressable key={option.id} onPress={() => toggleIntention(option.id)} style={[styles.row, active && styles.rowActive]}>
                      <View style={[styles.rowIcon, active && styles.tileIconActive]}>
                        <Ionicons name={INTENTION_ICON[option.id]} size={16} color={active ? '#FFFFFF' : colors.text} />
                      </View>
                      <Text style={styles.rowLabel}>{option.label}</Text>
                      {active ? <Ionicons name="checkmark" size={16} color={colors.violet} /> : null}
                    </Pressable>
                  );
                })}
              </View>
              <StepFooter onContinue={() => setStep(4)} onSkip={() => setStep(4)} label="Continuer" />
            </View>
          ) : null}

          {step === 4 ? (
            <View>
              <StepHeader
                onBack={() => setStep(3)}
                eyebrow="Résumé"
                title="C'est prêt"
                subtitle="Tu peux modifier ces choix à tout moment depuis ton profil."
              />
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryLabel}>Tes univers</Text>
                <Text style={styles.summaryValue}>
                  {universeLabels.length ? universeLabels.join(', ') : "Tu n'as choisi aucun univers pour l'instant."}
                </Text>
              </View>
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryLabel}>Tu veux surtout</Text>
                <Text style={styles.summaryValue}>{intentionLabels.length ? intentionLabels.join(', ') : "Tu n'as encore rien précisé."}</Text>
              </View>
              <Pressable style={[styles.primaryButton, styles.fullWidth]} onPress={finish} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#FFFAF2" />
                ) : (
                  <>
                    <Text style={styles.primaryText}>{isEdit ? 'Enregistrer' : 'Ouvrir Pour toi'}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFAF2" />
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SynauraBackground>
  );
}

function StepHeader({
  onBack,
  eyebrow,
  title,
  subtitle,
}: {
  onBack?: () => void;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={14} color="rgba(17,17,17,0.55)" />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
      ) : null}
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>
    </View>
  );
}

function StepFooter({ onContinue, onSkip, label }: { onContinue: () => void; onSkip: () => void; label: string }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Pressable style={[styles.primaryButton, styles.fullWidth]} onPress={onContinue}>
        <Text style={styles.primaryText}>{label}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFAF2" />
      </Pressable>
      <Pressable onPress={onSkip} style={styles.skipLink}>
        <Text style={styles.skipText}>Passer cette étape</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 18, justifyContent: 'center' },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 18 },
  progressDot: { height: 6, borderRadius: 3 },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#D8CBB8',
    backgroundColor: 'rgba(255,255,255,0.96)',
    padding: 22,
    shadowColor: '#2C2113',
    shadowOpacity: 0.14,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  centered: { alignItems: 'center' },
  iconBadge: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.12)' },
  title: { marginTop: 16, fontSize: 24, lineHeight: 30, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { marginTop: 10, fontSize: 13, lineHeight: 19, fontWeight: '700', color: colors.textSecondary, textAlign: 'center', maxWidth: 320 },
  primaryButton: {
    marginTop: 26,
    height: 50,
    borderRadius: 17,
    backgroundColor: '#171313',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
  },
  fullWidth: { width: '100%', marginTop: 0 },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  skipLink: { marginTop: 14, alignItems: 'center' },
  skipText: { color: 'rgba(17,17,17,0.42)', fontSize: 12, fontWeight: '900' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(17,17,17,0.05)',
    marginBottom: 14,
  },
  backText: { color: 'rgba(17,17,17,0.55)', fontSize: 11, fontWeight: '900' },
  eyebrow: { color: colors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  stepTitle: { marginTop: 6, fontSize: 22, lineHeight: 27, fontWeight: '900', color: colors.text },
  stepSubtitle: { marginTop: 6, fontSize: 12, lineHeight: 18, fontWeight: '700', color: colors.textSecondary },
  grid: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '47%',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 8,
  },
  tileActive: { borderColor: colors.violet, backgroundColor: 'rgba(115,87,198,0.08)' },
  tileIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.06)' },
  tileIconActive: { backgroundColor: colors.violet },
  tileLabel: { fontSize: 12, fontWeight: '900', color: colors.text, textAlign: 'center' },
  helper: { marginTop: 14, fontSize: 11, fontWeight: '700', color: 'rgba(17,17,17,0.42)', textAlign: 'center' },
  list: { marginTop: 4, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    backgroundColor: '#FFFFFF',
  },
  rowActive: { borderColor: colors.violet, backgroundColor: 'rgba(115,87,198,0.08)' },
  rowIcon: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.06)' },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.text },
  summaryBlock: { marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: 'rgba(17,17,17,0.03)', borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)' },
  summaryLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(17,17,17,0.42)' },
  summaryValue: { marginTop: 6, fontSize: 13, fontWeight: '800', color: colors.text },
});

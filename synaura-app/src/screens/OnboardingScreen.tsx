import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SynauraBackground } from '@/components/SynauraBackground';
import { SynauraIntroStage } from '@/components/onboarding/SynauraIntroStage';
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
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useNativeNotifications } from '@/notifications/NativeNotificationsProvider';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

const UNIVERSE_ICON: Record<OnboardingUniverseId, keyof typeof Ionicons.glyphMap> = {
  pop: 'musical-notes-outline',
  rap: 'mic-outline',
  electro: 'pulse-outline',
  club: 'flash-outline',
  night: 'moon-outline',
  focus: 'leaf-outline',
  rock: 'radio-outline',
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
  const layout = useResponsiveLayout();
  const nativeNotifications = useNativeNotifications();
  const mobileSettings = useMobileSettings();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(isEdit ? 2 : 1);
  const [universes, setUniverses] = useState<OnboardingUniverseId[]>([]);
  const [intentions, setIntentions] = useState<CreatorIntentionId[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

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
    // Le routage de sortie est volontairement fige a l'ouverture de l'ecran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleUniverse = (id: OnboardingUniverseId) => {
    void Haptics.selectionAsync().catch(() => {});
    setUniverses((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleIntention = (id: CreatorIntentionId) => {
    void Haptics.selectionAsync().catch(() => {});
    setIntentions((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const savePreferences = async (skip = false) => {
    setSaving(true);
    const { favoriteMoods, favoriteGenres } = skip
      ? { favoriteMoods: [], favoriteGenres: [] }
      : deriveTasteFromUniverses(universes);
    try {
      await updateUserPreferences({
        onboarding: {
          onboardingCompleted: true,
          favoriteMoods,
          favoriteGenres,
          creatorIntentions: skip ? [] : intentions,
          completedAt: new Date().toISOString(),
        },
      });
    } catch {}
    setSaving(false);
    goToTarget();
  };

  const activateNotifications = async () => {
    const enabled = await nativeNotifications.enable();
    await mobileSettings.updateSettings({ pushDevice: enabled });
  };

  const universeLabels = universes
    .map((id) => ONBOARDING_UNIVERSES.find((option) => option.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const intentionLabels = intentions
    .map((id) => CREATOR_INTENTIONS.find((option) => option.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const optionWidth: DimensionValue = layout.gridColumns === 3 ? '31.5%' : layout.gridColumns === 2 ? '48%' : '100%';

  if (!ready) {
    return (
      <SynauraBackground variant="warm">
        <View style={styles.loadingFill}>
          <View style={styles.loadingMark}><Ionicons name="musical-notes" size={22} color="#FFFFFF" /></View>
          <ActivityIndicator color={colors.violet} />
        </View>
      </SynauraBackground>
    );
  }

  return (
    <SynauraBackground variant="warm">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          layout.pageContent,
          {
            maxWidth: 760,
            paddingTop: layout.insets.top + 12,
            paddingBottom: layout.insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.brandMark}><Ionicons name="musical-notes" size={15} color="#FFFFFF" /></View>
            <View>
              <Text style={styles.brandName}>Synaura</Text>
              <Text style={styles.brandContext}>{isEdit ? 'Mes préférences' : 'Premiers pas'}</Text>
            </View>
          </View>
          {isEdit ? (
            <Pressable accessibilityLabel="Fermer" onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Ionicons name="close" size={19} color={colors.text} />
            </Pressable>
          ) : (
            <Pressable disabled={saving} onPress={() => void savePreferences(true)} style={styles.topSkip}>
              <Text style={styles.topSkipText}>Plus tard</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.progressHead}>
          <Text style={styles.progressLabel}>{step === 1 ? 'Bienvenue' : step === 2 ? 'Univers' : step === 3 ? 'Envies' : 'Terminé'}</Text>
          <Text style={styles.progressCount}>{step} / 4</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${step * 25}%` }]} />
        </View>

        <Reveal key={step} distance={8} scaleFrom={0.994} duration={320} style={styles.step}>
          {step === 1 ? (
            <View>
              <View style={[styles.introStage, {
                height: layout.isPhoneLandscape
                  ? Math.max(176, Math.min(220, layout.usableHeight * 0.56))
                  : layout.isVeryShort
                    ? 210
                    : Math.min(360, Math.max(250, layout.availableContentWidth * 0.72)),
              }]}>
                <SynauraIntroStage scene="synaura" compact={layout.isShort} style={styles.stageFill} />
              </View>
              <View style={styles.introCopy}>
                <Text style={styles.eyebrow}>Ton Synaura commence ici</Text>
                <Text maxFontSizeMultiplier={1.18} style={[styles.introTitle, layout.isNarrow && styles.introTitleNarrow]}>Fais de l’app un univers qui te ressemble.</Text>
                <Text style={styles.introText}>Quelques choix suffisent pour mieux organiser Découvrir, le Radar et tes raccourcis de création. Tu pourras tout modifier ensuite.</Text>
                <View style={styles.introSignals}>
                  <IntroSignal icon="compass-outline" text="Des découvertes plus proches de tes goûts" />
                  <IntroSignal icon="radio-outline" text="Un Radar qui garde sa place aux nouveaux sons" />
                  <IntroSignal icon="sparkles-outline" text="Des accès rapides adaptés à ce que tu veux faire" />
                </View>
                <MotionPressable style={styles.primaryButton} onPress={() => setStep(2)} scaleTo={0.97}>
                  <Text style={styles.primaryText}>Personnaliser mon expérience</Text>
                  <Ionicons name="arrow-forward" size={17} color="#F7F6F3" />
                </MotionPressable>
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <StepHeader
                onBack={isEdit ? undefined : () => setStep(1)}
                eyebrow="Tes univers musicaux"
                title="Qu’est-ce qui t’attire en premier ?"
                subtitle="Choisis librement. Il n’y a ni minimum ni mauvais choix."
                selected={universes.length}
              />
              <View style={[styles.grid, layout.compactControls && styles.gridCompact]}>
                {ONBOARDING_UNIVERSES.map((option) => {
                  const active = universes.includes(option.id);
                  return (
                    <MotionPressable
                      key={option.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      onPress={() => toggleUniverse(option.id)}
                      style={[styles.tile, layout.compactControls && styles.tileCompact, { width: optionWidth }, active && styles.tileActive]}
                      scaleTo={0.97}
                    >
                      <View style={[styles.tileIcon, active && styles.tileIconActive]}>
                        <Ionicons name={UNIVERSE_ICON[option.id]} size={19} color={active ? '#FFFFFF' : colors.text} />
                      </View>
                      <Text numberOfLines={2} style={styles.tileLabel}>{option.label}</Text>
                      <View style={[styles.check, active && styles.checkActive]}>
                        {active ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                      </View>
                    </MotionPressable>
                  );
                })}
              </View>
              <StepFooter onContinue={() => setStep(3)} onSkip={() => setStep(3)} />
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <StepHeader
                onBack={() => setStep(2)}
                eyebrow="Ton usage"
                title="Que veux-tu faire sur Synaura ?"
                subtitle="Ces choix mettent les bons chemins à portée de main sans masquer le reste."
                selected={intentions.length}
              />
              <View style={styles.intentions}>
                {CREATOR_INTENTIONS.map((option) => {
                  const active = intentions.includes(option.id);
                  return (
                    <MotionPressable
                      key={option.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      onPress={() => toggleIntention(option.id)}
                      style={[styles.intention, layout.isTablet && styles.intentionTablet, layout.compactControls && styles.intentionCompact, active && styles.intentionActive]}
                      scaleTo={0.985}
                    >
                      <View style={[styles.intentionIcon, active && styles.intentionIconActive]}>
                        <Ionicons name={INTENTION_ICON[option.id]} size={17} color={active ? '#FFFFFF' : colors.text} />
                      </View>
                      <Text style={styles.intentionLabel}>{option.label}</Text>
                      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={active ? colors.violet : colors.borderStrong} />
                    </MotionPressable>
                  );
                })}
              </View>
              <StepFooter onContinue={() => setStep(4)} onSkip={() => setStep(4)} />
            </View>
          ) : null}

          {step === 4 ? (
            <View>
              <StepHeader
                onBack={() => setStep(3)}
                eyebrow="Ton expérience"
                title="Synaura est prêt pour toi."
                subtitle="Tes choix restent privés et modifiables depuis ton profil."
              />
              <View style={styles.summaryHero}>
                <View style={styles.summaryIcon}><Ionicons name="checkmark" size={26} color="#FFFFFF" /></View>
                <View style={styles.summaryHeroCopy}>
                  <Text style={styles.summaryHeroTitle}>Tout est en place</Text>
                  <Text style={styles.summaryHeroText}>Ouvre ton fil et commence à écouter.</Text>
                </View>
              </View>
              <SummaryBlock icon="musical-notes-outline" label="Univers" value={universeLabels.length ? universeLabels.join(', ') : 'Découverte libre, sans filtre'} />
              <SummaryBlock icon="sparkles-outline" label="Envies" value={intentionLabels.length ? intentionLabels.join(', ') : 'Tous les chemins restent disponibles'} />
              <View style={[styles.notificationCard, (layout.isTiny || layout.hasLargeText) && styles.notificationCardStacked]}>
                <View style={[styles.notificationIcon, nativeNotifications.status === 'ready' && styles.notificationIconReady]}>
                  <Ionicons name={nativeNotifications.status === 'ready' ? 'checkmark' : 'notifications-outline'} size={20} color="#FFFFFF" />
                </View>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationTitle}>{nativeNotifications.status === 'ready' ? 'Notifications activées' : 'Ne rate pas les moments importants'}</Text>
                  <Text style={styles.notificationText}>{nativeNotifications.status === 'ready' ? 'Ce téléphone est relié à ton activité Synaura.' : 'Commentaires, nouveaux abonnés, sorties et variations à valider.'}</Text>
                  {nativeNotifications.error ? <Text style={styles.notificationError}>{nativeNotifications.error}</Text> : null}
                </View>
                {nativeNotifications.status !== 'ready' ? (
                  <Pressable disabled={nativeNotifications.status === 'requesting'} onPress={() => void activateNotifications()} style={[styles.notificationAction, (layout.isTiny || layout.hasLargeText) && styles.notificationActionStacked]}>
                    {nativeNotifications.status === 'requesting' ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.notificationActionText}>Activer</Text>}
                  </Pressable>
                ) : null}
              </View>
              <MotionPressable style={styles.primaryButton} onPress={() => void savePreferences(false)} disabled={saving} scaleTo={0.97}>
                {saving ? <ActivityIndicator color="#F7F6F3" /> : (
                  <>
                    <Text style={styles.primaryText}>{isEdit ? 'Enregistrer mes choix' : 'Entrer dans Synaura'}</Text>
                    <Ionicons name="arrow-forward" size={17} color="#F7F6F3" />
                  </>
                )}
              </MotionPressable>
            </View>
          ) : null}
        </Reveal>
      </ScrollView>
    </SynauraBackground>
  );
}

function IntroSignal({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.introSignal}>
      <View style={styles.introSignalIcon}><Ionicons name={icon} size={15} color={colors.violet} /></View>
      <Text style={styles.introSignalText}>{text}</Text>
    </View>
  );
}

function StepHeader({ onBack, eyebrow, title, subtitle, selected }: { onBack?: () => void; eyebrow: string; title: string; subtitle: string; selected?: number }) {
  return (
    <View style={styles.stepHeader}>
      {onBack ? (
        <Pressable accessibilityLabel="Retour" onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={17} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.stepEyebrowRow}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {selected != null ? <Text style={styles.selectedCount}>{selected} choisi{selected > 1 ? 's' : ''}</Text> : null}
      </View>
      <Text maxFontSizeMultiplier={1.18} style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>
    </View>
  );
}

function StepFooter({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  return (
    <View style={styles.stepFooter}>
      <MotionPressable style={styles.primaryButton} onPress={onContinue} scaleTo={0.97}>
        <Text style={styles.primaryText}>Continuer</Text>
        <Ionicons name="arrow-forward" size={17} color="#F7F6F3" />
      </MotionPressable>
      <Pressable onPress={onSkip} style={styles.skipStep}>
        <Text style={styles.skipStepText}>Continuer sans sélectionner</Text>
      </Pressable>
    </View>
  );
}

function SummaryBlock({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.summaryBlock}>
      <View style={styles.summaryBlockIcon}><Ionicons name={icon} size={18} color={colors.violet} /></View>
      <View style={styles.summaryBlockCopy}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingMark: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  content: { flexGrow: 1 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  brandName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  brandContext: { marginTop: 1, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  closeButton: { width: 40, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  topSkip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  topSkipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  progressHead: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { color: colors.text, fontSize: 10, fontWeight: '900' },
  progressCount: { color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  progressTrack: { height: 4, marginTop: 8, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.surfaceMuted },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.violet },
  step: { marginTop: 18 },
  introStage: { overflow: 'hidden', borderRadius: 20, backgroundColor: colors.black },
  stageFill: { flex: 1, minHeight: 0 },
  introCopy: { paddingTop: 22 },
  eyebrow: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  introTitle: { marginTop: 7, maxWidth: 560, color: colors.text, fontSize: 29, lineHeight: 34, fontWeight: '900' },
  introTitleNarrow: { fontSize: 25, lineHeight: 30 },
  introText: { marginTop: 10, maxWidth: 580, color: colors.textSecondary, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  introSignals: { marginTop: 18, gap: 8 },
  introSignal: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  introSignalIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  introSignalText: { flex: 1, color: colors.text, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  primaryButton: { width: '100%', minHeight: 54, marginTop: 22, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16, backgroundColor: colors.violet },
  primaryText: { flexShrink: 1, color: '#F7F6F3', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  stepHeader: { marginBottom: 20 },
  backButton: { width: 42, height: 42, marginBottom: 16, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  stepEyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  selectedCount: { color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  stepTitle: { marginTop: 7, maxWidth: 590, color: colors.text, fontSize: 27, lineHeight: 32, fontWeight: '900' },
  stepSubtitle: { marginTop: 8, maxWidth: 560, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCompact: { gap: 8 },
  tile: { minHeight: 112, position: 'relative', alignItems: 'flex-start', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, backgroundColor: colors.surface },
  tileCompact: { minHeight: 92, padding: 10 },
  tileActive: { borderColor: colors.violet, backgroundColor: colors.violetSoft },
  tileIcon: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  tileIconActive: { backgroundColor: colors.violet },
  tileLabel: { maxWidth: '88%', color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '900' },
  check: { position: 'absolute', right: 10, top: 10, width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong },
  checkActive: { borderColor: colors.violet, backgroundColor: colors.violet },
  intentions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intention: { width: '100%', minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, backgroundColor: colors.surface },
  intentionCompact: { minHeight: 52 },
  intentionTablet: { width: '49%' },
  intentionActive: { borderColor: colors.violet, backgroundColor: colors.violetSoft },
  intentionIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  intentionIconActive: { backgroundColor: colors.violet },
  intentionLabel: { flex: 1, minWidth: 0, color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  stepFooter: { marginTop: 2 },
  skipStep: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipStepText: { color: colors.textTertiary, fontSize: 10, fontWeight: '800' },
  summaryHero: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 20, padding: 14, backgroundColor: colors.black },
  summaryIcon: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  summaryHeroCopy: { flex: 1, minWidth: 0 },
  summaryHeroTitle: { color: '#F7F6F3', fontSize: 17, fontWeight: '900' },
  summaryHeroText: { marginTop: 4, color: 'rgba(247,246,243,0.62)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  summaryBlock: { minHeight: 68, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  summaryBlockIcon: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  summaryBlockCopy: { flex: 1, minWidth: 0 },
  summaryLabel: { color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  summaryValue: { marginTop: 4, color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  notificationCard: { minHeight: 78, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 11, backgroundColor: colors.surface },
  notificationCardStacked: { flexWrap: 'wrap', alignItems: 'flex-start' },
  notificationIcon: { width: 40, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  notificationIconReady: { backgroundColor: colors.cyan },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationTitle: { color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '900' },
  notificationText: { marginTop: 3, color: colors.textSecondary, fontSize: 9, lineHeight: 13, fontWeight: '700' },
  notificationError: { marginTop: 4, color: colors.coral, fontSize: 8, lineHeight: 12, fontWeight: '800' },
  notificationAction: { minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 11, backgroundColor: colors.violetSoft },
  notificationActionStacked: { width: '100%', marginTop: 2 },
  notificationActionText: { color: colors.text, fontSize: 9, fontWeight: '900' },
});

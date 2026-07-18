import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
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
      <View style={styles.screen}>
        <StatusBar style="dark" backgroundColor="#F7F6F3" />
        <View style={styles.loadingFill}>
          <View style={styles.loadingMark}><Ionicons name="musical-notes" size={22} color="#FFFFFF" /></View>
          <ActivityIndicator color={colors.violet} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" backgroundColor="#F7F6F3" />
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
              <Ionicons name="close" size={19} color="#111111" />
            </Pressable>
          ) : (
            <Pressable disabled={saving} onPress={() => void savePreferences(true)} style={styles.topSkip}>
              <Text style={styles.topSkipText}>Plus tard</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((value) => (
            <View key={value} style={[styles.progressSegment, value <= step && styles.progressSegmentDone, value === step && styles.progressSegmentCurrent]} />
          ))}
          <Text style={styles.progressCount}>{String(step).padStart(2, '0')} / 04</Text>
        </View>

        <Reveal key={step} distance={8} scaleFrom={0.994} duration={320} style={styles.step}>
          {step === 1 ? (
            <View>
              <View style={[styles.introStage, {
                height: layout.isPhoneLandscape
                  ? Math.max(232, Math.min(260, layout.usableHeight * 0.72))
                  : layout.isVeryShort
                    ? 232
                    : Math.min(370, Math.max(270, layout.availableContentWidth * 0.78)),
              }]}>
                <SynauraIntroStage scene="synaura" compact={layout.isShort || layout.availableContentWidth < 380} style={styles.stageFill} />
              </View>
              <View style={styles.introCopy}>
                <Text style={styles.eyebrow}>Bienvenue sur Synaura</Text>
                <Text maxFontSizeMultiplier={1.18} style={[styles.introTitle, layout.isNarrow && styles.introTitleNarrow]}>Entre dans ton univers musical.</Text>
                <Text style={styles.introText}>Choisis ce que tu veux écouter, créer et faire évoluer sur Synaura.</Text>
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
                eyebrow="Étape 1 sur 2"
                title="Tes univers"
                subtitle="Choisis un ou plusieurs univers. Ça reste modifiable à tout moment."
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
                        <Ionicons name={UNIVERSE_ICON[option.id]} size={19} color={active ? '#FFFFFF' : '#111111'} />
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
                eyebrow="Étape 2 sur 2"
                title="Ce que tu veux faire"
                subtitle="Ça personnalise tes raccourcis. Rien n’est jamais caché définitivement."
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
                        <Ionicons name={INTENTION_ICON[option.id]} size={17} color={active ? '#FFFFFF' : '#111111'} />
                      </View>
                      <Text style={styles.intentionLabel}>{option.label}</Text>
                      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={active ? colors.violet : 'rgba(17,17,17,0.22)'} />
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
                eyebrow="Résumé"
                title="C’est prêt"
                subtitle="Tu peux modifier ces choix à tout moment depuis ton profil."
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
                    {nativeNotifications.status === 'requesting' ? <ActivityIndicator size="small" color="#111111" /> : <Text style={styles.notificationActionText}>Activer</Text>}
                  </Pressable>
                ) : null}
              </View>
              <MotionPressable style={styles.primaryButton} onPress={() => void savePreferences(false)} disabled={saving} scaleTo={0.97}>
                {saving ? <ActivityIndicator color="#F7F6F3" /> : (
                  <>
                    <Text style={styles.primaryText}>{isEdit ? 'Enregistrer mes choix' : 'Ouvrir Pour toi'}</Text>
                    <Ionicons name="arrow-forward" size={17} color="#F7F6F3" />
                  </>
                )}
              </MotionPressable>
            </View>
          ) : null}
        </Reveal>
      </ScrollView>
    </View>
  );
}

function StepHeader({ onBack, eyebrow, title, subtitle, selected }: { onBack?: () => void; eyebrow: string; title: string; subtitle: string; selected?: number }) {
  return (
    <View style={styles.stepHeader}>
      {onBack ? (
        <Pressable accessibilityLabel="Retour" onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={17} color="#111111" />
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
        <Text style={styles.skipStepText}>Passer cette étape</Text>
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
  screen: { flex: 1, backgroundColor: '#F7F6F3' },
  loadingFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingMark: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111' },
  content: { flexGrow: 1 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111' },
  brandName: { color: '#111111', fontSize: 14, fontWeight: '900' },
  brandContext: { marginTop: 1, color: 'rgba(17,17,17,0.46)', fontSize: 9, fontWeight: '700' },
  closeButton: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(17,17,17,0.1)', backgroundColor: '#FFFFFF' },
  topSkip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  topSkipText: { color: 'rgba(17,17,17,0.54)', fontSize: 11, fontWeight: '800' },
  progressRow: { minHeight: 28, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(17,17,17,0.1)' },
  progressSegmentDone: { backgroundColor: 'rgba(115,87,198,0.42)' },
  progressSegmentCurrent: { flex: 1.65, backgroundColor: '#7357C6' },
  progressCount: { width: 39, marginLeft: 4, color: 'rgba(17,17,17,0.4)', fontSize: 8, fontWeight: '900', textAlign: 'right' },
  step: { marginTop: 16 },
  introStage: { overflow: 'hidden', borderRadius: 8, backgroundColor: '#111111', shadowColor: '#111111', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 5 },
  stageFill: { flex: 1, minHeight: 0 },
  introCopy: { paddingTop: 24 },
  eyebrow: { color: '#7357C6', fontSize: 10, fontWeight: '900' },
  introTitle: { marginTop: 8, maxWidth: 560, color: '#111111', fontSize: 31, lineHeight: 36, fontWeight: '900' },
  introTitleNarrow: { fontSize: 27, lineHeight: 32 },
  introText: { marginTop: 11, maxWidth: 520, color: 'rgba(17,17,17,0.58)', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  primaryButton: { width: '100%', minHeight: 54, marginTop: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16, backgroundColor: '#111111' },
  primaryText: { flexShrink: 1, color: '#F7F6F3', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  stepHeader: { marginBottom: 22 },
  backButton: { width: 42, height: 42, marginBottom: 17, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(17,17,17,0.1)', backgroundColor: '#FFFFFF' },
  stepEyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  selectedCount: { color: 'rgba(17,17,17,0.42)', fontSize: 9, fontWeight: '800' },
  stepTitle: { marginTop: 7, maxWidth: 590, color: '#111111', fontSize: 29, lineHeight: 34, fontWeight: '900' },
  stepSubtitle: { marginTop: 9, maxWidth: 560, color: 'rgba(17,17,17,0.54)', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCompact: { gap: 8 },
  tile: { minHeight: 112, position: 'relative', alignItems: 'flex-start', justifyContent: 'space-between', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(17,17,17,0.09)', padding: 12, backgroundColor: '#FFFFFF' },
  tileCompact: { minHeight: 92, padding: 10 },
  tileActive: { borderColor: '#7357C6', backgroundColor: 'rgba(115,87,198,0.08)' },
  tileIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.055)' },
  tileIconActive: { backgroundColor: '#7357C6' },
  tileLabel: { maxWidth: '88%', color: '#111111', fontSize: 12, lineHeight: 16, fontWeight: '900' },
  check: { position: 'absolute', right: 10, top: 10, width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(17,17,17,0.16)' },
  checkActive: { borderColor: '#7357C6', backgroundColor: '#7357C6' },
  intentions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intention: { width: '100%', minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(17,17,17,0.09)', paddingHorizontal: 11, backgroundColor: '#FFFFFF' },
  intentionCompact: { minHeight: 52 },
  intentionTablet: { width: '49%' },
  intentionActive: { borderColor: '#7357C6', backgroundColor: 'rgba(115,87,198,0.08)' },
  intentionIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.055)' },
  intentionIconActive: { backgroundColor: '#7357C6' },
  intentionLabel: { flex: 1, minWidth: 0, color: '#111111', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  stepFooter: { marginTop: 2 },
  skipStep: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipStepText: { color: 'rgba(17,17,17,0.42)', fontSize: 10, fontWeight: '800' },
  summaryHero: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 8, padding: 14, backgroundColor: '#111111' },
  summaryIcon: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7357C6' },
  summaryHeroCopy: { flex: 1, minWidth: 0 },
  summaryHeroTitle: { color: '#F7F6F3', fontSize: 17, fontWeight: '900' },
  summaryHeroText: { marginTop: 4, color: 'rgba(247,246,243,0.62)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  summaryBlock: { minHeight: 68, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(17,17,17,0.1)' },
  summaryBlockIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.1)' },
  summaryBlockCopy: { flex: 1, minWidth: 0 },
  summaryLabel: { color: 'rgba(17,17,17,0.42)', fontSize: 9, fontWeight: '800' },
  summaryValue: { marginTop: 4, color: '#111111', fontSize: 12, lineHeight: 17, fontWeight: '800' },
  notificationCard: { minHeight: 78, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(17,17,17,0.09)', padding: 11, backgroundColor: '#FFFFFF' },
  notificationCardStacked: { flexWrap: 'wrap', alignItems: 'flex-start' },
  notificationIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7357C6' },
  notificationIconReady: { backgroundColor: '#4A9EAA' },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationTitle: { color: '#111111', fontSize: 11, lineHeight: 15, fontWeight: '900' },
  notificationText: { marginTop: 3, color: 'rgba(17,17,17,0.54)', fontSize: 9, lineHeight: 13, fontWeight: '700' },
  notificationError: { marginTop: 4, color: '#D96D63', fontSize: 8, lineHeight: 12, fontWeight: '800' },
  notificationAction: { minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingHorizontal: 11, backgroundColor: 'rgba(115,87,198,0.1)' },
  notificationActionStacked: { width: '100%', marginTop: 2 },
  notificationActionText: { color: '#111111', fontSize: 9, fontWeight: '900' },
});

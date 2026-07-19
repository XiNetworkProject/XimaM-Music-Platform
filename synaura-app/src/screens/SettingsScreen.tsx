import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  clearHiddenRecommendationArtists,
  deleteAccount,
  getMyProfile,
  getBlockedMessageUsers,
  getNotificationPrefs,
  getReferralData,
  getSubscriptionUsage,
  getUserPreferences,
  updateNotificationPrefs,
  updateProfile,
  updateUserPreferences,
  unblockMessageUser,
  type MessagingBlock,
  type MobileProfile,
  type NotificationPrefs,
  type ReferralData,
  type SubscriptionUsage,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { ProfileImagePicker } from '@/components/profile/ProfileImagePicker';
import { SynauraBackground } from '@/components/SynauraBackground';
import { colors } from '@/theme/tokens';
import legalContent from '@/legal/legalDocuments.json';
import { useAppUpdate } from '@/updates/UpdateProvider';
import { SHOW_SHUTDOWN_NOTICES } from '@/config/features';
import { useMobileSettings, type ThemeMode } from '@/settings/MobileSettingsProvider';
import { validateSocialUrl, type SocialPlatform } from '@/utils/validateSocialUrl';
import { useNativeNotifications } from '@/notifications/NativeNotificationsProvider';
import { AppHeader } from '@/components/ui/AppHeader';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { MessagingAvatar } from '@/components/messaging/MessagingAvatar';

type Tab = 'overview' | 'profil' | 'compte' | 'preferences' | 'notifications' | 'events' | 'parrainage' | 'abonnement' | 'updates' | 'securite' | 'legal';
type EventPrefs = {
  autoParticipate: boolean;
  voteReminders: boolean;
  showBadges: boolean;
  resultNotifications: boolean;
  allowPulse: boolean;
};
type LegalDocument = (typeof legalContent)[number];
const LEGAL_BASE_URL = 'https://www.synaura.fr';
const allLegalDocuments = [
  { label: 'Fermeture de Synaura', description: "Annonce officielle et date de fin du service", path: '/fermeture', icon: 'warning-outline' },
  { label: 'Mentions légales', description: 'Éditeur, hébergement et responsabilité', path: '/legal/mentions-legales', icon: 'business-outline' },
  { label: 'Politique de confidentialité', description: 'Collecte, traitement et conservation des données', path: '/legal/confidentialite', icon: 'shield-checkmark-outline' },
  { label: "Conditions générales d'utilisation", description: "Règles d'utilisation de la plateforme", path: '/legal/cgu', icon: 'document-text-outline' },
  { label: 'Conditions générales de vente', description: 'Abonnements, paiements et résiliation', path: '/legal/cgv', icon: 'card-outline' },
  { label: 'Politique des cookies', description: 'Cookies essentiels, analytiques et tiers', path: '/legal/cookies', icon: 'options-outline' },
  { label: 'Conformité RGPD', description: 'Droits, délais, sécurité et réclamations', path: '/legal/rgpd', icon: 'people-outline' },
] as const;
const legalDocuments = allLegalDocuments.filter((document) => SHOW_SHUTDOWN_NOTICES || document.path !== '/fermeture');
const NOTIFICATION_LABELS: Record<string, string> = {
  push_enabled: 'Notifications push',
  email_enabled: 'Notifications par email',
  in_app_enabled: "Centre de notifications dans l'app",
  new_follower: 'Nouveaux abonnements',
  new_like: 'Nouveaux likes',
  like_milestone: 'Paliers de likes',
  new_comment: 'Nouveaux commentaires',
  new_message: 'Nouveaux messages',
  new_track_followed: 'Sorties des artistes suivis',
  view_milestone: "Paliers d'ecoutes",
  boost_reminder: 'Rappels de boost',
  admin_broadcast: 'Annonces Synaura',
  weekly_recap: 'Recap hebdomadaire',
};

const SETTINGS_DESCRIPTIONS: Record<Exclude<Tab, 'overview'>, string> = {
  profil: 'Identité, images, bio et liens sociaux',
  compte: 'Session et informations du compte',
  preferences: 'Lecture, données et animations',
  notifications: 'Push et alertes de ton activité',
  events: 'Participation et rappels Synaura Events',
  parrainage: 'Invitations et crédits gagnés',
  abonnement: 'Plan actuel et quotas',
  updates: 'Version installée et nouvelles sorties',
  securite: 'Actions sensibles du compte',
  legal: 'Documents officiels et confidentialité',
};

export function SettingsScreen() {
  const auth = useAuth();
  const appUpdate = useAppUpdate();
  const mobileSettings = useMobileSettings();
  const nativePush = useNativeNotifications();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const [tab, setTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [notif, setNotif] = useState<NotificationPrefs | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [eventPrefs, setEventPrefs] = useState<EventPrefs>({ autoParticipate: false, voteReminders: true, showBadges: true, resultNotifications: true, allowPulse: true });
  const [messagingPrivacy, setMessagingPrivacy] = useState<'everyone' | 'following' | 'nobody'>('everyone');
  const [hiddenArtistsCount, setHiddenArtistsCount] = useState(0);
  const [blockedUsers, setBlockedUsers] = useState<MessagingBlock[]>([]);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', location: '', website: '', artistName: '', genreText: '', isArtist: false, instagram: '', youtube: '', tiktok: '', spotify: '', soundcloud: '', deezer: '', apple_music: '', twitch: '', discord: '', x: '', custom: '', badgesText: '', featuredTrackId: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [selectedLegalId, setSelectedLegalId] = useState<string | null>(null);
  const selectedLegal = legalContent.find((document) => document.id === selectedLegalId) || null;

  const tabs = useMemo<Array<{ key: Exclude<Tab, 'overview'>; label: string; icon: keyof typeof Ionicons.glyphMap }>>(() => [
    { key: 'profil', label: 'Profil', icon: 'person-outline' },
    { key: 'compte', label: 'Compte', icon: 'id-card-outline' },
    { key: 'preferences', label: 'Préférences', icon: 'options-outline' },
    { key: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
    { key: 'events', label: 'Events', icon: 'flash-outline' },
    { key: 'parrainage', label: 'Parrainage', icon: 'gift-outline' },
    { key: 'abonnement', label: 'Abonnement', icon: 'diamond-outline' },
    { key: 'updates', label: 'Mises à jour', icon: 'cloud-download-outline' },
    { key: 'securite', label: 'Sécurité', icon: 'shield-checkmark-outline' },
    { key: 'legal', label: 'Centre légal', icon: 'document-text-outline' },
  ], []);

  const load = useCallback(async () => {
    if (!auth.user?.username) return;
    setLoading(true);
    try {
      const [nextProfile, nextNotif, nextReferral, nextUsage, nextPreferences, nextBlockedUsers] = await Promise.all([
        getMyProfile(auth.user.username),
        getNotificationPrefs().catch(() => null),
        getReferralData(),
        getSubscriptionUsage(),
        getUserPreferences().catch(() => ({})),
        getBlockedMessageUsers().catch(() => []),
      ]);
      setProfile(nextProfile);
      setNotif(nextNotif);
      setReferral(nextReferral);
      setUsage(nextUsage);
      setEventPrefs((current) => ({ ...current, ...((nextPreferences as Record<string, any>).events || {}) }));
      const nextMessagingPrivacy = (nextPreferences as Record<string, any>).messagingPrivacy;
      if (nextMessagingPrivacy === 'everyone' || nextMessagingPrivacy === 'following' || nextMessagingPrivacy === 'nobody') setMessagingPrivacy(nextMessagingPrivacy);
      setHiddenArtistsCount(Array.isArray((nextPreferences as Record<string, any>)?.taste?.hiddenArtistIds)
        ? (nextPreferences as Record<string, any>).taste.hiddenArtistIds.length
        : 0);
      setBlockedUsers(nextBlockedUsers);
      setForm({
        name: nextProfile.name || '',
        bio: nextProfile.bio || '',
        location: nextProfile.location || '',
        website: nextProfile.website || '',
        artistName: nextProfile.artistName || '',
        genreText: nextProfile.genre.join(', '),
        isArtist: nextProfile.isArtist,
        instagram: nextProfile.socialLinks.instagram || '',
        youtube: nextProfile.socialLinks.youtube || '',
        tiktok: nextProfile.socialLinks.tiktok || '',
        spotify: nextProfile.socialLinks.spotify || '',
        soundcloud: nextProfile.socialLinks.soundcloud || '',
        deezer: nextProfile.socialLinks.deezer || '',
        apple_music: nextProfile.socialLinks.apple_music || '',
        twitch: nextProfile.socialLinks.twitch || '',
        discord: nextProfile.socialLinks.discord || '',
        x: nextProfile.socialLinks.x || '',
        custom: nextProfile.socialLinks.custom || '',
        badgesText: nextProfile.badges.join(', '),
        featuredTrackId: nextProfile.featuredTrackId || '',
      });
    } finally {
      setLoading(false);
    }
  }, [auth.user?.username]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    if (!profile) return;
    const socialPlatforms: SocialPlatform[] = ['instagram', 'youtube', 'tiktok', 'spotify', 'soundcloud', 'deezer', 'apple_music', 'twitch', 'discord', 'x', 'custom'];
    const invalid = socialPlatforms.map((platform) => ({ platform, error: validateSocialUrl(platform, form[platform]) })).find((item) => item.error);
    if (invalid) {
      Alert.alert('Lien social invalide', `${invalid.platform}: ${invalid.error}`);
      return;
    }
    setSaving(true);
    try {
      const next = await updateProfile(profile.username, {
        name: form.name.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        website: form.website.trim(),
        isArtist: form.isArtist,
        artistName: form.artistName.trim(),
        genre: form.genreText.split(',').map((item) => item.trim()).filter(Boolean),
      });
      await updateUserPreferences({
        socialLinks: {
          instagram: form.instagram.trim(),
          youtube: form.youtube.trim(),
          tiktok: form.tiktok.trim(),
          spotify: form.spotify.trim(),
          soundcloud: form.soundcloud.trim(),
          deezer: form.deezer.trim(),
          apple_music: form.apple_music.trim(),
          twitch: form.twitch.trim(),
          discord: form.discord.trim(),
          x: form.x.trim(),
          custom: form.custom.trim(),
        },
        profileBadges: form.badgesText.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 6),
        featuredTrackId: form.featuredTrackId || null,
      });
      setProfile(next);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const patchNotif = async (patch: Partial<NotificationPrefs>) => {
    const optimistic = { ...(notif || {} as NotificationPrefs), ...patch } as NotificationPrefs;
    setNotif(optimistic);
    const saved = await updateNotificationPrefs(patch);
    setNotif(saved);
  };

  const patchEventPrefs = async (patch: Partial<EventPrefs>) => {
    const next = { ...eventPrefs, ...patch };
    setEventPrefs(next);
    await updateUserPreferences({ events: next });
  };

  const patchMessagingPrivacy = async (value: 'everyone' | 'following' | 'nobody') => {
    const previous = messagingPrivacy;
    setMessagingPrivacy(value);
    try {
      await updateUserPreferences({ messagingPrivacy: value });
      void Haptics.selectionAsync().catch(() => {});
    } catch {
      setMessagingPrivacy(previous);
    }
  };

  const unblockUser = async (userId: string) => {
    setUnblockingUserId(userId);
    try {
      await unblockMessageUser(userId);
      setBlockedUsers((current) => current.filter((block) => block.user.id !== userId));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } finally {
      setUnblockingUserId(null);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm.trim().toUpperCase() !== 'SUPPRIMER') {
      Alert.alert('Confirmation requise', 'Tape SUPPRIMER avant de lancer la suppression du compte.');
      return;
    }
    Alert.alert('Supprimer le compte ?', 'Cette action est irreversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteAccount();
          await auth.logout();
        },
      },
    ]);
  };

  if (!auth.user) {
    return (
      <SynauraBackground variant="warm">
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text style={styles.title}>Parametres</Text>
          <Text style={styles.muted}>Connecte-toi pour acceder aux parametres.</Text>
        </View>
      </SynauraBackground>
    );
  }

  if (selectedLegal) {
    return <LegalReader document={selectedLegal} onClose={() => setSelectedLegalId(null)} />;
  }

  const activeCategory = tab === 'overview' ? null : tabs.find((item) => item.key === tab) || null;

  return (
    <SynauraBackground variant="warm">
      <ScrollView
        contentContainerStyle={[styles.content, responsive.pageContent, { paddingTop: 0, paddingBottom: responsive.bottomDockClearance + 30 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader
          flush
          title={activeCategory?.label || 'Paramètres'}
          subtitle={activeCategory ? SETTINGS_DESCRIPTIONS[activeCategory.key] : `@${auth.user.username || profile?.username || 'synaura'}`}
          onBack={activeCategory ? () => setTab('overview') : () => navigation.goBack()}
          action={tab === 'overview' ? { icon: 'refresh-outline', label: 'Actualiser', onPress: () => void load() } : undefined}
        />

        {loading ? <View style={styles.inlineLoading}><ActivityIndicator color={colors.violet} /><Text style={styles.muted}>Synchronisation...</Text></View> : null}

        {tab === 'overview' ? (
          <>
            <Reveal distance={8} style={styles.overviewHero}>
              <View style={styles.overviewAvatar}>
                {profile?.avatar ? <Image source={{ uri: profile.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.overviewAvatarText}>{(profile?.name || auth.user.name || auth.user.username || 'S').slice(0, 1).toUpperCase()}</Text>}
              </View>
              <View style={styles.overviewCopy}>
                <Text numberOfLines={1} style={styles.overviewName}>{profile?.name || auth.user.name || auth.user.username}</Text>
                <Text numberOfLines={1} style={styles.overviewMeta}>{auth.user.email || `@${auth.user.username}`}</Text>
              </View>
              <View style={styles.overviewStatus}><View style={styles.overviewStatusDot} /><Text style={styles.overviewStatusText}>Synchronisé</Text></View>
            </Reveal>

            <View style={styles.dashboardShortcuts}>
              <MotionPressable onPress={() => navigation.navigate('Stats')} style={[styles.dashboardShortcut, styles.dashboardShortcutDark]} scaleTo={0.98}>
                <Ionicons name="analytics-outline" size={20} color="#FFFFFF" />
                <View style={styles.dashboardShortcutCopy}>
                  <Text style={styles.dashboardShortcutTitleLight}>Stats Synaura</Text>
                  <Text numberOfLines={1} style={styles.dashboardShortcutTextLight}>Audience et performances</Text>
                </View>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </MotionPressable>
              <MotionPressable onPress={() => navigation.navigate('City')} style={styles.dashboardShortcut} scaleTo={0.98}>
                <Ionicons name="flash-outline" size={20} color={colors.violet} />
                <View style={styles.dashboardShortcutCopy}>
                  <Text style={styles.dashboardShortcutTitle}>Synaura Events</Text>
                  <Text numberOfLines={1} style={styles.dashboardShortcutText}>Votes et challenges</Text>
                </View>
                <Ionicons name="arrow-forward" size={15} color={colors.text} />
              </MotionPressable>
            </View>

            <View style={styles.settingsMenu}>
              {tabs.map((item, index) => (
                <Reveal key={item.key} delay={Math.min(index * 30, 180)} distance={5}>
                  <MotionPressable onPress={() => setTab(item.key)} style={styles.settingsRow} scaleTo={0.985}>
                    <View style={styles.settingsIcon}><Ionicons name={item.icon} size={19} color={colors.violet} /></View>
                    <View style={styles.settingsCopy}>
                      <Text style={styles.settingsTitle}>{item.label}</Text>
                      <Text numberOfLines={1} style={styles.settingsDescription}>{SETTINGS_DESCRIPTIONS[item.key]}</Text>
                    </View>
                    {item.key === 'updates' && appUpdate.release && appUpdate.release.versionCode > appUpdate.currentVersionCode ? <View style={styles.updateDot} /> : null}
                    <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
                  </MotionPressable>
                </Reveal>
              ))}
            </View>
          </>
        ) : null}

        {tab === 'profil' ? (
          <Section title="Profil public" text="Ce que les auditeurs voient sur ton profil.">
            {profile ? (
              <View style={{ gap: 12 }}>
                <ProfileImagePicker username={profile.username} type="banner" value={profile.banner} onUploaded={(url) => setProfile((current) => current ? { ...current, banner: url } : current)} />
                <ProfileImagePicker username={profile.username} type="avatar" value={profile.avatar} onUploaded={(url) => setProfile((current) => current ? { ...current, avatar: url } : current)} />
              </View>
            ) : null}
            <Field label="Nom" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field label="Bio" value={form.bio} multiline onChangeText={(value) => setForm((current) => ({ ...current, bio: value }))} />
            <Field label="Localisation" value={form.location} onChangeText={(value) => setForm((current) => ({ ...current, location: value }))} />
            <Field label="Site web" value={form.website} onChangeText={(value) => setForm((current) => ({ ...current, website: value }))} />
            <Toggle label="Compte artiste" value={form.isArtist} onValueChange={(value) => setForm((current) => ({ ...current, isArtist: value }))} />
            <Field label="Nom artiste" value={form.artistName} onChangeText={(value) => setForm((current) => ({ ...current, artistName: value }))} />
            <Field label="Genres" value={form.genreText} onChangeText={(value) => setForm((current) => ({ ...current, genreText: value }))} hint="separes par virgules" />
            <Text style={styles.groupTitle}>Réseaux & identité sociale</Text>
            <Field label="Instagram" value={form.instagram} onChangeText={(value) => setForm((current) => ({ ...current, instagram: value }))} hint="URL complète" />
            <Field label="YouTube" value={form.youtube} onChangeText={(value) => setForm((current) => ({ ...current, youtube: value }))} hint="URL complète" />
            <Field label="TikTok" value={form.tiktok} onChangeText={(value) => setForm((current) => ({ ...current, tiktok: value }))} hint="URL complète" />
            <Field label="Spotify" value={form.spotify} onChangeText={(value) => setForm((current) => ({ ...current, spotify: value }))} hint="https://open.spotify.com/..." />
            <Field label="SoundCloud" value={form.soundcloud} onChangeText={(value) => setForm((current) => ({ ...current, soundcloud: value }))} hint="https://soundcloud.com/..." />
            <Field label="Deezer" value={form.deezer} onChangeText={(value) => setForm((current) => ({ ...current, deezer: value }))} hint="https://deezer.com/..." />
            <Field label="Apple Music" value={form.apple_music} onChangeText={(value) => setForm((current) => ({ ...current, apple_music: value }))} hint="https://music.apple.com/..." />
            <Field label="Twitch" value={form.twitch} onChangeText={(value) => setForm((current) => ({ ...current, twitch: value }))} hint="https://twitch.tv/..." />
            <Field label="Discord" value={form.discord} onChangeText={(value) => setForm((current) => ({ ...current, discord: value }))} hint="https://discord.gg/..." />
            <Field label="X / Twitter" value={form.x} onChangeText={(value) => setForm((current) => ({ ...current, x: value }))} hint="https://x.com/..." />
            <Field label="Lien personnalisé" value={form.custom} onChangeText={(value) => setForm((current) => ({ ...current, custom: value }))} hint="https://..." />
            <Field label="Badges" value={form.badgesText} onChangeText={(value) => setForm((current) => ({ ...current, badgesText: value }))} hint="séparés par virgules" />
            {profile?.tracks.length ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.groupTitle}>Son vedette</Text>
                {profile.tracks.slice(0, 8).map((track) => (
                  <Pressable key={track._id} onPress={() => setForm((current) => ({ ...current, featuredTrackId: track._id }))} style={[styles.featureChoice, form.featuredTrackId === track._id && styles.featureChoiceActive]}>
                    <Ionicons name={form.featuredTrackId === track._id ? 'radio-button-on' : 'radio-button-off'} size={18} color={form.featuredTrackId === track._id ? colors.violet : colors.textTertiary} />
                    <Text numberOfLines={1} style={styles.featureChoiceText}>{track.title}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Pressable disabled={saving} onPress={saveProfile} style={[styles.primary, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color="#FFFAF2" /> : <Text style={styles.primaryText}>Sauvegarder</Text>}
            </Pressable>
          </Section>
        ) : null}

        {tab === 'compte' ? (
          <Section title="Compte" text="Identite et session mobile.">
            <Info label="Email" value={auth.user.email || 'Non renseigne'} />
            <Info label="Username" value={`@${auth.user.username || profile?.username || 'user'}`} />
            <Info label="Role" value={profile?.role || auth.user.role || 'user'} />
            <Pressable onPress={auth.logout} style={styles.secondary}><Text style={styles.secondaryText}>Se deconnecter</Text></Pressable>
          </Section>
        ) : null}

        {tab === 'preferences' ? (
          <Section title="Preferences" text="Reglages locaux de l'app mobile.">
            <ThemeSelector
              value={mobileSettings.settings.themeMode}
              onChange={(themeMode) => void mobileSettings.updateSettings({ themeMode })}
            />
            <MessagingPrivacySelector value={messagingPrivacy} onChange={(value) => void patchMessagingPrivacy(value)} />
            {hiddenArtistsCount > 0 ? (
              <View style={styles.hiddenArtistsRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.toggleLabel}>Artistes masqués</Text>
                  <Text style={styles.themeHint}>{hiddenArtistsCount} artiste{hiddenArtistsCount > 1 ? 's' : ''} retiré{hiddenArtistsCount > 1 ? 's' : ''} des recommandations.</Text>
                </View>
                <Pressable
                  onPress={() => void clearHiddenRecommendationArtists().then(() => setHiddenArtistsCount(0))}
                  style={styles.restoreTasteButton}
                >
                  <Text style={styles.restoreTasteText}>Réafficher</Text>
                </Pressable>
              </View>
            ) : null}
            <Toggle label="Autoplay" value={mobileSettings.settings.autoplay} onValueChange={(value) => void mobileSettings.updateSettings({ autoplay: value })} />
            <Toggle label="Qualite audio haute" value={mobileSettings.settings.highQuality} onValueChange={(value) => void mobileSettings.updateSettings({ highQuality: value })} />
            <Toggle label="Pochettes video" value={mobileSettings.settings.coverVideos} onValueChange={(value) => void mobileSettings.updateSettings({ coverVideos: value })} />
            <Toggle label="Fond dynamique" value={mobileSettings.settings.dynamicBackground} onValueChange={(value) => void mobileSettings.updateSettings({ dynamicBackground: value })} />
            <Toggle label="Economiseur de donnees" value={mobileSettings.settings.dataSaver} onValueChange={(value) => void mobileSettings.updateSettings({ dataSaver: value })} />
            <Toggle label="Activite visible" value={mobileSettings.settings.activityVisible} onValueChange={(value) => void mobileSettings.updateSettings({ activityVisible: value })} />
            <Toggle
              label="Push appareil"
              value={mobileSettings.settings.pushDevice}
              onValueChange={(value) => {
                void (async () => {
                  if (value) {
                    const enabled = await nativePush.enable();
                    await mobileSettings.updateSettings({ pushDevice: enabled });
                  } else {
                    await nativePush.disable();
                    await mobileSettings.updateSettings({ pushDevice: false });
                  }
                })();
              }}
            />
            <Toggle label="Reduire les animations" value={mobileSettings.settings.reducedMotion} onValueChange={(value) => void mobileSettings.updateSettings({ reducedMotion: value })} />
          </Section>
        ) : null}

        {tab === 'notifications' ? (
          <Section title="Notifications" text="Choisis les alertes que tu veux garder.">
            <View style={styles.updateStatus}>
              <Ionicons
                name={nativePush.status === 'ready' ? 'checkmark-circle' : nativePush.status === 'denied' ? 'close-circle' : 'phone-portrait-outline'}
                size={20}
                color={nativePush.status === 'ready' ? '#16A34A' : nativePush.status === 'denied' ? '#B91C1C' : '#7C5CFF'}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.updateStatusTitle}>
                  {nativePush.status === 'ready'
                    ? 'Ce téléphone est connecté au push Synaura'
                    : nativePush.status === 'requesting'
                      ? 'Connexion du téléphone...'
                      : nativePush.status === 'denied'
                        ? 'Notifications refusées par Android'
                        : 'Notifications téléphone à activer'}
                </Text>
                {nativePush.error ? <Text style={styles.updateStatusText}>{nativePush.error}</Text> : null}
                {nativePush.notice ? <Text style={styles.updateStatusText}>{nativePush.notice}</Text> : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => void nativePush.enable().then((enabled) => mobileSettings.updateSettings({ pushDevice: enabled }))} style={[styles.secondary, { flex: 1 }]}>
                <Text style={styles.secondaryText}>Activer</Text>
              </Pressable>
              <Pressable onPress={() => void nativePush.sendTest()} style={[styles.primary, { flex: 1 }]}>
                <Ionicons name="notifications-outline" size={16} color="#FFFAF2" />
                <Text style={styles.primaryText}>Tester la cloche</Text>
              </Pressable>
            </View>
            {notif ? (
              <>
                <Text style={styles.groupTitle}>Canaux</Text>
                {['push_enabled', 'email_enabled'].map((key) => key in notif ? <Toggle key={key} label={NOTIFICATION_LABELS[key] || key} value={Boolean((notif as any)[key])} onValueChange={(next) => void patchNotif({ [key]: next } as Partial<NotificationPrefs>)} /> : null)}
                <Text style={styles.groupTitle}>Social & musique</Text>
                {Object.entries(notif).filter(([key, value]) => typeof value === 'boolean' && !['push_enabled', 'email_enabled'].includes(key)).map(([key, value]) => (
                  <Toggle key={key} label={NOTIFICATION_LABELS[key] || key.replace(/_/g, ' ')} value={Boolean(value)} onValueChange={(next) => void patchNotif({ [key]: next } as Partial<NotificationPrefs>)} />
                ))}
              </>
            ) : <Text style={styles.muted}>Chargement des preferences...</Text>}
          </Section>
        ) : null}

        {tab === 'events' ? (
          <Section title="Synaura Events" text="Choisis comment ton profil, tes sons et tes rappels participent au Pulse.">
            <Toggle label="Rappels de vote" value={eventPrefs.voteReminders} onValueChange={(value) => void patchEventPrefs({ voteReminders: value })} />
            <Toggle label="Résultats des events" value={eventPrefs.resultNotifications} onValueChange={(value) => void patchEventPrefs({ resultNotifications: value })} />
            <Toggle label="Afficher mes badges" value={eventPrefs.showBadges} onValueChange={(value) => void patchEventPrefs({ showBadges: value })} />
            <Toggle label="Autoriser mes sons dans Pulse" value={eventPrefs.allowPulse} onValueChange={(value) => void patchEventPrefs({ allowPulse: value })} />
            <Toggle label="Participation automatique aux events compatibles" value={eventPrefs.autoParticipate} onValueChange={(value) => void patchEventPrefs({ autoParticipate: value })} />
            <Pressable onPress={() => navigation.navigate('City')} style={styles.primary}>
              <Ionicons name="flash-outline" size={17} color="#FFFAF2" />
              <Text style={styles.primaryText}>Ouvrir Events et les votes</Text>
            </Pressable>
          </Section>
        ) : null}

        {tab === 'parrainage' ? (
          <Section title="Parrainage" text="Invite des artistes et gagne des credits.">
            <Info label="Code" value={referral?.referralCode || 'Indisponible'} />
            <Info label="Invites" value={`${referral?.totalReferrals || 0}/${referral?.maxReferrals || 20}`} />
            <Info label="Credits gagnes" value={String(referral?.totalCreditsEarned || 0)} />
            <Text style={styles.muted}>{referral?.referralLink || 'Lien indisponible'}</Text>
          </Section>
        ) : null}

        {tab === 'abonnement' ? (
          <Section title="Abonnement" text="Plan actuel et limites.">
            <Info label="Plan" value={usage?.plan || 'free'} />
            <Usage label="Tracks" used={usage?.tracks.used || 0} limit={usage?.tracks.limit ?? 0} percentage={usage?.tracks.percentage || 0} />
            <Usage label="Playlists" used={usage?.playlists.used || 0} limit={usage?.playlists.limit ?? 0} percentage={usage?.playlists.percentage || 0} />
            <Pressable onPress={() => navigation.navigate('Subscriptions')} style={styles.primary}>
              <Ionicons name="diamond-outline" size={17} color="#FFFAF2" />
              <Text style={styles.primaryText}>Comparer et gérer les plans</Text>
            </Pressable>
          </Section>
        ) : null}

        {tab === 'updates' ? (
          <Section title="Mises a jour" text="Installe les nouvelles versions directement depuis Synaura.">
            <Info label="Version installee" value={`${appUpdate.currentVersionName} (${appUpdate.currentVersionCode})`} />
            {appUpdate.release ? (
              <Info label="Derniere version" value={`${appUpdate.release.versionName} (${appUpdate.release.versionCode})`} />
            ) : null}
            <View style={styles.updateStatus}>
              <Ionicons
                name={appUpdate.status === 'current' ? 'checkmark-circle' : appUpdate.status === 'error' ? 'alert-circle' : 'sparkles'}
                size={20}
                color={appUpdate.status === 'error' ? '#B91C1C' : '#7C5CFF'}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.updateStatusTitle}>
                  {appUpdate.status === 'current'
                    ? "L'application est a jour"
                    : appUpdate.release
                      ? `Version ${appUpdate.release.versionName} disponible`
                      : 'Verification disponible'}
                </Text>
                {appUpdate.error ? <Text style={styles.updateStatusText}>{appUpdate.error}</Text> : null}
              </View>
            </View>
            {appUpdate.release && appUpdate.release.versionCode > appUpdate.currentVersionCode ? (
              <Pressable
                disabled={appUpdate.status === 'downloading'}
                onPress={() => void appUpdate.downloadAndInstall()}
                style={[styles.primary, appUpdate.status === 'downloading' && styles.disabled]}
              >
                {appUpdate.status === 'downloading' ? <ActivityIndicator color="#FFFAF2" /> : null}
                <Text style={styles.primaryText}>
                  {appUpdate.status === 'downloading' ? `${Math.round(appUpdate.progress * 100)} %` : 'Telecharger et installer'}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => void appUpdate.checkForUpdate(true)} style={styles.primary}>
                <Text style={styles.primaryText}>Verifier maintenant</Text>
              </Pressable>
            )}
            <Pressable onPress={() => void appUpdate.openInstallSettings()} style={styles.secondary}>
              <Text style={styles.secondaryText}>Autoriser les installations</Text>
            </Pressable>
          </Section>
        ) : null}

        {tab === 'securite' ? (
          <Section title="Securite" text="Actions sensibles du compte.">
            <Text style={styles.groupTitle}>Comptes bloqués</Text>
            <Text style={styles.themeHint}>Ces comptes ne peuvent plus t’ajouter ni t’envoyer de message.</Text>
            {blockedUsers.length ? blockedUsers.map((block) => (
              <View key={block.id} style={styles.blockedRow}>
                <MessagingAvatar user={block.user} size={42} />
                <View style={styles.blockedCopy}><Text numberOfLines={1} style={styles.blockedName}>{block.user.name}</Text><Text numberOfLines={1} style={styles.blockedUsername}>@{block.user.username}</Text></View>
                <Pressable disabled={unblockingUserId === block.user.id} onPress={() => void unblockUser(block.user.id)} style={styles.unblockButton}><Text style={styles.unblockText}>{unblockingUserId === block.user.id ? 'Patiente…' : 'Débloquer'}</Text></Pressable>
              </View>
            )) : <View style={styles.emptyBlocked}><Text style={styles.emptyBlockedText}>Aucun compte bloqué.</Text></View>}
            <Field label="Tape SUPPRIMER pour confirmer" value={deleteConfirm} onChangeText={setDeleteConfirm} />
            <Pressable onPress={confirmDelete} style={styles.danger}><Text style={styles.dangerText}>Supprimer mon compte</Text></Pressable>
          </Section>
        ) : null}

        {tab === 'legal' ? (
          <Section title="Centre légal" text="Les documents officiels complets, identiques à la version web.">
            <Info label="Éditeur" value="Maxime VERMEULEN · Auto-entrepreneur" />
            <Info label="SIRET" value="991635194" />
            <Info label="Contact légal" value="contact.syn@synaura.fr" />
            {legalDocuments.map((document) => (
              <Pressable key={document.path} onPress={() => setSelectedLegalId(document.path.split('/').filter(Boolean).at(-1) || 'fermeture')} style={styles.legalDocument}>
                <View style={styles.legalIcon}>
                  <Ionicons name={document.icon} size={19} color="#171313" />
                </View>
                <View style={styles.legalCopy}>
                  <Text style={styles.legalTitle}>{document.label}</Text>
                  <Text style={styles.legalDescription}>{document.description}</Text>
                </View>
                <Ionicons name="open-outline" size={17} color="rgba(23,19,19,0.42)" />
              </Pressable>
            ))}
          </Section>
        ) : null}
      </ScrollView>
    </SynauraBackground>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function LegalReader({ document, onClose }: { document: LegalDocument; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const webPath = document.id === 'fermeture' ? '/fermeture' : `/legal/${document.id}`;
  let number = 0;

  return (
    <SynauraBackground variant="warm">
      <ScrollView contentContainerStyle={[styles.legalReader, responsive.pageContent, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.back}><Ionicons name="chevron-back" size={20} color="#171313" /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Centre légal officiel</Text>
            <Text style={styles.legalReaderTitle}>{document.title}</Text>
          </View>
        </View>
        <Text style={styles.legalReaderSubtitle}>{document.subtitle}</Text>
        <Pressable onPress={() => void Linking.openURL(`${LEGAL_BASE_URL}${webPath}`)} style={styles.webDocumentButton}>
          <Ionicons name="globe-outline" size={17} color="#FFFAF2" />
          <Text style={styles.webDocumentText}>Voir la version web officielle</Text>
        </Pressable>
        <View style={styles.legalArticle}>
          {document.blocks.map((block, index) => {
            if (block.type === 'number') number += 1;
            else if (block.type !== 'paragraph') number = 0;
            return (
              <View key={`${index}-${block.text.slice(0, 12)}`} style={block.type === 'bullet' || block.type === 'number' ? styles.legalListRow : undefined}>
                {block.type === 'bullet' ? <View style={styles.legalBullet} /> : null}
                {block.type === 'number' ? <Text style={styles.legalNumber}>{number}.</Text> : null}
                <Text style={[
                  styles.legalParagraph,
                  block.type === 'heading' && styles.legalHeading,
                  block.type === 'subheading' && styles.legalSubheading,
                  (block.type === 'bullet' || block.type === 'number') && styles.legalListText,
                ]}>{block.text}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SynauraBackground>
  );
}

function Field({ label, value, onChangeText, multiline, hint }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; hint?: string }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TextInput value={value} onChangeText={onChangeText} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} placeholderTextColor="rgba(23,19,19,0.34)" style={[styles.input, multiline && styles.inputMulti]} />
    </View>
  );
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
  { value: 'light', label: 'Clair', icon: 'sunny-outline' },
  { value: 'system', label: 'Système', icon: 'phone-portrait-outline' },
];

function ThemeSelector({ value, onChange }: { value: ThemeMode; onChange: (value: ThemeMode) => void }) {
  return (
    <View style={styles.themeBlock}>
      <View>
        <Text style={styles.toggleLabel}>Apparence</Text>
        <Text style={styles.themeHint}>Le lecteur et les clips restent immersifs quand le contenu le demande.</Text>
      </View>
      <View style={styles.themeSelector} accessibilityRole="radiogroup">
        {THEME_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [styles.themeOption, selected && styles.themeOptionActive, pressed && styles.themeOptionPressed]}
            >
              <Ionicons name={option.icon} size={17} color={selected ? colors.white : colors.textSecondary} />
              <Text style={[styles.themeOptionText, selected && styles.themeOptionTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const MESSAGING_PRIVACY_OPTIONS = [
  { value: 'everyone', label: 'Tout le monde', description: 'Tous les membres peuvent envoyer une demande.' },
  { value: 'following', label: 'Les personnes que je suis', description: 'Uniquement les comptes que tu suis déjà.' },
  { value: 'nobody', label: 'Personne', description: 'Aucune nouvelle demande, sans couper tes amis actuels.' },
] as const;

function MessagingPrivacySelector({ value, onChange }: { value: 'everyone' | 'following' | 'nobody'; onChange: (value: 'everyone' | 'following' | 'nobody') => void }) {
  return (
    <View style={styles.messagingPrivacy}>
      <View>
        <Text style={styles.toggleLabel}>Qui peut m’ajouter ?</Text>
        <Text style={styles.themeHint}>Contrôle les nouvelles demandes d’amis.</Text>
      </View>
      <View accessibilityRole="radiogroup" style={styles.messagingChoices}>
        {MESSAGING_PRIVACY_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => onChange(option.value)} style={[styles.messagingChoice, selected && styles.messagingChoiceActive]}>
              <View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioDot} /> : null}</View>
              <View style={styles.messagingChoiceCopy}><Text style={styles.messagingChoiceTitle}>{option.label}</Text><Text style={styles.messagingChoiceText}>{option.description}</Text></View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Usage({ label, used, limit, percentage }: { label: string; used: number; limit: number; percentage: number }) {
  return (
    <View style={styles.info}>
      <View style={styles.usageTop}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoLabel}>{used}/{limit < 0 ? '∞' : limit}</Text></View>
      <View style={styles.usageTrack}><View style={[styles.usageFill, { width: `${limit < 0 ? 12 : Math.max(2, Math.min(100, percentage))}%` }]} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 130, gap: 14 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  kicker: { color: colors.textTertiary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  muted: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  inlineLoading: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 4 },
  overviewHero: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(74,158,170,0.34)', backgroundColor: '#15181A', padding: 12 },
  overviewAvatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  overviewAvatarText: { color: colors.white, fontSize: 21, fontWeight: '900' },
  overviewCopy: { flex: 1, minWidth: 0 },
  overviewName: { color: colors.white, fontSize: 16, fontWeight: '900' },
  overviewMeta: { marginTop: 4, color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '700' },
  overviewStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  overviewStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
  overviewStatusText: { color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: '900' },
  dashboardShortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dashboardShortcut: { minHeight: 70, flexBasis: 210, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderTopWidth: 2, borderTopColor: colors.cyan, backgroundColor: colors.surface, paddingHorizontal: 11 },
  dashboardShortcutDark: { borderColor: 'rgba(115,87,198,0.42)', backgroundColor: '#191621' },
  dashboardShortcutCopy: { flex: 1, minWidth: 0 },
  dashboardShortcutTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  dashboardShortcutText: { marginTop: 2, color: colors.textSecondary, fontSize: 9, fontWeight: '700' },
  dashboardShortcutTitleLight: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  dashboardShortcutTextLight: { marginTop: 2, color: 'rgba(255,255,255,0.58)', fontSize: 9, fontWeight: '700' },
  settingsMenu: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderRadius: 14, backgroundColor: colors.surface },
  settingsRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: 12 },
  settingsIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  settingsCopy: { flex: 1, minWidth: 0 },
  settingsTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  settingsDescription: { marginTop: 3, color: colors.textSecondary, fontSize: 10, fontWeight: '600' },
  updateDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.coral },
  section: { paddingVertical: 4 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionText: { marginTop: 5, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  sectionBody: { marginTop: 15, gap: 12 },
  groupTitle: { marginTop: 4, color: colors.violet, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  featureChoice: { minHeight: 44, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  featureChoiceActive: { backgroundColor: 'rgba(124,92,255,0.1)', borderColor: 'rgba(124,92,255,0.28)' },
  featureChoiceText: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '900' },
  field: { gap: 7 },
  fieldHead: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 12, fontWeight: '900' },
  hint: { color: colors.textTertiary, fontSize: 10, fontWeight: '800' },
  input: { minHeight: 46, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surfaceStrong, paddingHorizontal: 12, color: colors.text, fontSize: 14, fontWeight: '700' },
  inputMulti: { minHeight: 96, paddingTop: 12, paddingBottom: 12 },
  toggleRow: { minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
  themeBlock: { gap: 12, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  themeHint: { marginTop: 4, color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  themeSelector: { minHeight: 48, flexDirection: 'row', gap: 5, padding: 4, borderRadius: 12, backgroundColor: colors.surfaceStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  messagingPrivacy: { gap: 12, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  messagingChoices: { overflow: 'hidden', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  messagingChoice: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  messagingChoiceActive: { backgroundColor: colors.violetSoft },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.textTertiary, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.violet },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.violet },
  messagingChoiceCopy: { flex: 1, minWidth: 0 },
  messagingChoiceTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  messagingChoiceText: { marginTop: 2, color: colors.textSecondary, fontSize: 9, lineHeight: 13, fontWeight: '600' },
  blockedRow: { minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface },
  blockedCopy: { flex: 1, minWidth: 0 },
  blockedName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  blockedUsername: { marginTop: 2, color: colors.textSecondary, fontSize: 9, fontWeight: '700' },
  unblockButton: { minHeight: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  unblockText: { color: colors.text, fontSize: 9, fontWeight: '900' },
  emptyBlocked: { minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  emptyBlockedText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  themeOption: { flex: 1, minWidth: 0, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9 },
  themeOptionActive: { backgroundColor: colors.violet },
  themeOptionPressed: { opacity: 0.76 },
  themeOptionText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
  themeOptionTextActive: { color: colors.white },
  hiddenArtistsRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingBottom: 12 },
  restoreTasteButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surfaceStrong, paddingHorizontal: 12 },
  restoreTasteText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  info: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: 11, gap: 5 },
  infoLabel: { color: colors.textTertiary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '900' },
  legalDocument: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 10, backgroundColor: colors.surfaceStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 11 },
  legalIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  legalCopy: { flex: 1, minWidth: 0 },
  legalTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  legalDescription: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  legalReader: { paddingHorizontal: 16, paddingBottom: 170, gap: 14 },
  legalReaderTitle: { marginTop: 2, color: colors.text, fontSize: 22, lineHeight: 26, fontWeight: '900' },
  legalReaderSubtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '800' },
  webDocumentButton: { alignSelf: 'flex-start', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, backgroundColor: '#171313', paddingHorizontal: 14 },
  webDocumentText: { color: '#FFFAF2', fontSize: 11, fontWeight: '900' },
  legalArticle: { borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  legalParagraph: { color: 'rgba(23,19,19,0.72)', fontSize: 12, lineHeight: 19, fontWeight: '600' },
  legalHeading: { marginTop: 14, color: '#171313', fontSize: 18, lineHeight: 23, fontWeight: '900' },
  legalSubheading: { marginTop: 8, color: '#171313', fontSize: 14, lineHeight: 19, fontWeight: '900' },
  legalListRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingLeft: 4 },
  legalBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: '#7C5CFF' },
  legalNumber: { minWidth: 18, color: '#7C5CFF', fontSize: 11, lineHeight: 19, fontWeight: '900' },
  legalListText: { flex: 1 },
  primary: { height: 48, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.violet },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  secondary: { height: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  secondaryText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  danger: { height: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.12)' },
  dangerText: { color: '#B91C1C', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  usageTrack: { height: 6, borderRadius: 999, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  usageFill: { height: 6, borderRadius: 999, backgroundColor: '#7C5CFF' },
  updateStatus: { minHeight: 64, borderLeftWidth: 3, borderLeftColor: colors.violet, backgroundColor: colors.violetSoft, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  updateStatusTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  updateStatusText: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
});

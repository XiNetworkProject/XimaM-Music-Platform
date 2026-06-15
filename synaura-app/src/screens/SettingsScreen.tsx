import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  deleteAccount,
  getMyProfile,
  getNotificationPrefs,
  getReferralData,
  getSubscriptionUsage,
  getUserPreferences,
  updateNotificationPrefs,
  updateProfile,
  updateUserPreferences,
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
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { validateSocialUrl, type SocialPlatform } from '@/utils/validateSocialUrl';
import { useNativeNotifications } from '@/notifications/NativeNotificationsProvider';

type Tab = 'profil' | 'compte' | 'preferences' | 'notifications' | 'events' | 'parrainage' | 'abonnement' | 'updates' | 'securite' | 'legal';
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

export function SettingsScreen() {
  const auth = useAuth();
  const appUpdate = useAppUpdate();
  const mobileSettings = useMobileSettings();
  const nativePush = useNativeNotifications();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('profil');
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [notif, setNotif] = useState<NotificationPrefs | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [eventPrefs, setEventPrefs] = useState<EventPrefs>({ autoParticipate: false, voteReminders: true, showBadges: true, resultNotifications: true, allowPulse: true });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', location: '', website: '', artistName: '', genreText: '', isArtist: false, instagram: '', youtube: '', tiktok: '', spotify: '', soundcloud: '', deezer: '', apple_music: '', twitch: '', discord: '', x: '', custom: '', badgesText: '', featuredTrackId: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [selectedLegalId, setSelectedLegalId] = useState<string | null>(null);
  const selectedLegal = legalContent.find((document) => document.id === selectedLegalId) || null;

  const tabs = useMemo<Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }>>(() => [
    { key: 'profil', label: 'Profil', icon: 'person-outline' },
    { key: 'compte', label: 'Compte', icon: 'id-card-outline' },
    { key: 'preferences', label: 'Prefs', icon: 'options-outline' },
    { key: 'notifications', label: 'Notifs', icon: 'notifications-outline' },
    { key: 'events', label: 'Events', icon: 'flash-outline' },
    { key: 'parrainage', label: 'Parrainage', icon: 'gift-outline' },
    { key: 'abonnement', label: 'Plan', icon: 'diamond-outline' },
    { key: 'updates', label: 'Mises a jour', icon: 'cloud-download-outline' },
    { key: 'securite', label: 'Securite', icon: 'shield-checkmark-outline' },
    { key: 'legal', label: 'Legal', icon: 'document-text-outline' },
  ], []);

  const load = useCallback(async () => {
    if (!auth.user?.username) return;
    setLoading(true);
    try {
      const [nextProfile, nextNotif, nextReferral, nextUsage, nextPreferences] = await Promise.all([
        getMyProfile(auth.user.username),
        getNotificationPrefs().catch(() => null),
        getReferralData(),
        getSubscriptionUsage(),
        getUserPreferences().catch(() => ({})),
      ]);
      setProfile(nextProfile);
      setNotif(nextNotif);
      setReferral(nextReferral);
      setUsage(nextUsage);
      setEventPrefs((current) => ({ ...current, ...((nextPreferences as Record<string, any>).events || {}) }));
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

  return (
    <SynauraBackground variant="warm">
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={20} color="#171313" /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Compte Synaura</Text>
            <Text style={styles.title}>Parametres</Text>
          </View>
          {loading ? <ActivityIndicator color="#171313" /> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((item) => (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabActive]}>
              <Ionicons name={item.icon} size={15} color={tab === item.key ? '#FFFAF2' : 'rgba(23,19,19,0.5)'} />
              <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

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
                    <Ionicons name={form.featuredTrackId === track._id ? 'radio-button-on' : 'radio-button-off'} size={18} color={form.featuredTrackId === track._id ? '#7C5CFF' : 'rgba(23,19,19,0.35)'} />
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
                void mobileSettings.updateSettings({ pushDevice: value });
                if (value) void nativePush.enable();
                else void nativePush.disable();
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
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => void nativePush.enable()} style={[styles.secondary, { flex: 1 }]}>
                <Text style={styles.secondaryText}>Activer</Text>
              </Pressable>
              <Pressable onPress={() => void nativePush.sendTest()} style={[styles.primary, { flex: 1 }]}>
                <Ionicons name="notifications-outline" size={16} color="#FFFAF2" />
                <Text style={styles.primaryText}>Tester</Text>
              </Pressable>
            </View>
            {notif ? (
              <>
                <Text style={styles.groupTitle}>Canaux</Text>
                {['push_enabled', 'email_enabled'].map((key) => key in notif ? <Toggle key={key} label={key.replace(/_/g, ' ')} value={Boolean((notif as any)[key])} onValueChange={(next) => void patchNotif({ [key]: next } as Partial<NotificationPrefs>)} /> : null)}
                <Text style={styles.groupTitle}>Social & musique</Text>
                {Object.entries(notif).filter(([key, value]) => typeof value === 'boolean' && !['push_enabled', 'email_enabled'].includes(key)).map(([key, value]) => (
                  <Toggle key={key} label={key.replace(/_/g, ' ')} value={Boolean(value)} onValueChange={(next) => void patchNotif({ [key]: next } as Partial<NotificationPrefs>)} />
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
  const webPath = document.id === 'fermeture' ? '/fermeture' : `/legal/${document.id}`;
  let number = 0;

  return (
    <SynauraBackground variant="warm">
      <ScrollView contentContainerStyle={[styles.legalReader, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
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
  content: { paddingHorizontal: 16, paddingBottom: 130, gap: 11 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  kicker: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -0.4 },
  muted: { color: 'rgba(23,19,19,0.55)', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  tabs: { gap: 8, paddingRight: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, borderRadius: 11, paddingHorizontal: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: '#171313', borderColor: '#171313' },
  tabText: { color: 'rgba(23,19,19,0.58)', fontSize: 11, fontWeight: '900' },
  tabTextActive: { color: '#FFFAF2' },
  section: { borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 13 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionText: { marginTop: 5, color: 'rgba(23,19,19,0.5)', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  sectionBody: { marginTop: 15, gap: 12 },
  groupTitle: { marginTop: 4, color: '#8B5CF6', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  featureChoice: { minHeight: 44, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F3F2EF', borderWidth: 1, borderColor: 'transparent' },
  featureChoiceActive: { backgroundColor: 'rgba(124,92,255,0.1)', borderColor: 'rgba(124,92,255,0.28)' },
  featureChoiceText: { flex: 1, color: '#171313', fontSize: 12, fontWeight: '900' },
  field: { gap: 7 },
  fieldHead: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: '#171313', fontSize: 12, fontWeight: '900' },
  hint: { color: 'rgba(23,19,19,0.38)', fontSize: 10, fontWeight: '800' },
  input: { minHeight: 44, borderRadius: 10, backgroundColor: '#F3F2EF', paddingHorizontal: 12, color: colors.text, fontSize: 14, fontWeight: '700' },
  inputMulti: { minHeight: 96, paddingTop: 12, paddingBottom: 12 },
  toggleRow: { minHeight: 50, borderRadius: 10, backgroundColor: '#F3F2EF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, color: '#171313', fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
  info: { borderRadius: 10, backgroundColor: '#F3F2EF', padding: 11, gap: 5 },
  infoLabel: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  infoValue: { color: '#171313', fontSize: 14, fontWeight: '900' },
  legalDocument: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 10, backgroundColor: '#F3F2EF', padding: 11 },
  legalIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.9)' },
  legalCopy: { flex: 1, minWidth: 0 },
  legalTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  legalDescription: { marginTop: 3, color: 'rgba(23,19,19,0.5)', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  legalReader: { paddingHorizontal: 16, paddingBottom: 170, gap: 14 },
  legalReaderTitle: { marginTop: 2, color: '#171313', fontSize: 22, lineHeight: 26, fontWeight: '900' },
  legalReaderSubtitle: { color: 'rgba(23,19,19,0.55)', fontSize: 12, lineHeight: 18, fontWeight: '800' },
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
  primary: { height: 48, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#171313' },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  secondary: { height: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.06)' },
  secondaryText: { color: '#171313', fontSize: 13, fontWeight: '900' },
  danger: { height: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.12)' },
  dangerText: { color: '#B91C1C', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  usageTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.08)', overflow: 'hidden' },
  usageFill: { height: 6, borderRadius: 999, backgroundColor: '#7C5CFF' },
  updateStatus: { minHeight: 64, borderRadius: 18, backgroundColor: 'rgba(124,92,255,0.08)', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  updateStatusTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  updateStatusText: { marginTop: 3, color: 'rgba(23,19,19,0.55)', fontSize: 10, lineHeight: 14, fontWeight: '700' },
});

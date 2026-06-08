import AsyncStorage from '@react-native-async-storage/async-storage';
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
  updateNotificationPrefs,
  updateProfile,
  type MobileProfile,
  type NotificationPrefs,
  type ReferralData,
  type SubscriptionUsage,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { ProfileImagePicker } from '@/components/profile/ProfileImagePicker';
import { SynauraBackground } from '@/components/SynauraBackground';
import legalContent from '@/legal/legalDocuments.json';
import { useAppUpdate } from '@/updates/UpdateProvider';

type Tab = 'profil' | 'compte' | 'preferences' | 'notifications' | 'parrainage' | 'abonnement' | 'updates' | 'securite' | 'legal';
type LegalDocument = (typeof legalContent)[number];
const PREFS_KEY = 'synaura.mobile.settings.v1';
const LEGAL_BASE_URL = 'https://www.synaura.fr';
const legalDocuments = [
  { label: 'Fermeture de Synaura', description: "Annonce officielle et date de fin du service", path: '/fermeture', icon: 'warning-outline' },
  { label: 'Mentions légales', description: 'Éditeur, hébergement et responsabilité', path: '/legal/mentions-legales', icon: 'business-outline' },
  { label: 'Politique de confidentialité', description: 'Collecte, traitement et conservation des données', path: '/legal/confidentialite', icon: 'shield-checkmark-outline' },
  { label: "Conditions générales d'utilisation", description: "Règles d'utilisation de la plateforme", path: '/legal/cgu', icon: 'document-text-outline' },
  { label: 'Conditions générales de vente', description: 'Abonnements, paiements et résiliation', path: '/legal/cgv', icon: 'card-outline' },
  { label: 'Politique des cookies', description: 'Cookies essentiels, analytiques et tiers', path: '/legal/cookies', icon: 'options-outline' },
  { label: 'Conformité RGPD', description: 'Droits, délais, sécurité et réclamations', path: '/legal/rgpd', icon: 'people-outline' },
] as const;

export function SettingsScreen() {
  const auth = useAuth();
  const appUpdate = useAppUpdate();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('profil');
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [notif, setNotif] = useState<NotificationPrefs | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [prefs, setPrefs] = useState({ autoplay: false, highQuality: true, activityVisible: true, pushDevice: true, reducedMotion: false });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', location: '', website: '', artistName: '', genreText: '', isArtist: false });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [selectedLegalId, setSelectedLegalId] = useState<string | null>(null);
  const selectedLegal = legalContent.find((document) => document.id === selectedLegalId) || null;

  const tabs = useMemo<Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }>>(() => [
    { key: 'profil', label: 'Profil', icon: 'person-outline' },
    { key: 'compte', label: 'Compte', icon: 'id-card-outline' },
    { key: 'preferences', label: 'Prefs', icon: 'options-outline' },
    { key: 'notifications', label: 'Notifs', icon: 'notifications-outline' },
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
      const [nextProfile, nextNotif, nextReferral, nextUsage, localPrefs] = await Promise.all([
        getMyProfile(auth.user.username),
        getNotificationPrefs().catch(() => null),
        getReferralData(),
        getSubscriptionUsage(),
        AsyncStorage.getItem(PREFS_KEY),
      ]);
      setProfile(nextProfile);
      setNotif(nextNotif);
      setReferral(nextReferral);
      setUsage(nextUsage);
      if (localPrefs) setPrefs((current) => ({ ...current, ...JSON.parse(localPrefs) }));
      setForm({
        name: nextProfile.name || '',
        bio: nextProfile.bio || '',
        location: nextProfile.location || '',
        website: nextProfile.website || '',
        artistName: nextProfile.artistName || '',
        genreText: nextProfile.genre.join(', '),
        isArtist: nextProfile.isArtist,
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
      setProfile(next);
    } finally {
      setSaving(false);
    }
  };

  const updateLocalPrefs = async (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const patchNotif = async (patch: Partial<NotificationPrefs>) => {
    const optimistic = { ...(notif || {} as NotificationPrefs), ...patch } as NotificationPrefs;
    setNotif(optimistic);
    const saved = await updateNotificationPrefs(patch);
    setNotif(saved);
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
            <Toggle label="Autoplay" value={prefs.autoplay} onValueChange={(value) => void updateLocalPrefs({ autoplay: value })} />
            <Toggle label="Qualite audio haute" value={prefs.highQuality} onValueChange={(value) => void updateLocalPrefs({ highQuality: value })} />
            <Toggle label="Activite visible" value={prefs.activityVisible} onValueChange={(value) => void updateLocalPrefs({ activityVisible: value })} />
            <Toggle label="Push appareil" value={prefs.pushDevice} onValueChange={(value) => void updateLocalPrefs({ pushDevice: value })} />
            <Toggle label="Reduire les animations" value={prefs.reducedMotion} onValueChange={(value) => void updateLocalPrefs({ reducedMotion: value })} />
          </Section>
        ) : null}

        {tab === 'notifications' ? (
          <Section title="Notifications" text="Choisis les alertes que tu veux garder.">
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
  content: { paddingHorizontal: 16, paddingBottom: 160, gap: 14 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.88)' },
  kicker: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' },
  title: { color: '#171313', fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  muted: { color: 'rgba(23,19,19,0.55)', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  tabs: { gap: 8, paddingRight: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, borderRadius: 19, paddingHorizontal: 12, backgroundColor: 'rgba(255,250,242,0.82)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  tabActive: { backgroundColor: '#171313', borderColor: '#171313' },
  tabText: { color: 'rgba(23,19,19,0.58)', fontSize: 11, fontWeight: '900' },
  tabTextActive: { color: '#FFFAF2' },
  section: { borderRadius: 26, backgroundColor: 'rgba(255,250,242,0.9)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', padding: 15 },
  sectionTitle: { color: '#171313', fontSize: 21, fontWeight: '900', letterSpacing: -0.5 },
  sectionText: { marginTop: 5, color: 'rgba(23,19,19,0.5)', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  sectionBody: { marginTop: 15, gap: 12 },
  groupTitle: { marginTop: 4, color: '#8B5CF6', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  field: { gap: 7 },
  fieldHead: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: '#171313', fontSize: 12, fontWeight: '900' },
  hint: { color: 'rgba(23,19,19,0.38)', fontSize: 10, fontWeight: '800' },
  input: { minHeight: 46, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.055)', paddingHorizontal: 13, color: '#171313', fontSize: 14, fontWeight: '700' },
  inputMulti: { minHeight: 96, paddingTop: 12, paddingBottom: 12 },
  toggleRow: { minHeight: 54, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, color: '#171313', fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
  info: { borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', padding: 13, gap: 5 },
  infoLabel: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  infoValue: { color: '#171313', fontSize: 14, fontWeight: '900' },
  legalDocument: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', padding: 12 },
  legalIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.9)' },
  legalCopy: { flex: 1, minWidth: 0 },
  legalTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  legalDescription: { marginTop: 3, color: 'rgba(23,19,19,0.5)', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  legalReader: { paddingHorizontal: 16, paddingBottom: 170, gap: 14 },
  legalReaderTitle: { marginTop: 2, color: '#171313', fontSize: 22, lineHeight: 26, fontWeight: '900' },
  legalReaderSubtitle: { color: 'rgba(23,19,19,0.55)', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  webDocumentButton: { alignSelf: 'flex-start', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 21, backgroundColor: '#171313', paddingHorizontal: 14 },
  webDocumentText: { color: '#FFFAF2', fontSize: 11, fontWeight: '900' },
  legalArticle: { borderRadius: 24, backgroundColor: 'rgba(255,250,242,0.92)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', padding: 16, gap: 10 },
  legalParagraph: { color: 'rgba(23,19,19,0.72)', fontSize: 12, lineHeight: 19, fontWeight: '600' },
  legalHeading: { marginTop: 14, color: '#171313', fontSize: 18, lineHeight: 23, fontWeight: '900' },
  legalSubheading: { marginTop: 8, color: '#171313', fontSize: 14, lineHeight: 19, fontWeight: '900' },
  legalListRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingLeft: 4 },
  legalBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: '#7C5CFF' },
  legalNumber: { minWidth: 18, color: '#7C5CFF', fontSize: 11, lineHeight: 19, fontWeight: '900' },
  legalListText: { flex: 1 },
  primary: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  secondary: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.07)' },
  secondaryText: { color: '#171313', fontSize: 13, fontWeight: '900' },
  danger: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.12)' },
  dangerText: { color: '#B91C1C', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  usageTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.08)', overflow: 'hidden' },
  usageFill: { height: 6, borderRadius: 999, backgroundColor: '#7C5CFF' },
  updateStatus: { minHeight: 64, borderRadius: 18, backgroundColor: 'rgba(124,92,255,0.08)', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  updateStatusTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  updateStatusText: { marginTop: 3, color: 'rgba(23,19,19,0.55)', fontSize: 10, lineHeight: 14, fontWeight: '700' },
});

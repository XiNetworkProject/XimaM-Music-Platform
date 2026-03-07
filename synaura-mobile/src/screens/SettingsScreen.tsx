import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT = '#7B61FF';
const ACCENT_CYAN = '#00D0BB';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.08)';
const DANGER = '#FF4466';

const STORAGE_KEYS = {
  AUTOPLAY: 'synaura.pref.autoplay',
  AUDIO_QUALITY: 'synaura.pref.audioQuality',
};

type AudioQuality = 'normal' | 'high';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();

  // Profile form
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Preferences
  const [autoplay, setAutoplay] = useState(true);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('normal');

  // Subscription
  const [plan, setPlan] = useState<string>('free');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    loadPreferences();
    loadProfileData();
    loadSubscription();
  }, []);

  const loadPreferences = async () => {
    try {
      const [ap, aq] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTOPLAY),
        AsyncStorage.getItem(STORAGE_KEYS.AUDIO_QUALITY),
      ]);
      if (ap !== null) setAutoplay(ap === 'true');
      if (aq === 'normal' || aq === 'high') setAudioQuality(aq);
    } catch {}
  };

  const loadProfileData = async () => {
    if (!user?.username) return;
    const res = await api.getUserProfile(user.username);
    if (res.success) {
      const p = res.data.user;
      setName(p.name ?? user.name ?? '');
      setBio(p.bio ?? '');
      setLocation(p.location ?? '');
      setWebsite(p.website ?? '');
    }
    setProfileLoaded(true);
  };

  const loadSubscription = async () => {
    const res = await api.getMySubscription();
    if (res.success) {
      setPlan(res.data.plan ?? 'free');
    }
    if (user?.username) {
      setReferralCode(`https://synaura.com/invite/${user.username}`);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const res = await api.updateProfile({ name: name.trim(), bio: bio.trim(), location: location.trim(), website: website.trim() });
    setSaving(false);
    if (res.success) {
      Alert.alert('Succès', 'Profil mis à jour avec succès.');
    } else {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil.');
    }
  };

  const handleAutoplayToggle = async (value: boolean) => {
    setAutoplay(value);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTOPLAY, String(value));
  };

  const handleQualityChange = async () => {
    const next: AudioQuality = audioQuality === 'normal' ? 'high' : 'normal';
    setAudioQuality(next);
    await AsyncStorage.setItem(STORAGE_KEYS.AUDIO_QUALITY, next);
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Changer le mot de passe',
      'Un email de réinitialisation sera envoyé à votre adresse email.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: () => Alert.alert('Email envoyé', 'Vérifiez votre boîte de réception.'),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmation finale',
              'Êtes-vous vraiment sûr(e) de vouloir supprimer votre compte ?',
              [
                { text: 'Non', style: 'cancel' },
                {
                  text: 'Oui, supprimer',
                  style: 'destructive',
                  onPress: () => signOut(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleCopyReferral = () => {
    Alert.alert('Lien de parrainage', referralCode);
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);
  };

  const displayName = user?.name || user?.username || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ═══ Profil ═══ */}
        <SectionHeader icon="person-outline" title="Profil" />
        <View style={styles.card}>
          {/* Avatar */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[ACCENT, ACCENT_CYAN]}
                  style={styles.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.avatarName}>{displayName}</Text>
              <Text style={styles.avatarUsername}>@{user?.username ?? ''}</Text>
            </View>
            <Pressable style={styles.smallButton}>
              <Ionicons name="camera-outline" size={16} color={ACCENT} />
              <Text style={styles.smallButtonText}>Modifier</Text>
            </Pressable>
          </View>

          <View style={styles.separator} />

          <FormField label="Nom" value={name} onChangeText={setName} placeholder="Votre nom" />
          <FormField label="Bio" value={bio} onChangeText={setBio} placeholder="Décrivez-vous..." multiline />
          <FormField label="Localisation" value={location} onChangeText={setLocation} placeholder="Ville, pays" />
          <FormField label="Site web" value={website} onChangeText={setWebsite} placeholder="https://..." keyboardType="url" />

          <Pressable style={styles.saveButton} onPress={handleSaveProfile} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ═══ Compte ═══ */}
        <SectionHeader icon="shield-outline" title="Compte" />
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="mail-outline" size={18} color={ACCENT} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.separator} />
          <Pressable style={styles.rowButton} onPress={handleChangePassword}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={ACCENT} />
            </View>
            <Text style={styles.rowButtonText}>Changer le mot de passe</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        </View>

        {/* ═══ Préférences ═══ */}
        <SectionHeader icon="options-outline" title="Préférences" />
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons name="play-forward-outline" size={18} color={ACCENT} />
              <Text style={styles.switchLabel}>Lecture automatique</Text>
            </View>
            <Switch
              value={autoplay}
              onValueChange={handleAutoplayToggle}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(123,97,255,0.4)' }}
              thumbColor={autoplay ? ACCENT : '#666'}
            />
          </View>
          <View style={styles.separator} />
          <Pressable style={styles.rowButton} onPress={handleQualityChange}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="volume-high-outline" size={18} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowButtonText}>Qualité audio</Text>
              <Text style={styles.rowButtonSub}>{audioQuality === 'high' ? 'Haute' : 'Normale'}</Text>
            </View>
            <View style={[styles.qualityBadge, audioQuality === 'high' && styles.qualityBadgeHigh]}>
              <Text style={[styles.qualityBadgeText, audioQuality === 'high' && styles.qualityBadgeTextHigh]}>
                {audioQuality === 'high' ? 'HQ' : 'STD'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ═══ Abonnement ═══ */}
        <SectionHeader icon="diamond-outline" title="Abonnement" />
        <View style={styles.card}>
          <View style={styles.planRow}>
            <LinearGradient
              colors={[ACCENT, ACCENT_CYAN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.planBadge}
            >
              <Text style={styles.planBadgeText}>{plan.toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>Plan actuel</Text>
              <Text style={styles.planSub}>{plan === 'free' ? 'Gratuit' : plan}</Text>
            </View>
            <Pressable
              style={styles.manageButton}
              onPress={() => {
                try {
                  navigation.navigate('Premium');
                } catch {
                  Alert.alert('Premium', 'Découvrez les avantages Premium.');
                }
              }}
            >
              <Text style={styles.manageButtonText}>Gérer</Text>
              <Ionicons name="chevron-forward" size={16} color={ACCENT} />
            </Pressable>
          </View>
        </View>

        {/* ═══ Parrainage ═══ */}
        <SectionHeader icon="gift-outline" title="Parrainage" />
        <View style={styles.card}>
          <Text style={styles.referralHint}>Partagez votre lien pour inviter vos amis :</Text>
          <View style={styles.referralRow}>
            <View style={styles.referralLink}>
              <Text style={styles.referralText} numberOfLines={1}>{referralCode || '—'}</Text>
            </View>
            <Pressable style={styles.copyButton} onPress={handleCopyReferral}>
              <Ionicons name="copy-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* ═══ Sécurité ═══ */}
        <SectionHeader icon="warning-outline" title="Sécurité" />
        <View style={styles.card}>
          <Pressable style={styles.dangerButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={18} color={DANGER} />
            <Text style={styles.dangerButtonText}>Supprimer mon compte</Text>
          </Pressable>
        </View>

        {/* ═══ Légal ═══ */}
        <SectionHeader icon="document-text-outline" title="Légal" />
        <View style={styles.card}>
          <LegalLink label="Mentions légales" url="https://synaura.com/legal" />
          <View style={styles.separator} />
          <LegalLink label="Conditions Générales d'Utilisation" url="https://synaura.com/cgu" />
          <View style={styles.separator} />
          <LegalLink label="Politique de confidentialité" url="https://synaura.com/privacy" />
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={DANGER} />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>

        <Text style={styles.versionText}>Synaura Mobile v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

/* ─── Sub-components ─── */

function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={ACCENT} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'url';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.25)"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable style={styles.rowButton} onPress={() => Linking.openURL(url).catch(() => {})}>
      <Ionicons name="document-outline" size={18} color={colors.textTertiary} />
      <Text style={[styles.rowButtonText, { flex: 1 }]}>{label}</Text>
      <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020017',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },

  /* Section */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  /* Card */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: CARD_BORDER,
    marginVertical: 12,
  },

  /* Avatar section */
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  avatarInfo: {
    flex: 1,
  },
  avatarName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  avatarUsername: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(123,97,255,0.12)',
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },

  /* Form */
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: colors.textPrimary,
    fontSize: 15,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  /* Save */
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  /* Info row */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(123,97,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 2,
  },

  /* Row button */
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  rowButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  rowButtonSub: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },

  /* Switch */
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  /* Quality badge */
  qualityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  qualityBadgeHigh: {
    backgroundColor: 'rgba(0,208,187,0.15)',
  },
  qualityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  qualityBadgeTextHigh: {
    color: ACCENT_CYAN,
  },

  /* Plan */
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  planBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  planSub: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(123,97,255,0.12)',
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },

  /* Referral */
  referralHint: {
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 10,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  referralLink: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  referralText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Danger */
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,68,102,0.3)',
    backgroundColor: 'rgba(255,68,102,0.08)',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: DANGER,
  },

  /* Sign out */
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(255,68,102,0.2)',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: DANGER,
  },

  /* Version */
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 16,
    marginBottom: 8,
    opacity: 0.6,
  },
});

export default SettingsScreen;

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthGoogleButton,
  AuthInfo,
  AuthPrimaryButton,
  AuthScreen,
  AuthTitle,
  AuthTopBar,
  authStyles,
} from '@/components/auth/AuthUI';
import { Reveal } from '@/components/motion/Motion';

type FormData = {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type UserCount = {
  userCount: number;
  maxUsers: number;
  canRegister: boolean;
  remainingSlots: number;
};

const STEPS = [
  { eyebrow: 'Découvrir', title: 'Ton identité', text: 'Pose ton nom public et ton @.' },
  { eyebrow: 'Publier', title: 'Ton accès', text: "Ajoute l'email du compte." },
  { eyebrow: 'Connecter', title: 'Sécurité', text: 'Crée le mot de passe et termine.' },
] as const;

export function RegisterScreen() {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ name: '', username: '', email: '', password: '', confirmPassword: '' });
  const [userCount, setUserCount] = useState<UserCount | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/count-users`, { headers: { Accept: 'application/json' } })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data?.canRegister === 'boolean') setUserCount(data);
      })
      .catch(() => {});
  }, []);

  const current = STEPS[step];
  const passwordScore = useMemo(() => {
    let score = 0;
    if (form.password.length >= 6) score += 1;
    if (form.password.length >= 10) score += 1;
    if (/[A-Z]/.test(form.password) && /[a-z]/.test(form.password)) score += 1;
    if (/\d/.test(form.password)) score += 1;
    if (/[^A-Za-z0-9]/.test(form.password)) score += 1;
    return Math.min(score, 5);
  }, [form.password]);

  const patch = (key: keyof FormData, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: key === 'username' ? value.replace(/\s/g, '').toLowerCase() : value,
    }));
    setError('');
  };

  const validate = (target = step) => {
    if (target === 0) {
      if (!form.name.trim()) return 'Ajoute ton nom affiché.';
      if (!form.username.trim() || form.username.length < 3) return "Ton nom d'utilisateur doit contenir au moins 3 caractères.";
      if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return "Ton nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores.";
    }
    if (target === 1 && (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))) return 'Ajoute un email valide.';
    if (target === 2) {
      if (form.password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.';
      if (form.password !== form.confirmPassword) return 'Les deux mots de passe ne correspondent pas.';
    }
    return '';
  };

  const goNext = async () => {
    const message = validate(step);
    if (message) {
      setError(message);
      return;
    }
    if (step < STEPS.length - 1) {
      void Haptics.selectionAsync().catch(() => {});
      setStep((value) => value + 1);
      return;
    }
    if (userCount?.canRegister === false) {
      setError('Les inscriptions sont fermées pour le moment.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const referralCode = await AsyncStorage.getItem('synaura_referral_code');
      const messageText = await auth.register({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        referralCode: referralCode || undefined,
      });
      if (referralCode) await AsyncStorage.removeItem('synaura_referral_code');
      navigation.replace('Login', { message: messageText || 'Compte créé. Connecte-toi pour continuer.' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <AuthTopBar caption="Inscription" onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs')} />
      <AuthCard>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
        <AuthTitle eyebrow={current.eyebrow} title={current.title} text={current.text} />

        {userCount?.canRegister === false ? (
          <AuthAlert text={`Inscriptions fermées (${userCount.maxUsers} comptes max atteints)`} />
        ) : null}
        {error ? <AuthAlert text={error} /> : null}

        <View style={authStyles.formGap}>
          <Reveal key={step} distance={7} duration={300}>
          {step === 0 ? (
            <>
              <AuthField
                label="Nom affiché"
                icon="person"
                value={form.name}
                onChangeText={(value) => patch('name', value)}
                placeholder="Maxime"
                textContentType="name"
                editable={!loading}
                returnKeyType="next"
              />
              <AuthField
                label="Nom d'utilisateur"
                icon="at"
                value={form.username}
                onChangeText={(value) => patch('username', value)}
                placeholder="maxmusic"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />
              <AuthInfo
                icon="person-circle-outline"
                title="Profil public"
                text="Ce pseudo sera utilisé sur ton profil public. Tu pourras ajouter avatar, bio et liens ensuite."
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <AuthField
                label="Email"
                icon="mail"
                value={form.email}
                onChangeText={(value) => patch('email', value)}
                placeholder="vous@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
                returnKeyType="next"
              />
              <AuthGoogleButton onPress={() => Linking.openURL(`${API_BASE_URL}/auth/signup`)} />
              <AuthInfo
                icon="shield-checkmark-outline"
                title="Pourquoi l'email ?"
                text="Il sert à sécuriser ton accès, récupérer ton compte et recevoir les notifications importantes."
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <AuthField
                label="Mot de passe"
                icon="lock-closed"
                rightIcon={showPassword ? 'eye-off' : 'eye'}
                onRightPress={() => setShowPassword((value) => !value)}
                value={form.password}
                onChangeText={(value) => patch('password', value)}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                placeholder="6 caractères minimum"
                editable={!loading}
                returnKeyType="next"
              />
              <View style={styles.scoreRow}>
                {[0, 1, 2, 3, 4].map((index) => (
                  <View key={index} style={[styles.score, index < passwordScore && styles.scoreActive]} />
                ))}
              </View>
              <AuthField
                label="Confirmation"
                icon="lock-closed"
                rightIcon={showConfirm ? 'eye-off' : 'eye'}
                onRightPress={() => setShowConfirm((value) => !value)}
                value={form.confirmPassword}
                onChangeText={(value) => patch('confirmPassword', value)}
                secureTextEntry={!showConfirm}
                textContentType="newPassword"
                placeholder="Répète le mot de passe"
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={() => void goNext()}
              />
              <AuthInfo
                icon="checkmark-circle-outline"
                title="Résumé"
                text={`${form.name || 'Nom'} · @${form.username || 'pseudo'}\n${form.email || 'email'}`}
              />
            </>
          ) : null}
          </Reveal>

          {userCount && userCount.remainingSlots > 0 && userCount.canRegister ? (
            <View style={styles.slots}>
              <Ionicons name="people" size={15} color="rgba(23,19,19,0.48)" />
              <Text style={styles.slotsText}>{userCount.remainingSlots} places restantes sur {userCount.maxUsers}</Text>
            </View>
          ) : null}

          <View style={authStyles.actionsRow}>
            <Pressable
              disabled={step === 0 || loading}
              onPress={() => {
                setError('');
                void Haptics.selectionAsync().catch(() => {});
                setStep((value) => Math.max(0, value - 1));
              }}
              style={[authStyles.actionGhost, step === 0 && styles.disabled]}
            >
              <Text style={authStyles.actionGhostText}>Retour</Text>
            </Pressable>
            <AuthPrimaryButton
              label={loading ? 'Création...' : step === STEPS.length - 1 ? 'Créer mon compte' : 'Continuer'}
              icon={!loading ? 'arrow-forward' : undefined}
              loading={loading}
              disabled={userCount?.canRegister === false}
              onPress={() => void goNext()}
            />
          </View>

          <Text style={authStyles.switchText}>
            Déjà un compte ?{' '}
            <Text style={authStyles.link} onPress={() => navigation.replace('Login')}>Se connecter</Text>
          </Text>
          <Text style={authStyles.legalText}>
            En créant un compte, tu acceptes les{' '}
            <Text style={authStyles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/legal/cgv`)}>CGV</Text>
            {' '}et la{' '}
            <Text style={authStyles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/legal/confidentialite`)}>politique de confidentialité</Text>.
          </Text>
        </View>
      </AuthCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 7, marginBottom: 17, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.10)' },
  progressFill: { height: 7, borderRadius: 999, backgroundColor: '#171313' },
  scoreRow: { flexDirection: 'row', gap: 6 },
  score: { flex: 1, height: 7, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.10)' },
  scoreActive: { backgroundColor: '#171313' },
  slots: { minHeight: 38, borderRadius: 8, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(23,19,19,0.045)' },
  slotsText: { color: 'rgba(23,19,19,0.48)', fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.35 },
});

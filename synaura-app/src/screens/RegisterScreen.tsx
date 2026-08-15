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
  AuthCheckRow,
  AuthDivider,
  AuthField,
  AuthGoogleButton,
  AuthInfo,
  AuthPhoneButton,
  AuthPrimaryButton,
  AuthScreen,
  AuthTitle,
  AuthTopBar,
  authStyles,
} from '@/components/auth/AuthUI';
import { Reveal } from '@/components/motion/Motion';
import { isOnboardingCompleted } from '@/onboarding/checkOnboarding';
import { colors } from '@/theme/tokens';

type FormData = {
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  birthDate: string;
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
  { eyebrow: 'Identite', title: 'Qui es-tu ?', text: 'Commence par ton prenom et ton nom.' },
  { eyebrow: 'Profil', title: 'Cree ton espace.', text: 'Choisis ce que les autres membres verront.' },
  { eyebrow: 'Securite', title: 'Protege ton acces.', text: 'Valide ton email et choisis un mot de passe solide.' },
] as const;

const EMPTY_FORM: FormData = {
  firstName: '',
  lastName: '',
  name: '',
  username: '',
  birthDate: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export function RegisterScreen() {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [userCount, setUserCount] = useState<UserCount | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState(false);
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
    if (form.password.length >= 10) score += 1;
    if (form.password.length >= 14) score += 1;
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
      if (!form.firstName.trim()) return 'Ajoute ton prenom.';
      if (!form.lastName.trim()) return 'Ajoute ton nom.';
    }
    if (target === 1) {
      if (!form.name.trim()) return 'Ajoute ton nom affiche.';
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username)) {
        return 'Le pseudo doit contenir 3 a 30 lettres, chiffres ou underscores.';
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) {
        return 'Entre ta date de naissance au format AAAA-MM-JJ.';
      }
    }
    if (target === 2) {
      if (!/\S+@\S+\.\S+/.test(form.email)) return 'Ajoute un email valide.';
      if (form.password.length < 10) return 'Le mot de passe doit contenir au moins 10 caracteres.';
      if (form.password !== form.confirmPassword) return 'Les deux mots de passe ne correspondent pas.';
      if (!acceptTerms || !acceptPrivacy) return 'Accepte les conditions et la politique de confidentialite.';
    }
    return '';
  };

  const afterSocialLogin = async () => {
    const completed = await isOnboardingCompleted();
    navigation.reset({
      index: 0,
      routes: [{ name: completed ? 'Tabs' : 'Onboarding' }],
    });
  };

  const continueWithGoogle = async () => {
    setProviderLoading(true);
    setError('');
    try {
      await auth.loginWithGoogle();
      await afterSocialLogin();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion Google impossible');
    } finally {
      setProviderLoading(false);
    }
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
      setError('Les inscriptions sont fermees pour le moment.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const referralCode = await AsyncStorage.getItem('synaura_referral_code');
      const messageText = await auth.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        birthDate: form.birthDate,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        acceptTerms,
        acceptPrivacy,
        referralCode: referralCode || undefined,
      });
      if (referralCode) await AsyncStorage.removeItem('synaura_referral_code');
      navigation.replace('Login', { message: messageText });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <AuthTopBar
        caption="Inscription"
        onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs')}
      />
      <AuthCard>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
        <AuthTitle eyebrow={current.eyebrow} title={current.title} text={current.text} />

        {userCount?.canRegister === false ? (
          <AuthAlert text={`Inscriptions fermees (${userCount.maxUsers} comptes maximum atteints)`} />
        ) : null}
        {error ? <AuthAlert text={error} /> : null}

        {step === 0 && (auth.capabilities.google || auth.capabilities.phone) ? (
          <View style={authStyles.formGap}>
            {auth.capabilities.google ? (
              <AuthGoogleButton
                loading={providerLoading}
                disabled={loading}
                onPress={() => void continueWithGoogle()}
              />
            ) : null}
            {auth.capabilities.phone ? (
              <AuthPhoneButton
                disabled={loading || providerLoading}
                onPress={() => navigation.navigate('PhoneAuth')}
              />
            ) : null}
            <AuthDivider label="OU CREER AVEC EMAIL" />
          </View>
        ) : null}

        <View style={authStyles.formGap}>
          <Reveal key={step} distance={7} duration={300}>
            {step === 0 ? (
              <View style={authStyles.formGap}>
                <AuthField
                  label="Prenom"
                  icon="person-outline"
                  value={form.firstName}
                  onChangeText={(value) => patch('firstName', value)}
                  placeholder="Maxime"
                  textContentType="givenName"
                  autoComplete="name-given"
                  editable={!loading}
                />
                <AuthField
                  label="Nom"
                  icon="person-outline"
                  value={form.lastName}
                  onChangeText={(value) => patch('lastName', value)}
                  placeholder="Martin"
                  textContentType="familyName"
                  autoComplete="name-family"
                  editable={!loading}
                />
                <AuthInfo
                  icon="lock-closed-outline"
                  title="Identite privee"
                  text="Ton prenom, ton nom et ta date complete ne sont pas affiches publiquement."
                />
              </View>
            ) : null}

            {step === 1 ? (
              <View style={authStyles.formGap}>
                <AuthField
                  label="Nom affiche"
                  icon="id-card-outline"
                  value={form.name}
                  onChangeText={(value) => patch('name', value)}
                  placeholder={`${form.firstName} ${form.lastName}`.trim() || 'Max Music'}
                  editable={!loading}
                />
                <AuthField
                  label="Pseudo"
                  icon="at"
                  value={form.username}
                  onChangeText={(value) => patch('username', value)}
                  placeholder="maxmusic"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <AuthField
                  label="Date de naissance"
                  icon="calendar-outline"
                  value={form.birthDate}
                  onChangeText={(value) => patch('birthDate', value.replace(/[^\d-]/g, '').slice(0, 10))}
                  placeholder="AAAA-MM-JJ"
                  keyboardType="numbers-and-punctuation"
                  textContentType="birthdate"
                  editable={!loading}
                />
                <AuthInfo
                  icon="calendar-clear-outline"
                  title="Anniversaire prive par defaut"
                  text="Tu pourras choisir plus tard de montrer uniquement le jour et le mois a tes amis."
                />
              </View>
            ) : null}

            {step === 2 ? (
              <View style={authStyles.formGap}>
                <AuthField
                  label="Email"
                  icon="mail-outline"
                  value={form.email}
                  onChangeText={(value) => patch('email', value)}
                  placeholder="vous@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                />
                <AuthField
                  label="Mot de passe"
                  icon="lock-closed"
                  rightIcon={showPassword ? 'eye-off' : 'eye'}
                  onRightPress={() => setShowPassword((value) => !value)}
                  value={form.password}
                  onChangeText={(value) => patch('password', value)}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  placeholder="10 caracteres minimum"
                  editable={!loading}
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
                  placeholder="Repete le mot de passe"
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={() => void goNext()}
                />
                <AuthCheckRow
                  checked={acceptTerms}
                  label="J'accepte les conditions d'utilisation."
                  onPress={() => setAcceptTerms((value) => !value)}
                />
                <AuthCheckRow
                  checked={acceptPrivacy}
                  label="J'ai lu la politique de confidentialite."
                  onPress={() => setAcceptPrivacy((value) => !value)}
                />
              </View>
            ) : null}
          </Reveal>

          {userCount && userCount.remainingSlots > 0 && userCount.canRegister ? (
            <View style={styles.slots}>
              <Ionicons name="people" size={15} color={colors.textSecondary} />
              <Text style={styles.slotsText}>
                {userCount.remainingSlots} places restantes sur {userCount.maxUsers}
              </Text>
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
              label={loading ? 'Creation...' : step === STEPS.length - 1 ? 'Creer mon compte' : 'Continuer'}
              icon={!loading ? 'arrow-forward' : undefined}
              loading={loading}
              disabled={userCount?.canRegister === false}
              onPress={() => void goNext()}
            />
          </View>

          <Text style={authStyles.switchText}>
            Deja un compte ?{' '}
            <Text style={authStyles.link} onPress={() => navigation.replace('Login')}>Se connecter</Text>
          </Text>
          <Text style={authStyles.legalText}>
            Consulte les{' '}
            <Text style={authStyles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/legal/cgv`)}>
              conditions
            </Text>
            {' '}et la{' '}
            <Text
              style={authStyles.legalLink}
              onPress={() => Linking.openURL(`${API_BASE_URL}/legal/confidentialite`)}
            >
              politique de confidentialite
            </Text>.
          </Text>
        </View>
      </AuthCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 7, marginBottom: 17, borderRadius: 7, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  progressFill: { height: 7, borderRadius: 7, backgroundColor: colors.violet },
  scoreRow: { flexDirection: 'row', gap: 6 },
  score: { flex: 1, height: 7, borderRadius: 7, backgroundColor: colors.surfaceMuted },
  scoreActive: { backgroundColor: colors.cyan },
  slots: { minHeight: 38, borderRadius: 8, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surfaceMuted },
  slotsText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.35 },
});

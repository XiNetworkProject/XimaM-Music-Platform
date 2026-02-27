// Connexion — aligné sur Synaura web (auth/signin)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { SynauraLogotype } from '../components/SynauraLogo';

const { width } = Dimensions.get('window');

type LoginScreenProps = { navigation: any; route?: { params?: { message?: string } } };

export default function LoginScreen({ navigation, route }: LoginScreenProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userCount, setUserCount] = useState<{
    userCount: number;
    maxUsers: number;
    canRegister: boolean;
    remainingSlots: number;
  } | null>(null);

  const messageParam = route?.params?.message;

  useEffect(() => {
    if (messageParam) setSuccessMessage(messageParam);
  }, [messageParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await api.getCountUsers();
      if (!cancelled && r.success) setUserCount(r.data);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const r = await signIn(email.trim().toLowerCase(), password);
      if (r.ok) {
        navigation.goBack();
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } catch {
      setError('Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#020017', '#05010b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.backgroundGrid} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.backText}>Retour à l'accueil</Text>
              </Pressable>
            </View>

            <View style={styles.headerForm}>
              <View style={styles.headerFormIcon}>
                <LinearGradient colors={['#8b5cf6', '#d946ef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerFormIconGrad}>
                  <Ionicons name="musical-notes" size={18} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.headerFormLabel}>Connexion</Text>
              <Text style={styles.headerFormTitle}>Bienvenue sur Synaura</Text>
              <Text style={styles.headerFormSubtitle}>Entrez vos identifiants pour accéder à votre espace.</Text>
            </View>

            {successMessage ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={20} color="#6ee7b7" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#fca5a5" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  placeholder="vous@example.com"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  style={styles.textInput}
                />
                <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={12}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => Alert.alert('Mot de passe oublié', 'La réinitialisation se fait via le site web Synaura.')}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </Pressable>

            <Pressable
              disabled={isLoading}
              onPress={handleLogin}
              style={({ pressed }) => [styles.submitBtn, pressed && !isLoading && { opacity: 0.95 }, isLoading && styles.submitBtnDisabled]}
            >
              <LinearGradient
                colors={['#8b5cf6', '#d946ef', '#22d3ee']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isLoading ? (
                  <View style={styles.submitInner}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.submitText}>Connexion...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>Se connecter</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Pas encore de compte ?{' '}
                {userCount?.canRegister !== false ? (
                  <Text style={styles.footerLink} onPress={() => navigation.navigate('SignUp')}>Créer un compte</Text>
                ) : (
                  <Text style={styles.footerLinkDisabled}>Inscriptions fermées (limite atteinte)</Text>
                )}
              </Text>
              {userCount ? (
                <View style={styles.userCountPill}>
                  <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.userCountText}>
                    {userCount.userCount}/{userCount.maxUsers} comptes créés
                    {userCount.remainingSlots > 0 ? ` · ${userCount.remainingSlots} places restantes` : ''}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.legalText}>
                En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020017' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  backgroundGrid: { position: 'absolute', inset: 0, opacity: 0.14, backgroundColor: 'transparent' },
  glowTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 999,
    backgroundColor: 'rgba(139,92,246,0.55)',
    opacity: 0.7,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    right: -80,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.5)',
    opacity: 0.7,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 20,
  },
  cardTopRow: { marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  headerForm: { marginBottom: 16 },
  headerFormIcon: { marginBottom: 8 },
  headerFormIconGrad: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerFormLabel: { fontSize: 11, letterSpacing: 2.4, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 4 },
  headerFormTitle: { fontSize: 22, fontWeight: '600', color: '#fff', marginBottom: 4 },
  headerFormSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(52,211,153,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.7)',
    marginBottom: 12,
  },
  successText: { flex: 1, fontSize: 14, color: '#a7f3d0' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.7)',
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 14, color: '#fecaca' },
  fieldBlock: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#fff' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 8 },
  forgotText: { fontSize: 12, color: '#a78bfa' },
  submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.6 },
  submitGradient: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  footer: { marginTop: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 8 },
  footerLink: { color: '#a78bfa', fontWeight: '600' },
  footerLinkDisabled: { color: '#fca5a5' },
  userCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  userCountText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  legalText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
});

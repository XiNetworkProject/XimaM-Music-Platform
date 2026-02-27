// Inscription — aligné sur Synaura web (auth/signup)

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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

type SignUpScreenProps = { navigation: any };

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userCount, setUserCount] = useState<{
    userCount: number;
    maxUsers: number;
    canRegister: boolean;
    remainingSlots: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await api.getCountUsers();
      if (!cancelled && r.success) setUserCount(r.data);
    })();
    return () => { cancelled = true; };
  }, []);

  const validate = (): boolean => {
    if (!name.trim()) { setError('Le nom est requis'); return false; }
    if (!username.trim()) { setError("Le nom d'utilisateur est requis"); return false; }
    if (username.trim().length < 3) { setError("Le nom d'utilisateur doit contenir au moins 3 caractères"); return false; }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError("Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores");
      return false;
    }
    if (!email.trim()) { setError("L'email est requis"); return false; }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError("Format d'email invalide"); return false; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return false; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return false; }
    return true;
  };

  const handleSignUp = async () => {
    if (userCount && !userCount.canRegister) {
      setError('Les inscriptions sont fermées. La limite de comptes a été atteinte.');
      return;
    }
    if (!validate()) return;
    setError('');
    setIsLoading(true);
    try {
      const r = await signUp({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      navigation.navigate('Login', {
        message: 'Inscription réussie ! Vous pouvez maintenant vous connecter.',
      });
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = userCount?.canRegister !== false && !isLoading;

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
              <Text style={styles.smallText}>
                Déjà un compte ?{' '}
                <Text style={styles.linkText} onPress={() => navigation.navigate('Login')}>Se connecter</Text>
              </Text>
            </View>

            <View style={styles.headerForm}>
              <View style={styles.headerFormIcon}>
                <LinearGradient colors={['#8b5cf6', '#d946ef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerFormIconGrad}>
                  <Ionicons name="musical-notes" size={18} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.headerFormLabel}>Inscription</Text>
              <Text style={styles.headerFormTitle}>Crée ton compte Synaura</Text>
              <Text style={styles.headerFormSubtitle}>Choisis ton pseudo, ton email et ton mot de passe pour commencer.</Text>
            </View>

            {userCount && !userCount.canRegister ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#fca5a5" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.errorText, { fontWeight: '600' }]}>Inscriptions fermées</Text>
                  <Text style={[styles.errorText, { fontSize: 12, marginTop: 2 }]}>
                    La limite de {userCount.maxUsers} comptes a été atteinte pour le moment.
                  </Text>
                </View>
              </View>
            ) : null}

            {userCount && userCount.canRegister ? (
              <View style={styles.userCountBar}>
                <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.75)" />
                <Text style={styles.userCountBarText}>
                  {userCount.userCount}/{userCount.maxUsers} comptes créés
                  {userCount.remainingSlots > 0 ? ` · ${userCount.remainingSlots} places restantes` : ''}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#fca5a5" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Nom complet</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  value={name}
                  onChangeText={(t) => { setName(t); setError(''); }}
                  placeholder="Votre nom complet"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  editable={!isLoading}
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Nom d'utilisateur</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="at-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  value={username}
                  onChangeText={(t) => { setUsername(t); setError(''); }}
                  placeholder="nom_utilisateur"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  autoCapitalize="none"
                  editable={!isLoading}
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  placeholder="vous@example.com"
                  placeholderTextColor="rgba(255,255,255,0.5)"
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
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  style={styles.textInput}
                />
                <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={12}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  secureTextEntry={!showConfirm}
                  editable={!isLoading}
                  style={styles.textInput}
                />
                <Pressable onPress={() => setShowConfirm((p) => !p)} hitSlop={12}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>
            </View>

            <Pressable
              disabled={!canSubmit}
              onPress={handleSignUp}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && canSubmit && { opacity: 0.95 },
                !canSubmit && styles.submitBtnDisabled,
              ]}
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
                    <Text style={styles.submitText}>Création du compte...</Text>
                  </View>
                ) : userCount && !userCount.canRegister ? (
                  <Text style={styles.submitText}>Inscriptions fermées</Text>
                ) : (
                  <Text style={styles.submitText}>Créer mon compte</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Text style={styles.legalText}>
              En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020017' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 40 },
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
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  smallText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  linkText: { color: '#a78bfa', fontWeight: '600' },
  headerForm: { marginBottom: 16 },
  headerFormIcon: { marginBottom: 8 },
  headerFormIconGrad: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerFormLabel: { fontSize: 11, letterSpacing: 2.4, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 4 },
  headerFormTitle: { fontSize: 22, fontWeight: '600', color: '#fff', marginBottom: 4 },
  headerFormSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  userCountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  userCountBarText: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
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
  errorText: { fontSize: 14, color: '#fecaca', flex: 1 },
  fieldBlock: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.9)', marginBottom: 6 },
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
  submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.6 },
  submitGradient: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  legalText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 16 },
});

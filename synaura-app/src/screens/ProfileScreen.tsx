import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { SynauraBackground } from '@/components/SynauraBackground';
import { colors, radius, spacing } from '@/theme/tokens';

const rows = [
  { icon: 'musical-notes', title: 'Audio natif', text: 'Lecture en veille, notification media et boutons casque.' },
  { icon: 'cloud', title: 'API Synaura', text: API_BASE_URL.replace(/^https?:\/\//, '') },
  { icon: 'phone-portrait', title: 'Installation', text: 'APK Android puis Play Store. iOS via TestFlight/App Store.' },
  { icon: 'person-circle', title: 'Compte', text: 'Connexion Synaura a brancher sur le flux auth mobile.' },
];

export function ProfileScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await auth.login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SynauraBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profil</Text>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            {auth.user?.avatar ? (
              <Text style={styles.avatarText}>{(auth.user.name || auth.user.username || 'S').slice(0, 1).toUpperCase()}</Text>
            ) : (
              <Ionicons name="person" size={44} color={colors.text} />
            )}
          </View>
          <Text style={styles.name}>{auth.user ? auth.user.name || auth.user.username || 'Compte Synaura' : 'Connexion Synaura'}</Text>
          <Text style={styles.text}>
            {auth.user
              ? `Connecte en tant que ${auth.user.email || auth.user.username || 'membre Synaura'}.`
              : "Connecte ton compte pour publier, liker, commenter et synchroniser ta bibliotheque."}
          </Text>
          {auth.user ? (
            <Pressable style={styles.primaryButton} onPress={auth.logout}>
              <Text style={styles.primaryText}>Se deconnecter</Text>
            </Pressable>
          ) : (
            <View style={styles.form}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Mot de passe"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable disabled={submitting || !email || !password} style={[styles.primaryButton, (submitting || !email || !password) && styles.disabled]} onPress={submit}>
                {submitting ? <ActivityIndicator color={colors.paper} /> : <Text style={styles.primaryText}>Se connecter</Text>}
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.list}>
          {rows.map((row) => (
            <View key={row.title} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name={row.icon as any} size={20} color={colors.accent2} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSub}>{row.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
    paddingBottom: 180,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  hero: {
    marginTop: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(124,92,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  name: {
    marginTop: spacing.lg,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  text: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primaryText: {
    color: colors.paper,
    fontSize: 12,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
  form: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,208,187,0.10)',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  rowSub: {
    marginTop: 3,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
});

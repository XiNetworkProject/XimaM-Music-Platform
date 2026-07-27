import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import {
  AuthAlert,
  AuthCard,
  AuthCheckRow,
  AuthField,
  AuthInfo,
  AuthPrimaryButton,
  AuthScreen,
  AuthTitle,
  authStyles,
} from '@/components/auth/AuthUI';
import { colors } from '@/theme/tokens';

type Visibility = 'private' | 'friends' | 'public';

export function CompleteAccountScreen() {
  const auth = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [name, setName] = useState(auth.user?.name || '');
  const [username, setUsername] = useState(auth.user?.username || '');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState(auth.user?.email || '');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    void auth.getAccountDetails()
      .then((details) => {
        if (!mounted) return;
        setFirstName(details.private.firstName);
        setLastName(details.private.lastName);
        setBirthDate(details.private.birthDate);
        setVisibility(details.private.birthdayVisibility);
        setName(details.user.name || '');
        setUsername(details.user.username || '');
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !name.trim() || !username.trim() || !birthDate.trim()) {
      setError('Complete tous les champs.');
      return;
    }
    if (!acceptTerms || !acceptPrivacy) {
      setError('Accepte les conditions et la politique de confidentialite.');
      return;
    }
    if (!auth.user?.email && !/\S+@\S+\.\S+/.test(email)) {
      setError('Ajoute une adresse email de recuperation valide.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (!auth.user?.email) await auth.requestEmailLink(email);
      await auth.completeProfile({
        firstName,
        lastName,
        name,
        username,
        birthDate,
        birthdayVisibility: visibility,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Finalisation impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>Synaura</Text>
        <Pressable onPress={() => void auth.logout()}>
          <Text style={authStyles.mutedLink}>Se deconnecter</Text>
        </Pressable>
      </View>
      <AuthCard>
        <AuthTitle
          eyebrow="Derniere etape"
          title="Complete ton compte."
          text="Ces informations permettent de securiser ton acces et de regler la visibilite de ton anniversaire."
        />
        {error ? <AuthAlert text={error} /> : null}
        <View style={authStyles.formGap}>
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <AuthField
                label="Prenom"
                icon="person-outline"
                value={firstName}
                onChangeText={setFirstName}
                textContentType="givenName"
                autoComplete="name-given"
                editable={!loading}
                placeholder="Maxime"
              />
            </View>
            <View style={styles.column}>
              <AuthField
                label="Nom"
                icon="person-outline"
                value={lastName}
                onChangeText={setLastName}
                textContentType="familyName"
                autoComplete="name-family"
                editable={!loading}
                placeholder="Martin"
              />
            </View>
          </View>
          <AuthField
            label="Nom affiche"
            icon="id-card-outline"
            value={name}
            onChangeText={setName}
            editable={!loading}
            placeholder="Maxime Martin"
          />
          <AuthField
            label="Pseudo"
            icon="at"
            value={username}
            onChangeText={(value) => setUsername(value.replace(/\s/g, '').toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            placeholder="maxmusic"
          />
          <AuthField
            label="Date de naissance"
            icon="calendar-outline"
            value={birthDate}
            onChangeText={(value) => setBirthDate(value.replace(/[^\d-]/g, '').slice(0, 10))}
            keyboardType="numbers-and-punctuation"
            textContentType="birthdate"
            editable={!loading}
            placeholder="AAAA-MM-JJ"
          />
          {!auth.user?.email ? (
            <AuthField
              label="Email de recuperation"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              placeholder="vous@example.com"
            />
          ) : null}
          <View style={styles.visibilityBlock}>
            <Text style={styles.label}>VISIBILITE DE L'ANNIVERSAIRE</Text>
            <View style={styles.segmented}>
              {([
                ['private', 'Prive'],
                ['friends', 'Amis'],
                ['public', 'Public'],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: visibility === value }}
                  onPress={() => setVisibility(value)}
                  style={[styles.segment, visibility === value && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, visibility === value && styles.segmentTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <AuthInfo
            icon="eye-off-outline"
            title="Donnees privees"
            text="Ta date complete, ton telephone et ton identite civile ne sont jamais affiches sur ton profil public."
          />
          <AuthCheckRow
            checked={acceptTerms}
            onPress={() => setAcceptTerms((value) => !value)}
            label={(
              <>
                J'accepte les{' '}
                <Text style={authStyles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/legal/cgv`)}>
                  conditions d'utilisation
                </Text>.
              </>
            )}
          />
          <AuthCheckRow
            checked={acceptPrivacy}
            onPress={() => setAcceptPrivacy((value) => !value)}
            label={(
              <>
                J'ai lu la{' '}
                <Text
                  style={authStyles.legalLink}
                  onPress={() => Linking.openURL(`${API_BASE_URL}/legal/confidentialite`)}
                >
                  politique de confidentialite
                </Text>.
              </>
            )}
          />
          <AuthPrimaryButton
            label={loading ? 'Finalisation...' : 'Ouvrir Synaura'}
            icon="arrow-forward"
            loading={loading}
            disabled={!acceptTerms || !acceptPrivacy}
            onPress={() => void submit()}
          />
        </View>
      </AuthCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  brandRow: { marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.text, fontSize: 22, fontWeight: '900' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, minWidth: 0 },
  visibilityBlock: { gap: 8 },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  segmented: { minHeight: 42, padding: 3, flexDirection: 'row', borderRadius: 8, backgroundColor: colors.surfaceMuted },
  segment: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.textTertiary, fontSize: 11, fontWeight: '800' },
  segmentTextActive: { color: colors.violet, fontWeight: '900' },
});

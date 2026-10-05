import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_BASE_URL } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { rememberAuthDestination } from '@/auth/entryGate';
import {
  AuthAlert,
  AuthCard,
  AuthDivider,
  AuthField,
  AuthGoogleButton,
  AuthPhoneButton,
  AuthPrimaryButton,
  AuthScreen,
  AuthTitle,
  AuthTopBar,
  authStyles,
} from '@/components/auth/AuthUI';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(route.params?.message || '');

  useEffect(() => {
    if (route.params?.message) setSuccess(route.params.message);
  }, [route.params?.message]);

  const returnToApp = () => {
    const returnTo = route.params?.returnTo;
    if (returnTo?.screen) {
      navigation.navigate('Tabs', { screen: returnTo.screen, params: returnTo.params });
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs');
  };

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Remplis ton email et ton mot de passe.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      rememberAuthDestination(route.params?.returnTo);
      await auth.login(email.trim().toLowerCase(), password);
    } catch {
      setError('Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogle = async () => {
    setProviderLoading(true);
    setError('');
    setSuccess('');
    try {
      rememberAuthDestination(route.params?.returnTo);
      await auth.loginWithGoogle();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion Google impossible.');
    } finally {
      setProviderLoading(false);
    }
  };

  return (
    <AuthScreen>
      <AuthTopBar caption="Connexion" onBack={returnToApp} />
      <AuthCard>
        <AuthTitle
          eyebrow="Connexion"
          title="Retrouve ton univers."
          text="Tes sons. Tes artistes. Tes rencontres."
        />

        {success ? <AuthAlert kind="success" text={success} /> : null}
        {error ? <AuthAlert text={error} /> : null}

        {auth.capabilities.google ? (
          <AuthGoogleButton
            loading={providerLoading}
            disabled={loading}
            onPress={() => void continueWithGoogle()}
          />
        ) : null}
        {auth.capabilities.phone ? (
          <View style={{ marginTop: auth.capabilities.google ? 10 : 0 }}>
            <AuthPhoneButton
              disabled={loading || providerLoading}
              onPress={() => navigation.navigate('PhoneAuth')}
            />
          </View>
        ) : null}
        {auth.capabilities.google || auth.capabilities.phone ? <AuthDivider /> : null}

        <View style={authStyles.formGap}>
          <AuthField
            label="Email"
            icon="mail"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="vous@example.com"
            editable={!loading}
            returnKeyType="next"
          />
          <AuthField
            label="Mot de passe"
            icon="lock-closed"
            rightIcon={showPassword ? 'eye-off' : 'eye'}
            onRightPress={() => setShowPassword((value) => !value)}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError('');
            }}
            secureTextEntry={!showPassword}
            textContentType="password"
            placeholder="Votre mot de passe"
            editable={!loading}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />

          <View style={authStyles.linkRow}>
            <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={authStyles.mutedLink}>Mot de passe oublié ?</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={authStyles.link}>Créer un compte</Text>
            </Pressable>
          </View>

          <AuthPrimaryButton
            label={loading ? 'Connexion...' : 'Se connecter'}
            loading={loading}
            disabled={!email.trim() || !password}
            onPress={() => void submit()}
          />

          <Text style={authStyles.legalText}>
            En te connectant, tu acceptes les{' '}
            <Text style={authStyles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/legal/cgv`)}>CGV</Text>
            {' '}et la{' '}
            <Text style={authStyles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/legal/confidentialite`)}>politique de confidentialité</Text>.
          </Text>
        </View>
      </AuthCard>
    </AuthScreen>
  );
}

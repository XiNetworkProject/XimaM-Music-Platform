import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthProvider';
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthInfo,
  AuthPrimaryButton,
  AuthScreen,
  AuthTitle,
  AuthTopBar,
  authStyles,
} from '@/components/auth/AuthUI';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Ajoute un email valide.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      setSuccess(await auth.requestPasswordReset(email.trim().toLowerCase()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Demande impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <AuthTopBar caption="Récupération" onBack={() => navigation.goBack()} />
      <AuthCard>
        <AuthTitle
          eyebrow="Mot de passe"
          title="Retrouve ton accès."
          text="Entre ton email. S'il correspond à un compte Synaura, tu recevras un lien sécurisé."
        />
        {success ? <AuthAlert kind="success" text={success} /> : null}
        {error ? <AuthAlert text={error} /> : null}
        <View style={authStyles.formGap}>
          <AuthField
            label="Email"
            icon="mail"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError('');
              setSuccess('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="vous@example.com"
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={() => void submit()}
          />
          <AuthInfo
            icon="shield-checkmark-outline"
            title="Lien sécurisé"
            text="Le lien et le code reçus expirent après dix minutes."
          />
          <AuthPrimaryButton
            label={loading ? 'Envoi...' : 'Envoyer le lien'}
            loading={loading}
            disabled={!email.trim()}
            icon="mail-outline"
            onPress={() => void submit()}
          />
          <Pressable onPress={() => navigation.replace('Login')}>
            <Text style={authStyles.switchText}>Retour à la <Text style={authStyles.link}>connexion</Text></Text>
          </Pressable>
        </View>
      </AuthCard>
    </AuthScreen>
  );
}

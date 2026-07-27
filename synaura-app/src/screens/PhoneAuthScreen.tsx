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
import { isOnboardingCompleted } from '@/onboarding/checkOnboarding';

export function PhoneAuthScreen() {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [phone, setPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeSent = Boolean(verifiedPhone);

  const afterLogin = async () => {
    const completed = await isOnboardingCompleted();
    navigation.reset({
      index: 0,
      routes: [{ name: completed ? 'Tabs' : 'Onboarding' }],
    });
  };

  const sendCode = async () => {
    if (!phone.trim()) {
      setError('Entre ton numero de telephone.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const normalized = await auth.requestPhoneCode(phone);
      setVerifiedPhone(normalized);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'SMS impossible a envoyer');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.replace(/\D/g, '').length !== 6) {
      setError('Entre le code a 6 chiffres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.verifyPhoneCode(verifiedPhone, code);
      await afterLogin();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Code incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <AuthTopBar caption="Telephone" onBack={() => navigation.goBack()} />
      <AuthCard>
        <AuthTitle
          eyebrow={codeSent ? 'Verification' : 'Connexion'}
          title={codeSent ? 'Entre le code SMS.' : 'Ton numero suffit.'}
          text={codeSent
            ? `Le code a 6 chiffres a ete envoye au ${verifiedPhone}.`
            : 'Connecte-toi ou cree ton compte avec un code a usage unique.'}
        />
        {error ? <AuthAlert text={error} /> : null}
        <View style={authStyles.formGap}>
          {!codeSent ? (
            <>
              <AuthField
                label="Telephone"
                icon="call-outline"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setError('');
                }}
                placeholder="+33 6 12 34 56 78"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={() => void sendCode()}
              />
              <AuthPrimaryButton
                label={loading ? 'Envoi...' : 'Recevoir mon code'}
                icon="chatbubble-ellipses-outline"
                loading={loading}
                onPress={() => void sendCode()}
              />
            </>
          ) : (
            <>
              <AuthField
                label="Code SMS"
                icon="keypad-outline"
                value={code}
                onChangeText={(value) => {
                  setCode(value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                placeholder="123456"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={() => void verifyCode()}
              />
              <AuthPrimaryButton
                label={loading ? 'Verification...' : 'Continuer'}
                icon="arrow-forward"
                loading={loading}
                disabled={code.length !== 6}
                onPress={() => void verifyCode()}
              />
              <View style={authStyles.linkRow}>
                <Pressable onPress={() => {
                  setVerifiedPhone('');
                  setCode('');
                  setError('');
                }}>
                  <Text style={authStyles.mutedLink}>Changer de numero</Text>
                </Pressable>
                <Pressable disabled={loading} onPress={() => void sendCode()}>
                  <Text style={authStyles.link}>Renvoyer le code</Text>
                </Pressable>
              </View>
            </>
          )}
          <AuthInfo
            icon="shield-checkmark-outline"
            title="Code temporaire"
            text="Synaura ne te demandera jamais ce code dans un message ou un appel."
          />
        </View>
      </AuthCard>
    </AuthScreen>
  );
}


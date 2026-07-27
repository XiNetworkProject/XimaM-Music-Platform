import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth, type MfaChallenge } from '@/auth/AuthProvider';
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthInfo,
  AuthPrimaryButton,
  AuthScreen,
  AuthTitle,
  authStyles,
} from '@/components/auth/AuthUI';

function maskedPhone(phone?: string | null) {
  if (!phone) return 'ton telephone';
  return `${phone.slice(0, 3)} ** ** ** ${phone.slice(-2)}`;
}

export function MfaChallengeScreen() {
  const auth = useAuth();
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const startedRef = useRef(false);
  const preferredFactor = auth.mfaFactors.find(
    (factor) => factor.type === 'totp' && factor.status === 'verified',
  ) || auth.mfaFactors.find((factor) => factor.status === 'verified');
  const factorType = challenge?.factorType
    || (preferredFactor?.type === 'phone' ? 'phone' : 'totp');
  const usesPhone = factorType === 'phone';

  const startChallenge = async () => {
    setLoading(true);
    setError('');
    try {
      const nextChallenge = await auth.challengeMfa();
      setChallenge(nextChallenge);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification 2FA impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startedRef.current || !auth.mfaRequired || auth.mfaFactors.length === 0) return;
    startedRef.current = true;
    void startChallenge();
  }, [auth.mfaFactors.length, auth.mfaRequired]);

  const verify = async () => {
    if (!challenge || code.length !== 6) {
      setError('Entre le code a 6 chiffres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.verifyMfa(challenge, code);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Code incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <View style={authStyles.linkRow}>
        <Text style={authStyles.switchText}>Verification en deux etapes</Text>
        <Pressable onPress={() => void auth.logout()}>
          <Text style={authStyles.mutedLink}>Se deconnecter</Text>
        </Pressable>
      </View>
      <AuthCard>
        <AuthTitle
          eyebrow="Securite"
          title="Confirme que c'est toi."
          text={usesPhone
            ? `Entre le code envoye au ${maskedPhone(auth.user?.phone)}.`
            : "Entre le code affiche par ton application d'authentification."}
        />
        {error ? <AuthAlert text={error} /> : null}
        <View style={authStyles.formGap}>
          <AuthField
            label="Code de securite"
            icon="keypad-outline"
            value={code}
            onChangeText={(value) => {
              setCode(value.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            placeholder="123456"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete={usesPhone ? 'sms-otp' : 'off'}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={() => void verify()}
          />
          <AuthPrimaryButton
            label={loading ? 'Verification...' : 'Verifier'}
            icon="shield-checkmark-outline"
            loading={loading}
            disabled={!challenge || code.length !== 6}
            onPress={() => void verify()}
          />
          {usesPhone ? (
            <Pressable disabled={loading} onPress={() => void startChallenge()}>
              <Text style={[authStyles.link, { textAlign: 'center' }]}>Renvoyer un code</Text>
            </Pressable>
          ) : null}
          <AuthInfo
            icon="lock-closed-outline"
            title="Session protegee"
            text={usesPhone
              ? 'Cette verification est demandee apres une nouvelle connexion ou une action sensible.'
              : "Le code change toutes les 30 secondes et fonctionne meme sans reseau mobile."}
          />
        </View>
      </AuthCard>
    </AuthScreen>
  );
}

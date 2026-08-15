import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import {
  AuthAlert,
  AuthCard,
  AuthInfo,
  AuthPrimaryButton,
  AuthScreen,
  AuthTitle,
  authStyles,
} from '@/components/auth/AuthUI';

export function BiometricLockScreen() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const promptedRef = useRef(false);

  const unlock = async () => {
    setLoading(true);
    setError('');
    const success = await auth.unlockBiometric();
    if (!success) setError("L'identification n'a pas abouti.");
    setLoading(false);
  };

  useEffect(() => {
    if (promptedRef.current) return;
    promptedRef.current = true;
    void unlock();
  }, []);

  return (
    <AuthScreen>
      <View style={authStyles.linkRow}>
        <Text style={authStyles.switchText}>Synaura verrouille</Text>
        <Pressable onPress={() => void auth.logout()}>
          <Text style={authStyles.mutedLink}>Changer de compte</Text>
        </Pressable>
      </View>
      <AuthCard>
        <AuthTitle
          eyebrow="Acces local"
          title={`Bonjour${auth.user?.name ? ` ${auth.user.name.split(' ')[0]}` : ''}.`}
          text="Utilise la biometrie ou le code de ton telephone pour retrouver ta session."
        />
        {error ? <AuthAlert text={error} /> : null}
        <View style={authStyles.formGap}>
          <AuthPrimaryButton
            label={loading ? 'Verification...' : 'Deverrouiller'}
            icon="finger-print-outline"
            loading={loading}
            onPress={() => void unlock()}
          />
          <AuthInfo
            icon="phone-portrait-outline"
            title="Sur cet appareil uniquement"
            text="Ton empreinte ou ton visage reste gere par le systeme et n'est jamais transmis a Synaura."
          />
        </View>
      </AuthCard>
    </AuthScreen>
  );
}

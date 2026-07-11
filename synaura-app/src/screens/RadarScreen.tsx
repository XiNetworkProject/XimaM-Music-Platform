import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDiscoverRadar } from '@/api/client';
import type { Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { RadarMobileSection } from '@/components/radar/RadarMobileSection';
import { SynauraBackground } from '@/components/SynauraBackground';
import { colors } from '@/theme/tokens';
import { AppHeader } from '@/components/ui/AppHeader';

export function RadarScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextTracks = await getDiscoverRadar(30);
      setTracks(nextTracks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth.requireAuth()) return;
    void load();
  }, [auth, load]);

  return (
    <View style={styles.root}>
      <SynauraBackground variant="warm" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppHeader flush eyebrow="Découverte émergente" title="Radar" subtitle="Les bons signaux avant les gros chiffres." onBack={() => navigation.goBack()} action={{ icon: 'refresh-outline', label: 'Actualiser', onPress: () => void load() }} />

        <RadarMobileSection tracks={tracks} loading={loading} />
      </ScrollView>
    </View>
  );
}

export default RadarScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 145 },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  title: { marginTop: 1, color: colors.text, fontSize: 25, fontWeight: '900' },
});

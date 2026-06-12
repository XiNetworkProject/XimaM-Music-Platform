import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';

const items = [
  { route: 'Profile', label: 'Voir mon profil', icon: 'person-outline' },
  { route: 'Settings', label: 'Modifier mon profil', icon: 'create-outline' },
  { route: 'Settings', label: 'Paramètres', icon: 'settings-outline' },
  { route: 'Subscriptions', label: 'Abonnement', icon: 'sparkles-outline' },
  { route: 'Upload', label: 'Mes uploads', icon: 'cloud-upload-outline' },
  { route: 'Library', label: 'Bibliothèque', icon: 'library-outline' },
] as const;

export function MobileAccountButton({ compact = false }: { compact?: boolean }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const name = auth.user?.name || auth.user?.username || 'Compte';

  const navigate = (route: string) => {
    setOpen(false);
    requestAnimationFrame(() => navigation.navigate(route));
  };

  const logout = async () => {
    setOpen(false);
    await auth.logout();
    navigation.getParent()?.navigate('Login');
  };

  if (!auth.user) {
    return (
      <Pressable accessibilityLabel="Se connecter" onPress={() => navigation.getParent()?.navigate('Login')} style={[styles.avatarButton, compact && styles.avatarButtonCompact]}>
        <Ionicons name="person-outline" size={compact ? 17 : 19} color={colors.text} />
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Ouvrir le menu du compte"
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setOpen(true);
        }}
        style={[styles.avatarButton, !auth.user.avatar && styles.avatarButtonFallback, compact && styles.avatarButtonCompact]}
      >
        {auth.user.avatar ? <Image source={{ uri: auth.user.avatar }} style={styles.avatarImage} /> : <Text style={styles.avatarFallback}>{name.slice(0, 1).toUpperCase()}</Text>}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            <View style={styles.handle} />
            <View style={styles.identity}>
              <View style={styles.largeAvatar}>
                {auth.user.avatar ? <Image source={{ uri: auth.user.avatar }} style={styles.avatarImage} /> : <Text style={styles.largeAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>}
              </View>
              <View style={styles.identityText}>
                <Text numberOfLines={1} style={styles.name}>{name}</Text>
                {auth.user.username ? <Text numberOfLines={1} style={styles.username}>@{auth.user.username}</Text> : null}
              </View>
              <Pressable accessibilityLabel="Fermer" onPress={() => setOpen(false)} style={styles.close}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.grid}>
              {items.map((item) => (
                <Pressable key={`${item.route}-${item.label}`} onPress={() => navigate(item.route)} style={styles.item}>
                  <View style={styles.itemIcon}><Ionicons name={item.icon as any} size={20} color={colors.text} /></View>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>

            <Pressable onPress={logout} style={styles.logout}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={styles.logoutText}>Déconnexion</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarButtonCompact: { width: 38, height: 38, borderRadius: 19 },
  avatarButtonFallback: { backgroundColor: colors.black },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { color: colors.white, fontSize: 15, fontWeight: '900' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,19,0.38)' },
  sheet: {
    padding: 18,
    gap: 14,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 99, backgroundColor: 'rgba(23,19,19,0.16)' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  largeAvatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  largeAvatarText: { color: colors.white, fontSize: 21, fontWeight: '900' },
  identityText: { flex: 1 },
  name: { color: colors.text, fontSize: 19, fontWeight: '900' },
  username: { marginTop: 2, color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  close: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)' },
  grid: { gap: 7 },
  item: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.045)',
  },
  itemIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  itemLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '900' },
  logout: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(217,45,32,0.08)',
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '900' },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { SynauraLogotype } from '../components/SynauraLogo';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  screen: string;
  params?: Record<string, unknown>;
  color?: string;
  isDestructive?: boolean;
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const root = navigation.getParent();

  const menuItems: MenuItem[] = user
    ? [
        { icon: 'person-outline', label: 'Mon profil', screen: 'PublicProfile', params: { username: user.username } },
        { icon: 'settings-outline', label: 'Paramètres', screen: 'Settings' },
        { icon: 'chatbubbles-outline', label: 'Mes messages', screen: 'Messages' },
        { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications' },
        { icon: 'mail-outline', label: 'Demandes', screen: 'Requests' },
        { icon: 'stats-chart-outline', label: 'Statistiques', screen: 'Stats' },
        { icon: 'diamond-outline', label: 'Abonnement', screen: 'Premium' },
        { icon: 'flash-outline', label: 'Boosters', screen: 'Boosters' },
        { icon: 'cloud-upload-outline', label: 'Uploader', screen: 'Upload' },
        { icon: 'people-outline', label: 'Communauté', screen: 'Community' },
      ]
    : [];

  if (!user) {
    return (
      <View style={s.screen}>
        <LinearGradient colors={['#020017', '#0a0020', '#05010b']} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Text style={s.headerLabel}>Profil</Text>
            <SynauraLogotype height={22} />
          </View>

          <View style={s.guestCard}>
            <LinearGradient
              colors={['rgba(139,92,246,0.15)', 'rgba(217,70,239,0.08)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={s.guestIconWrap}>
              <LinearGradient colors={['#8b5cf6', '#d946ef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.guestIconGrad}>
                <Ionicons name="person-outline" size={44} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={s.guestTitle}>Connecte-toi à Synaura</Text>
            <Text style={s.guestSubtitle}>
              Crée un compte ou connecte-toi pour accéder au Studio IA, à ta bibliothèque et à ton profil.
            </Text>
            <Pressable
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
              onPress={() => root?.navigate('Login')}
            >
              <LinearGradient colors={['#8b5cf6', '#d946ef', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={s.primaryBtnText}>Se connecter</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.85 }]}
              onPress={() => root?.navigate('SignUp')}
            >
              <Text style={s.secondaryBtnText}>Créer un compte</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  const initial = (user.name || user.username || user.email || '?').charAt(0).toUpperCase();
  const avatarUri = user.avatar || null;

  return (
    <View style={s.screen}>
      <LinearGradient colors={['#020017', '#0a0020', '#05010b']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.headerLabel}>Profil</Text>
          <SynauraLogotype height={22} />
        </View>

        {/* Profile card */}
        <View style={s.profileCard}>
          <LinearGradient
            colors={['rgba(139,92,246,0.12)', 'rgba(34,211,238,0.06)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Pressable
            style={s.profileRow}
            onPress={() => root?.navigate('PublicProfile', { username: user.username })}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatar} />
            ) : (
              <LinearGradient colors={['#8b5cf6', '#d946ef']} style={s.avatar}>
                <Text style={s.avatarLetter}>{initial}</Text>
              </LinearGradient>
            )}
            <View style={s.profileInfo}>
              <Text style={s.displayName} numberOfLines={1}>
                {user.name || user.username || 'Utilisateur'}
              </Text>
              <Text style={s.handle} numberOfLines={1}>@{user.username || user.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>

        {/* Menu */}
        <View style={s.menuCard}>
          {menuItems.map((item, idx) => (
            <Pressable
              key={item.screen}
              style={({ pressed }) => [
                s.menuItem,
                pressed && { backgroundColor: 'rgba(255,255,255,0.04)' },
                idx < menuItems.length - 1 && s.menuItemBorder,
              ]}
              onPress={() => root?.navigate(item.screen, item.params)}
            >
              <View style={s.menuIconWrap}>
                <Ionicons name={item.icon} size={20} color={item.color || '#c4b5fd'} />
              </View>
              <Text style={[s.menuLabel, item.color ? { color: item.color } : null]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.25)" />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [s.logoutCard, pressed && { backgroundColor: 'rgba(252,165,165,0.08)' }]}
          onPress={() => signOut()}
        >
          <Ionicons name="log-out-outline" size={20} color="#fca5a5" />
          <Text style={s.logoutText}>Se déconnecter</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020017' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 32 },
  header: { marginBottom: 20 },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: 4,
  },

  /* Guest card */
  guestCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    overflow: 'hidden',
    padding: 28,
    alignItems: 'center',
  },
  guestIconWrap: { marginBottom: 20 },
  guestIconGrad: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 21,
  },
  primaryBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  primaryBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#e5e7eb' },

  /* Profile card */
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: { fontSize: 24, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1, marginLeft: 14 },
  displayName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 2 },
  handle: { fontSize: 13, color: '#94a3b8' },

  /* Menu */
  menuCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.025)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#e5e7eb', fontWeight: '500' },

  /* Logout */
  logoutCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#fca5a5' },
});

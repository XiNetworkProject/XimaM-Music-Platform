// Profil — sans compte : invite à se connecter / s'inscrire ; avec compte : infos + déconnexion

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { SynauraLogotype } from '../components/SynauraLogo';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const root = navigation.getParent();

  if (!user) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#020017', '#05010b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerLabel}>Profil</Text>
            <SynauraLogotype height={22} />
          </View>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <LinearGradient colors={['#8b5cf6', '#d946ef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconGrad}>
                <Ionicons name="person-outline" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Connecte-toi à Synaura</Text>
            <Text style={styles.subtitle}>
              Crée un compte ou connecte-toi pour accéder au Studio IA, à ta bibliothèque et à ton profil.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.95 }]}
              onPress={() => root?.navigate('Login')}
            >
              <LinearGradient colors={['#8b5cf6', '#d946ef', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Se connecter</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
              onPress={() => root?.navigate('SignUp')}
            >
              <Text style={styles.secondaryBtnText}>Créer un compte</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#020017', '#05010b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Profil</Text>
          <SynauraLogotype height={22} />
        </View>
        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{(user.name || user.username || user.email || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user.name || user.username || 'Utilisateur'}</Text>
          <Text style={styles.userHandle}>@{user.username || user.email}</Text>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.9 }]}
            onPress={() => signOut()}
          >
            <Ionicons name="log-out-outline" size={20} color="#fca5a5" />
            <Text style={styles.logoutBtnText}>Déconnexion</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020017' },
  safeArea: { flex: 1, paddingHorizontal: 16, paddingTop: 48 },
  header: { marginBottom: 20 },
  headerLabel: { fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: { marginBottom: 16 },
  iconGrad: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  primaryBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  primaryBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#e5e7eb' },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(139,92,246,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  userHandle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  logoutBtnText: { fontSize: 15, color: '#fca5a5', fontWeight: '600' },
});

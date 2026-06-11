import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SynauraBackground } from '@/components/SynauraBackground';
import { colors } from '@/theme/tokens';

const publishActions = [
  { title: 'Publier un son', text: 'Single, EP ou album', icon: 'cloud-upload-outline', tint: colors.coral, route: 'Upload' },
  { title: 'Créer un post', text: 'Texte, image ou musique', icon: 'create-outline', tint: '#FF4B7A', route: 'CreatePost' },
  { title: 'Partager un son', text: 'Raconte ce qu’il y a derrière', icon: 'musical-notes-outline', tint: colors.cyan, route: 'CreatePost' },
] as const;

const communityActions = [
  { title: 'Demander un avis', text: 'Obtiens des retours utiles', icon: 'chatbubbles-outline', tint: colors.coral, params: { compose: true, category: 'feedback' } },
  { title: 'Chercher une collab', text: 'Trouve une voix, un beatmaker ou un feat', icon: 'people-outline', tint: colors.violet, params: { compose: true, category: 'collab' } },
  { title: 'Lancer un défi remix', text: 'Propose une source à transformer', icon: 'repeat-outline', tint: colors.cyan, params: { compose: true, category: 'remix' } },
] as const;

export function CreateHubScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: -5, duration: 1500, useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [float]);

  const open = (route: string, params?: Record<string, unknown>) => {
    void Haptics.selectionAsync();
    navigation.navigate(route, params);
  };

  return (
    <SynauraBackground variant="warm">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 112 }]}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Retour" onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="chevron-back" size={23} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>TON ESPACE CRÉATIF</Text>
            <Text style={styles.title}>Créer</Text>
          </View>
          <View style={styles.logoButton}>
            <Image source={require('../assets/synaura-symbol-2026.png')} resizeMode="contain" style={styles.logo} />
          </View>
        </View>

        <Pressable onPress={() => open('AIStudio')} style={styles.studioShell}>
          <LinearGradient
            colors={['#171313', '#26171D', '#16252A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.studioHero}
          >
            <View style={styles.studioTop}>
              <View>
                <Text style={styles.studioKicker}>STUDIO IA SYNAURA</Text>
                <Text style={styles.studioStatus}>Prêt à composer</Text>
              </View>
              <Animated.View style={[styles.studioOrb, { transform: [{ translateY: float }] }]}>
                <Ionicons name="sparkles" size={21} color={colors.paper} />
              </Animated.View>
            </View>
            <Text style={styles.studioTitle}>Une idée, deux versions, ton prochain son.</Text>
            <Text style={styles.studioText}>Génère, remixe, écris des paroles et retrouve toute ta bibliothèque.</Text>
            <View style={styles.studioButton}>
              <Text style={styles.studioButtonText}>Entrer dans le Studio</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.text} />
            </View>
          </LinearGradient>
        </Pressable>

        <SectionTitle eyebrow="PUBLIER" title="Fais entendre ton univers" />
        <View style={styles.actionList}>
          {publishActions.map((action) => (
            <ActionRow
              key={action.title}
              {...action}
              onPress={() => open(action.route)}
            />
          ))}
        </View>

        <SectionTitle eyebrow="COMMUNAUTÉ" title="Crée avec les autres" />
        <View style={styles.actionList}>
          {communityActions.map((action) => (
            <ActionRow
              key={action.title}
              {...action}
              onPress={() => open('Community', action.params)}
            />
          ))}
        </View>
      </ScrollView>
    </SynauraBackground>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionHeading}>{title}</Text>
    </View>
  );
}

function ActionRow({ title, text, icon, tint, onPress }: { title: string; text: string; icon: string; tint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}>
      <View style={[styles.actionIcon, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon as any} size={22} color={tint} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{text}</Text>
      </View>
      <View style={styles.actionArrow}>
        <Ionicons name="arrow-forward" size={17} color={colors.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 17, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.82)', borderWidth: 1, borderColor: colors.border },
  headerCopy: { flex: 1 },
  kicker: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { marginTop: 2, color: colors.text, fontSize: 36, lineHeight: 38, fontWeight: '900' },
  logoButton: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  logo: { width: 43, height: 43 },
  studioShell: { borderRadius: 26, overflow: 'hidden', shadowColor: colors.black, shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  studioHero: { minHeight: 278, padding: 19, justifyContent: 'flex-end' },
  studioTop: { position: 'absolute', left: 19, right: 19, top: 18, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  studioKicker: { color: '#FF8A80', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  studioStatus: { marginTop: 5, color: 'rgba(255,250,242,0.5)', fontSize: 11, fontWeight: '800' },
  studioOrb: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C5CFF', shadowColor: '#00C2CB', shadowOpacity: 0.45, shadowRadius: 18, elevation: 8 },
  studioTitle: { maxWidth: 310, color: colors.paper, fontSize: 30, lineHeight: 31, fontWeight: '900' },
  studioText: { marginTop: 9, maxWidth: 310, color: 'rgba(255,250,242,0.56)', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  studioButton: { marginTop: 16, minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 24, paddingHorizontal: 17, backgroundColor: colors.paper },
  studioButtonText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  sectionTitle: { marginTop: 13, marginBottom: 2 },
  sectionEyebrow: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  sectionHeading: { marginTop: 4, color: colors.text, fontSize: 22, lineHeight: 25, fontWeight: '900' },
  actionList: { gap: 8 },
  actionRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 22, padding: 10, backgroundColor: 'rgba(255,250,242,0.86)', borderWidth: 1, borderColor: colors.border },
  actionPressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
  actionIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  actionText: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  actionArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.055)' },
});

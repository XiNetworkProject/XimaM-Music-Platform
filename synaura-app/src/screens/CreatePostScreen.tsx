import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createPost, getMyProfile, uploadPostImage, type MobileProfileTrack } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import type { Track } from '@/api/types';
import { colors } from '@/theme/tokens';

export function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tracks, setTracks] = useState<MobileProfileTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(route.params?.track || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.user?.username) return;
    getMyProfile(auth.user.username).then((profile) => setTracks(profile.tracks)).catch(() => {});
  }, [auth.user?.username]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!text.trim() && !imageUri && !selectedTrack) {
      setError('Ajoute un texte, une image ou un son.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const imageUrl = imageUri ? await uploadPostImage(imageUri) : null;
      await createPost({
        content: text.trim() || (selectedTrack ? `À écouter : ${selectedTrack.title}` : 'Nouveau post Synaura'),
        imageUrl,
        trackId: selectedTrack?._id || null,
        type: selectedTrack ? 'track_share' : imageUrl ? 'photo' : 'text',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Home');
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'Publication impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!auth.user) {
    return <View style={styles.root}><SynauraBackground variant="warm" /><View style={styles.gate}><Text style={styles.title}>Connecte-toi pour publier.</Text><Pressable onPress={() => navigation.getParent()?.navigate('Login')} style={styles.publish}><Text style={styles.publishText}>Se connecter</Text></Pressable></View></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SynauraBackground variant="warm" />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 110 }]}>
        <View style={styles.top}><Pressable onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="close" size={22} color={colors.text} /></Pressable><Text style={styles.topTitle}>Nouveau post</Text><Pressable disabled={submitting} onPress={submit} style={styles.topPublish}>{submitting ? <ActivityIndicator color={colors.paper} /> : <Text style={styles.topPublishText}>Publier</Text>}</Pressable></View>
        <View style={styles.hero}><Text style={styles.kicker}>COMMUNAUTÉ SYNAURA</Text><Text style={styles.title}>Partage ce qui bouge dans ton univers.</Text><TextInput value={text} onChangeText={setText} multiline autoFocus placeholder="Une idée, une sortie, une recherche de feat..." placeholderTextColor="rgba(255,250,242,0.3)" style={styles.composer} /></View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.tools}>
          <Pressable onPress={pickImage} style={[styles.tool, imageUri && styles.toolActive]}><Ionicons name="image-outline" size={18} color={colors.text} /><Text style={styles.toolText}>{imageUri ? 'Image ajoutée' : 'Image'}</Text></Pressable>
          <Pressable onPress={() => setSelectedTrack(null)} style={[styles.tool, selectedTrack && styles.toolActive]}><Ionicons name="musical-note-outline" size={18} color={colors.text} /><Text style={styles.toolText}>{selectedTrack ? 'Retirer le son' : 'Choisir un son'}</Text></Pressable>
        </View>
        {imageUri ? <View style={styles.imagePreview}><Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} /><Pressable onPress={() => setImageUri(null)} style={styles.remove}><Ionicons name="close" size={18} color={colors.paper} /></Pressable></View> : null}
        {selectedTrack ? <TrackChoice track={selectedTrack} active onPress={() => setSelectedTrack(null)} /> : null}
        <View style={styles.section}><Text style={styles.sectionTitle}>Tes sons</Text>{tracks.length ? tracks.slice(0, 12).map((track) => <TrackChoice key={track._id} track={track} active={selectedTrack?._id === track._id} onPress={() => setSelectedTrack(track)} />) : <Text style={styles.empty}>Publie un son pour pouvoir le partager dans un post.</Text>}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TrackChoice({ track, active, onPress }: { track: Track; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.track, active && styles.trackActive]}><TrackCover track={track} style={styles.trackCover} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text><Text style={styles.trackMeta}>{track.artist?.name || track.artist?.artistName || 'Synaura'}</Text></View><Ionicons name={active ? 'checkmark-circle' : 'add-circle-outline'} size={21} color={active ? colors.violet : colors.textTertiary} /></Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 13 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  topTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  topPublish: { minWidth: 82, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black, paddingHorizontal: 14 },
  topPublishText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
  hero: { borderRadius: 27, padding: 16, backgroundColor: colors.black },
  kicker: { color: '#C7B8FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 8, color: colors.paper, fontSize: 28, lineHeight: 31, fontWeight: '900' },
  composer: { marginTop: 15, minHeight: 150, borderRadius: 20, padding: 13, textAlignVertical: 'top', color: colors.paper, backgroundColor: 'rgba(255,250,242,0.08)', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  tools: { flexDirection: 'row', gap: 8 },
  tool: { flex: 1, height: 45, borderRadius: 22, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.88)', borderWidth: 1, borderColor: colors.border },
  toolActive: { backgroundColor: 'rgba(124,92,255,0.13)', borderColor: 'rgba(124,92,255,0.25)' },
  toolText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  imagePreview: { height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.border },
  remove: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.8)' },
  section: { borderRadius: 24, padding: 13, gap: 9, backgroundColor: 'rgba(255,250,242,0.86)', borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  track: { minHeight: 66, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: 'rgba(23,19,19,0.045)', borderWidth: 1, borderColor: 'transparent' },
  trackActive: { backgroundColor: 'rgba(124,92,255,0.1)', borderColor: 'rgba(124,92,255,0.22)' },
  trackCover: { width: 50, height: 50, borderRadius: 14 },
  trackTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  trackMeta: { marginTop: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  error: { overflow: 'hidden', borderRadius: 16, padding: 11, color: colors.danger, backgroundColor: 'rgba(239,68,68,0.1)', fontSize: 11, fontWeight: '800' },
  empty: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, fontWeight: '700', textAlign: 'center', padding: 14 },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  publish: { marginTop: 16, height: 48, borderRadius: 24, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: colors.black },
  publishText: { color: colors.paper, fontSize: 13, fontWeight: '900' },
});

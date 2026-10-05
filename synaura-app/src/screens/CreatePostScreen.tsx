import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createPost, getMyProfile, uploadToLocalMediaMobile, type MobileProfileTrack, type UploadAsset } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import type { Track } from '@/api/types';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { navigatePrimaryTab } from '@/navigation/navigatePrimaryTab';
import { CollectionSurface, CollectionHeader, CollectionEmpty, CollectionTabs, MusicRow, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { usePlayer } from '@/player/PlayerProvider';

type Mode = 'text' | 'photo' | 'track_share';

export function CreatePostScreen() {
  const navigation = useNavigation<any>(); const route = useRoute<any>(); const auth = useAuth();
  const p = useCollectionPalette(); const layout = useResponsiveLayout(); const insets = useSafeAreaInsets(); const player = usePlayer();
  const initialTrack = (route.params?.track || null) as Track | null;
  const [mode, setMode] = useState<Mode>(initialTrack ? 'track_share' : 'text');
  const [text, setText] = useState(''); const [asset, setAsset] = useState<(UploadAsset & { aspect: number }) | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(initialTrack);
  const [picker, setPicker] = useState(false); const [search, setSearch] = useState('');
  const [tracks, setTracks] = useState<MobileProfileTrack[]>([]); const [loading, setLoading] = useState(false); const [trackError, setTrackError] = useState('');
  const [retry, setRetry] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [published, setPublished] = useState(false); const request = useRef(0); const lock = useRef(false); const uploaded = useRef<{ uri: string; url: string } | null>(null);
  const draftDirty = Boolean(text.trim() || asset || selectedTrack);
  usePreventRemove(!published && (draftDirty || busy), ({ data }) => {
    if (busy) { Alert.alert('Publication en cours', 'Attends la fin de l’envoi pour quitter cet écran.'); return; }
    Alert.alert('Quitter ce post ?', 'Le brouillon sera perdu.', [{ text: 'Continuer', style: 'cancel' }, { text: 'Quitter', style: 'destructive', onPress: () => navigation.dispatch(data.action) }]);
  });
  useEffect(() => {
    if (published) navigatePrimaryTab(navigation, 'Profile', { tab: 'posts' });
  }, [published, navigation]);
  useEffect(() => {
    if (!picker || !auth.user?.username) return;
    const epoch = ++request.current; setLoading(true); setTrackError('');
    void getMyProfile(auth.user.username).then(profile => { if (epoch === request.current) setTracks(profile.tracks); })
      .catch(() => { if (epoch === request.current) setTrackError('Tes sons ne peuvent pas être chargés.'); })
      .finally(() => { if (epoch === request.current) setLoading(false); });
    return () => { request.current++; };
  }, [picker, auth.user?.username, retry]);
  const filtered = useMemo(() => tracks.filter(track => (track.title || '').toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'))), [tracks, search]);
  const ready = mode === 'photo' ? Boolean(asset) : mode === 'track_share' ? Boolean(selectedTrack) : Boolean(text.trim());

  const pickImage = async () => {
    if (lock.current) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError('Autorise les photos dans les réglages de ton téléphone pour joindre une image.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .9 });
      const item = result.canceled ? null : result.assets[0]; if (!item) return;
      setAsset({ uri: item.uri, name: item.fileName || 'publication.jpg', type: item.mimeType || 'image/jpeg', size: item.fileSize, aspect: Math.max(.5, Math.min(2, item.width / Math.max(1, item.height))) });
      setMode('photo'); setError(''); uploaded.current = null;
    } catch { setError('Impossible d’ouvrir la galerie. Réessaie.'); }
  };
  const chooseMode = (next: Mode) => {
    if (lock.current) return;
    setMode(next); setError('');
    if (next === 'photo' && !asset) void pickImage();
    if (next === 'track_share' && !selectedTrack) setPicker(true);
  };
  const submit = async () => {
    if (!ready || lock.current || !auth.user) return;
    lock.current = true; setBusy(true); setError('');
    // Snapshot the draft once. Editing is disabled until its request settles.
    const draft = { mode, text: text.trim(), asset, track: selectedTrack };
    try {
      let imageUrl: string | null = null;
      if (draft.mode === 'photo' && draft.asset) {
        if (uploaded.current?.uri !== draft.asset.uri) {
          const result = await uploadToLocalMediaMobile(draft.asset, 'post-image');
          uploaded.current = { uri: draft.asset.uri, url: result.secureUrl };
        }
        imageUrl = uploaded.current!.url;
      }
      await createPost({ content: draft.text, imageUrl, trackId: draft.mode === 'track_share' ? draft.track?._id : null, type: draft.mode });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPublished(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Publication impossible. Ton brouillon reste ici.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <CollectionSurface><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[layout.contentFrame, { paddingTop: insets.top, paddingHorizontal: layout.gutter }]}><CollectionHeader title="Nouveau post" onBack={() => navigation.goBack()} /></View>
    {!auth.user ? <CollectionEmpty icon="create-outline" title="Prends la parole" text="Une pensée, une image ou un son à partager avec la communauté." action="Se connecter" onPress={() => navigation.navigate('Login')} /> : <>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[layout.pageContent, { paddingTop: 10, paddingBottom: 28, gap: 22 }]}>
        <View style={s.author}><View style={[s.avatar, { backgroundColor: p.raised }]}><Text style={{ color: p.blue, fontSize: 24, fontWeight: '800' }}>{(auth.user.name || auth.user.username || 'S').slice(0, 1).toUpperCase()}</Text></View><View style={s.flex}><Text style={[s.name, { color: p.text }]}>{auth.user.name || auth.user.username}</Text><Text style={[s.meta, { color: p.muted }]}>Visible par tous sur Synaura</Text></View><Ionicons name="earth-outline" size={19} color={p.muted} /></View>
        <View pointerEvents={busy ? 'none' : 'auto'}><CollectionTabs value={mode} onChange={chooseMode} options={[{ value: 'text', label: 'Texte', icon: 'chatbubble-outline' }, { value: 'photo', label: 'Image', icon: 'image-outline' }, { value: 'track_share', label: 'Son', icon: 'musical-note-outline' }]} /></View>
        <TextInput accessibilityLabel="Texte de la publication" value={text} onChangeText={setText} editable={!busy} multiline maxLength={1200} placeholder="Qu’est-ce qui te fait vibrer ?" placeholderTextColor={p.faint} style={[s.composer, { color: p.text }]} />
        <Text style={[s.counter, { color: p.faint }]}>{text.length} / 1200</Text>
        {mode === 'photo' ? asset ? <View style={[s.image, { backgroundColor: p.raised, aspectRatio: asset.aspect }]}><Image source={{ uri: asset.uri }} resizeMode="contain" style={StyleSheet.absoluteFillObject} /><EntryPressable accessibilityRole="button" accessibilityLabel="Retirer l’image" disabled={busy} onPress={() => setAsset(null)} style={s.remove}><Ionicons name="close" size={22} color="#FFFFFF" /></EntryPressable></View> : <CollectionEmpty icon="image-outline" title="Une image à partager" action="Ouvrir la galerie" onPress={() => void pickImage()} /> : null}
        {mode === 'track_share' ? <View style={[s.attachment, { backgroundColor: p.surface }]}>{selectedTrack ? <><MusicRow track={selectedTrack} playing={player.current?._id === selectedTrack._id && player.isPlaying} onPlay={() => void (player.current?._id === selectedTrack._id ? player.togglePlayPause() : player.playTrack(selectedTrack))} /><EntryPressable disabled={busy} accessibilityRole="button" onPress={() => setPicker(true)} style={s.change}><Text style={[s.name, { color: p.blue }]}>Changer de son</Text></EntryPressable></> : <CollectionEmpty icon="musical-notes-outline" title="Le son que tu veux partager" action="Choisir dans mes sons" onPress={() => setPicker(true)} />}</View> : null}
        {error ? <Text accessibilityRole="alert" style={[s.error, { color: p.text, backgroundColor: p.raised }]}>{error}</Text> : null}
      </ScrollView>
      <View style={[s.dock, { backgroundColor: p.bg, paddingBottom: Math.max(insets.bottom, 12), paddingLeft: layout.pagePaddingLeft, paddingRight: layout.pagePaddingRight }]}><EntryPressable accessibilityRole="button" disabled={!ready || busy} onPress={() => void submit()} style={[s.publish, { backgroundColor: p.text }]}>{busy ? <ActivityIndicator color={p.bg} /> : <Ionicons name="arrow-up" size={20} color={p.bg} />}<Text style={[s.name, { color: p.bg }]}>{busy ? 'Publication…' : 'Publier'}</Text></EntryPressable></View>
    </>}
    <BottomSheet visible={picker} onClose={() => setPicker(false)} title="Joindre un son" keyboard maxHeight="90%"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }}><TextInput accessibilityLabel="Rechercher dans mes sons" value={search} onChangeText={setSearch} placeholder="Rechercher un de tes sons" placeholderTextColor={p.faint} style={[s.search, { backgroundColor: p.raised, color: p.text }]} />{loading ? <CollectionEmpty loading title="Tes sons arrivent…" /> : trackError ? <CollectionEmpty title={trackError} action="Réessayer" onPress={() => setRetry(value => value + 1)} /> : filtered.length ? filtered.map(track => <MusicRow key={track._id} track={track} playing={player.current?._id === track._id && player.isPlaying} onPlay={() => void (player.current?._id === track._id ? player.togglePlayPause() : player.playTrack(track))} onOpen={() => { setSelectedTrack(track); setMode('track_share'); setPicker(false); }} onMore={() => { setSelectedTrack(track); setMode('track_share'); setPicker(false); }} />) : <CollectionEmpty title={search ? 'Aucun résultat' : 'Pas encore de son publié'} text="Tu peux aussi partager un son directement depuis son lecteur." />}</ScrollView></BottomSheet>
  </KeyboardAvoidingView></CollectionSurface>;
}
const s = StyleSheet.create({
  flex: { flex: 1 }, author: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700' }, meta: { fontSize: 12, marginTop: 5 },
  composer: { minHeight: 155, textAlignVertical: 'top', fontSize: 23, lineHeight: 32, padding: 0 }, counter: { fontSize: 12, textAlign: 'right', marginTop: -12 },
  image: { width: '100%', borderRadius: 24, overflow: 'hidden' }, remove: { position: 'absolute', right: 10, top: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,.7)', alignItems: 'center', justifyContent: 'center' },
  attachment: { borderRadius: 24, padding: 16 }, change: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dock: { paddingTop: 10 }, publish: { minHeight: 54, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  error: { padding: 18, borderRadius: 18, fontSize: 14, lineHeight: 21 }, search: { minHeight: 50, borderRadius: 18, paddingHorizontal: 16, fontSize: 15 },
});

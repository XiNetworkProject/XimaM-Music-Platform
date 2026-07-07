import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Track } from '@/api/types';
import type { SpotlightArtist } from './feedTypes';
import { colors } from '@/theme/tokens';

type Props = {
  artist: SpotlightArtist;
  track: Track;
  height: number;
  topPad: number;
  bottomPad: number;
  isActive: boolean;
  isPlaying: boolean;
  isFollowing: boolean;
  followLoading?: boolean;
  onPress: () => void;
  onToggleFollow: () => void;
  onOpenArtist: () => void;
};

export function ArtistSpotlightSlide({
  artist,
  track,
  height,
  topPad,
  bottomPad,
  isPlaying,
  isFollowing,
  followLoading,
  onPress,
  onToggleFollow,
  onOpenArtist,
}: Props) {
  return (
    <View style={[styles.root, { height, paddingTop: topPad + 92, paddingBottom: bottomPad + 24 }]}>
      <LinearGradient colors={['#171313', '#1C1620', '#171313']} style={StyleSheet.absoluteFill} />

      <View style={styles.center}>
        <Pressable accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Écouter'} onPress={onPress} style={styles.avatarShell}>
          {artist.avatar ? (
            <Image source={{ uri: artist.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{artist.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.playBadge}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#FFFAF2" style={!isPlaying ? { marginLeft: 2 } : null} />
          </View>
        </Pressable>

        <Text style={styles.kicker}>MISE EN AVANT</Text>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{artist.name}</Text>
          {artist.isVerified ? <Ionicons name="checkmark-circle" size={18} color={colors.cyan} /> : null}
        </View>
        {track.genre?.[0] ? <Text style={styles.style}>{track.genre[0]}</Text> : null}
        {artist.bio ? <Text numberOfLines={3} style={styles.bio}>{artist.bio}</Text> : null}
        <Text style={styles.featured}>En vedette · {track.title}</Text>
      </View>

      <View style={styles.footer}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.footerName}>{artist.name}</Text>
          <Text numberOfLines={1} style={styles.footerHandle}>@{artist.username || 'synaura'}</Text>
        </View>
        <Pressable
          accessibilityLabel={isFollowing ? 'Déjà suivi' : 'Suivre'}
          disabled={!artist.username || followLoading}
          onPress={onToggleFollow}
          style={[styles.followButton, isFollowing && styles.followButtonDone]}
        >
          <Text style={[styles.followText, isFollowing && styles.followTextDone]}>{isFollowing ? 'Suivi' : 'Suivre'}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Découvrir son univers" onPress={onOpenArtist} style={styles.discoverButton}>
          <Text style={styles.discoverText}>Découvrir son univers</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFAF2" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', paddingHorizontal: 20, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarShell: { width: 176, height: 176, borderRadius: 88, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.4)' },
  avatarLetter: { color: '#FFFAF2', fontSize: 50, fontWeight: '900' },
  playBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.22)',
  },
  kicker: { marginTop: 22, color: '#C9A8FF', fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  nameRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#FFFAF2', fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  style: { marginTop: 4, color: '#4A9EAA', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  bio: { marginTop: 10, maxWidth: 280, textAlign: 'center', color: 'rgba(255,250,242,0.6)', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  featured: { marginTop: 14, color: 'rgba(255,250,242,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  footer: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10,
    borderRadius: 28, backgroundColor: 'rgba(255,250,242,0.96)', padding: 16,
  },
  footerName: { color: '#171313', fontSize: 14, fontWeight: '900' },
  footerHandle: { marginTop: 2, color: 'rgba(23,19,19,0.48)', fontSize: 11, fontWeight: '700' },
  followButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.08)' },
  followButtonDone: { backgroundColor: colors.violet },
  followText: { color: '#171313', fontSize: 12, fontWeight: '900' },
  followTextDone: { color: '#FFFAF2' },
  discoverButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#171313',
  },
  discoverText: { color: '#FFFAF2', fontSize: 12, fontWeight: '900' },
});

export default ArtistSpotlightSlide;

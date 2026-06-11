import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSynauraCity, voteSynauraCityBattle } from '@/api/client';
import type {
  CityArtist,
  CityAward,
  CityBadge,
  CityEvent,
  CityPulseTrack,
  CityShowcaseItem,
  SynauraCityData,
  Track,
} from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { TrackCover } from '@/components/TrackCover';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { SynauraBackground } from '@/components/SynauraBackground';
import { usePlayer } from '@/player/PlayerProvider';
import { spacing } from '@/theme/tokens';

const ink = '#171313';
const paper = '#FFFAF2';
const muted = 'rgba(23,19,19,0.42)';
const border = 'rgba(23,19,19,0.08)';

function compact(value: number | undefined) {
  const numberValue = Number(value || 0);
  if (numberValue >= 1_000_000) return `${(numberValue / 1_000_000).toFixed(1)}M`;
  if (numberValue >= 1_000) return `${(numberValue / 1_000).toFixed(1)}K`;
  return String(numberValue);
}

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function iconName(value: string): any {
  const icons: Record<string, string> = {
    rocket: 'rocket',
    'person-add': 'person-add',
    sparkles: 'sparkles',
    happy: 'happy',
    heart: 'heart',
    trophy: 'trophy',
    telescope: 'telescope',
    chatbubbles: 'chatbubbles',
    image: 'image',
    calendar: 'calendar',
    'color-wand': 'color-wand',
    flash: 'flash',
    sunny: 'sunny',
    gift: 'gift',
    moon: 'moon',
    headset: 'headset',
    ribbon: 'ribbon',
    megaphone: 'megaphone',
  };
  return icons[value] || 'sparkles';
}

export function CityScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const player = usePlayer();
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setCity(await getSynauraCity());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Impossible de charger Synaura City');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const play = useCallback(async (track: Track) => {
    if (player.current?._id === track._id) {
      await player.togglePlayPause();
      return;
    }
    await player.playTrack(track);
  }, [player]);

  const battle = useMemo(() => city?.events.find((event) => event.kind === 'battle') || null, [city?.events]);
  const vote = useCallback(async (trackId: string) => {
    if (!battle || voting) return;
    if (!auth.requireAuth()) return;
    setVoting(true);
    setError(null);
    try {
      await voteSynauraCityBattle(battle.id, trackId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Vote impossible');
    } finally {
      setVoting(false);
    }
  }, [auth, battle, load, voting]);

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><SynauraBackground variant="feed" /></View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 28) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={ink} />}
      >
        <View style={styles.topRow}>
          <MotionPressable onPress={() => navigation.goBack()} style={styles.roundButton}><Ionicons name="chevron-back" size={20} color={ink} /></MotionPressable>
          <View style={styles.topCopy}><Text style={styles.topKicker}>EN DIRECT</Text><Text style={styles.topTitle}>Synaura City</Text></View>
          <MotionPressable onPress={() => void load(true)} style={styles.roundButton}><Ionicons name="refresh" size={18} color={ink} /></MotionPressable>
        </View>

        {loading && !city ? <LoadingCity /> : null}
        {error ? <View style={styles.error}><Ionicons name="alert-circle" size={16} color="#B42318" /><Text style={styles.errorText}>{error}</Text></View> : null}
        {city ? (
          <>
            <CityHero city={city} onUpload={() => navigation.navigate('Upload')} onCommunity={() => navigation.navigate('Community')} />
            <SectionTitle icon="sparkles" title="La Vitrine du Jour" subtitle="Cinq raisons de lancer la lecture aujourd hui." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
              {city.showcase.map((item, index) => <ShowcaseCard key={item.id} item={item} index={index} playing={player.current?._id === item.track._id && player.isPlaying} onPlay={play} />)}
            </ScrollView>

            <SectionTitle icon="pulse" title="Synaura Pulse" subtitle="Les sons qui font reagir la ville." />
            <View style={styles.stack}>
              {city.pulse.slice(0, 6).map((track, index) => <PulseCard key={track._id} track={track} rank={index + 1} playing={player.current?._id === track._id && player.isPlaying} onPlay={play} />)}
            </View>

            <SectionTitle icon="rocket" title="Nouveaux talents" subtitle="Leurs premiers sons viennent d arriver." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
              {city.spotlightArtists.map((artist, index) => <ArtistCard key={artist.id} artist={artist} index={index} onOpen={() => navigation.navigate('PublicProfile', { username: artist.username })} onPlay={play} />)}
            </ScrollView>

            {city.premieres.length ? (
              <>
                <SectionTitle icon="time" title="Lancements officiels" subtitle="Sois parmi les premiers a ecouter." />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
                  {city.premieres.slice(0, 5).map((track, index) => <PremiereCard key={track._id} track={track} index={index} playing={player.current?._id === track._id && player.isPlaying} onPlay={play} />)}
                </ScrollView>
              </>
            ) : null}

            <SectionTitle icon="calendar" title="Evenements de la semaine" subtitle="Challenges, battle et rendez-vous collectifs." />
            <View style={styles.stack}>
              {city.events.map((event, index) => (
                event.kind === 'battle'
                  ? <BattleCard key={event.id} event={event} voting={voting} player={player} onPlay={play} onVote={vote} />
                  : <EventCard key={event.id} event={event} index={index} onParticipate={() => navigation.navigate('Community', { compose: event.kind === 'challenge', category: event.kind === 'challenge' ? 'remix' : undefined })} onPlay={play} />
              ))}
            </View>

            <Radar tracks={city.radar} player={player} onPlay={play} />
            <HallOfFame awards={city.hallOfFame} onPlay={play} />
            <Badges badges={city.listenerBadges} />
            <CreatorProgress artist={city.creatorCard} onCreate={() => navigation.navigate('Upload')} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function LoadingCity() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={ink} />
      <Text style={styles.loadingText}>La ville se reveille...</Text>
    </View>
  );
}

function CityHero({ city, onUpload, onCommunity }: { city: SynauraCityData; onUpload: () => void; onCommunity: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return (
    <View style={styles.hero}>
      <LinearGradient colors={['#171313', '#34203A', '#123B3C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.heroSignal, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.48] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }] }]} />
      <View style={styles.heroBadge}><Ionicons name="radio" size={14} color="#7EF2ED" /><Text style={styles.heroBadgeText}>SYNAURA CITY EST OUVERTE</Text></View>
      <Text style={styles.heroTitle}>{city.cityMood.title}</Text>
      <Text style={styles.heroSubtitle}>{city.cityMood.subtitle}</Text>
      <View style={styles.heroStats}>
        <HeroStat label="Reactions" value={compact(city.cityMood.reactionsToday)} />
        <HeroStat label="Drops" value={compact(city.cityMood.newDrops)} />
        <HeroStat label="Pulse" value={compact(city.pulse.filter((track) => track.pulse >= 60).length)} />
      </View>
      <View style={styles.heroActions}>
        <MotionPressable onPress={onUpload} style={styles.heroPrimary}><Ionicons name="rocket" size={15} color={ink} /><Text style={styles.heroPrimaryText}>Lancer un drop</Text></MotionPressable>
        <MotionPressable onPress={onCommunity} style={styles.heroSecondary}><Ionicons name="people" size={15} color={paper} /><Text style={styles.heroSecondaryText}>Communaute</Text></MotionPressable>
      </View>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return <View style={styles.heroStat}><Text style={styles.heroStatValue}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View>;
}

function SectionTitle({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <View style={styles.sectionIcon}><Ionicons name={icon} size={17} color={paper} /></View>
      <View style={styles.sectionCopy}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>
    </View>
  );
}

function ShowcaseCard({ item, index, playing, onPlay }: { item: CityShowcaseItem; index: number; playing: boolean; onPlay: (track: Track) => void }) {
  return (
    <Reveal delay={index * 55}>
      <MotionPressable onPress={() => onPlay(item.track)} style={styles.showcase}>
        <TrackCover track={item.track} active style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(23,19,19,0.05)', 'rgba(23,19,19,0.94)']} style={StyleSheet.absoluteFill} />
        <View style={styles.showcaseTop}>
          <View style={styles.showcaseLabel}><Ionicons name={iconName(item.icon)} size={12} color={item.accent} /><Text style={styles.showcaseLabelText}>{item.label}</Text></View>
          <View style={styles.showcasePlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={ink} /></View>
        </View>
        <View style={styles.showcaseBottom}><Text style={styles.showcaseCaption}>{item.caption}</Text><Text numberOfLines={2} style={styles.showcaseTitle}>{item.track.title}</Text><Text numberOfLines={1} style={styles.showcaseArtist}>{artistName(item.track)}</Text></View>
      </MotionPressable>
    </Reveal>
  );
}

function PulseCard({ track, rank, playing, onPlay }: { track: CityPulseTrack; rank: number; playing: boolean; onPlay: (track: Track) => void }) {
  return (
    <MotionPressable onPress={() => onPlay(track)} style={styles.pulseCard}>
      <Text style={styles.pulseRank}>{String(rank).padStart(2, '0')}</Text>
      <TrackCover track={track} active style={styles.pulseCover} />
      <View style={styles.pulseCopy}>
        <View style={styles.pulseTitleRow}><Text numberOfLines={1} style={styles.pulseTitle}>{track.title}</Text><Text style={styles.pulseState}>{track.pulseState}</Text></View>
        <Text numberOfLines={1} style={styles.pulseArtist}>{artistName(track)} · {track.pulseReasons.join(' · ')}</Text>
        <View style={styles.pulseBar}><View style={[styles.pulseBarFill, { width: `${track.pulse}%` }]} /></View>
      </View>
      <View style={styles.pulseValue}><Text style={styles.pulseNumber}>{track.pulse}%</Text><Ionicons name={playing ? 'pause' : 'pulse'} size={13} color="#7C5CFF" /></View>
    </MotionPressable>
  );
}

function ArtistCard({ artist, index, onOpen, onPlay }: { artist: CityArtist; index: number; onOpen: () => void; onPlay: (track: Track) => void }) {
  return (
    <Reveal delay={index * 55}>
      <View style={styles.artistCard}>
        <LinearGradient colors={['#FF6F61', '#7C5CFF', '#00A7B2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.artistBanner} />
        {artist.featuredTrack ? <TrackCover track={artist.featuredTrack} active style={styles.artistBannerCover} /> : null}
        <Text style={styles.artistBooster}>NOUVEAU TALENT DECOUVERT</Text>
        <Image source={artist.avatar ? { uri: artist.avatar } : require('../assets/synaura-symbol-2026.png')} style={styles.artistAvatar} />
        <View style={styles.artistBody}>
          <Text numberOfLines={1} style={styles.artistName}>{artist.name}</Text>
          <Text numberOfLines={1} style={styles.artistHandle}>@{artist.username} · {artist.genre[0] || artist.levelName}</Text>
          <Text style={styles.artistStats}>{compact(artist.totalPlays)} ecoutes · {compact(artist.totalLikes)} likes</Text>
          <View style={styles.artistActions}>
            <MotionPressable onPress={onOpen} style={styles.artistOpen}><Text style={styles.artistOpenText}>Decouvrir</Text></MotionPressable>
            {artist.featuredTrack ? <MotionPressable onPress={() => onPlay(artist.featuredTrack!)} style={styles.artistPlay}><Ionicons name="play" size={14} color={ink} /></MotionPressable> : null}
          </View>
        </View>
      </View>
    </Reveal>
  );
}

function PremiereCard({ track, index, playing, onPlay }: { track: CityPulseTrack; index: number; playing: boolean; onPlay: (track: Track) => void }) {
  return (
    <Reveal delay={index * 45}>
      <MotionPressable onPress={() => onPlay(track)} style={styles.premiere}>
        <TrackCover track={track} active style={styles.premiereCover} />
        <LinearGradient colors={['rgba(23,19,19,0.05)', 'rgba(23,19,19,0.92)']} style={StyleSheet.absoluteFill} />
        <Text style={styles.premiereBadge}>NOUVEAU DROP</Text>
        <View style={styles.premierePlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={ink} /></View>
        <View style={styles.premiereBottom}><Text style={styles.premierePulse}>DISPONIBLE · PULSE {track.pulse}%</Text><Text numberOfLines={1} style={styles.premiereTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.premiereArtist}>Nouveau drop de {artistName(track)}</Text></View>
      </MotionPressable>
    </Reveal>
  );
}

function EventCard({ event, index, onParticipate, onPlay }: { event: CityEvent; index: number; onParticipate: () => void; onPlay: (track: Track) => void }) {
  const first = event.tracks?.[0];
  return (
    <Reveal delay={index * 45}>
      <View style={styles.eventCard}>
        {first ? <TrackCover track={first} active style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={['rgba(23,19,19,0.96)', 'rgba(23,19,19,0.72)', 'rgba(23,19,19,0.30)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={styles.eventIcon}><Ionicons name={iconName(event.icon)} size={20} color={event.accent} /></View>
        {event.challengeTag ? <Text style={styles.eventTag}>{event.challengeTag}</Text> : null}
        <View style={styles.eventBody}><Text style={styles.eventKicker}>{event.subtitle}</Text><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventDescription}>{event.description}</Text><View style={styles.eventActions}><MotionPressable onPress={onParticipate} style={styles.eventPrimary}><Text style={styles.eventPrimaryText}>Participer</Text><Ionicons name="arrow-forward" size={14} color={ink} /></MotionPressable>{first ? <MotionPressable onPress={() => onPlay(first)} style={styles.eventPlay}><Ionicons name="play" size={14} color={paper} /></MotionPressable> : null}</View></View>
      </View>
    </Reveal>
  );
}

function BattleCard({ event, voting, player, onPlay, onVote }: { event: CityEvent; voting: boolean; player: ReturnType<typeof usePlayer>; onPlay: (track: Track) => void; onVote: (trackId: string) => void }) {
  const tracks = event.tracks || [];
  const total = tracks.reduce((sum, track) => sum + Number(event.voteCounts?.[track._id] || 0), 0) || 1;
  return (
    <View style={styles.battle}>
      <View style={styles.battleHeader}><View><Text style={styles.battleKicker}>{event.subtitle}</Text><Text style={styles.battleTitle}>{event.title}</Text></View><Ionicons name="flash" size={23} color="#7EF2ED" /></View>
      <View style={styles.battleGrid}>
        {tracks.map((track) => {
          const selected = event.selectedTrackId === track._id;
          const percent = Math.round(Number(event.voteCounts?.[track._id] || 0) / total * 100);
          const playing = player.current?._id === track._id && player.isPlaying;
          return (
            <View key={track._id} style={[styles.battleTrack, selected && styles.battleTrackSelected]}>
              <MotionPressable onPress={() => onPlay(track)} style={styles.battleCoverWrap}><TrackCover track={track} active style={StyleSheet.absoluteFill} /><View style={styles.battlePlay}><Ionicons name={playing ? 'pause' : 'play'} size={16} color={ink} /></View></MotionPressable>
              <Text numberOfLines={1} style={styles.battleTrackTitle}>{track.title}</Text>
              <Text numberOfLines={1} style={styles.battleArtist}>{artistName(track)}</Text>
              <MotionPressable disabled={voting} onPress={() => onVote(track._id)} style={[styles.voteButton, selected && styles.voteButtonSelected]}><Ionicons name={selected ? 'checkmark' : 'flash'} size={12} color={selected ? ink : paper} /><Text style={[styles.voteText, selected && styles.voteTextSelected]}>{selected ? 'Ton vote' : `Voter · ${percent}%`}</Text></MotionPressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Radar({ tracks, player, onPlay }: { tracks: CityPulseTrack[]; player: ReturnType<typeof usePlayer>; onPlay: (track: Track) => void }) {
  const scan = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(scan, { toValue: 1, duration: 2600, useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [scan]);
  return (
    <View style={styles.radar}>
      <Animated.View style={[styles.radarRing, { opacity: scan.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: scan.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.2] }) }] }]} />
      <View style={styles.radarHeader}><View style={styles.radarIcon}><Ionicons name="telescope" size={20} color="#103334" /></View><View><Text style={styles.radarTitle}>Radar des talents</Text><Text style={styles.radarSubtitle}>Pepites encore sous les 500 ecoutes.</Text></View></View>
      <View style={styles.radarList}>
        {tracks.slice(0, 5).map((track) => (
          <MotionPressable key={track._id} onPress={() => onPlay(track)} style={styles.radarRow}><TrackCover track={track} active style={styles.radarCover} /><View style={styles.radarCopy}><Text numberOfLines={1} style={styles.radarTrack}>{track.title}</Text><Text numberOfLines={1} style={styles.radarArtist}>{artistName(track)} · signal {track.pulse}%</Text></View><Ionicons name={player.current?._id === track._id && player.isPlaying ? 'pause' : 'chevron-forward'} size={16} color="#7EF2ED" /></MotionPressable>
        ))}
      </View>
    </View>
  );
}

function HallOfFame({ awards, onPlay }: { awards: CityAward[]; onPlay: (track: Track) => void }) {
  return (
    <View style={styles.lightPanel}>
      <View style={styles.panelHeader}><View style={styles.panelIcon}><Ionicons name="trophy" size={20} color="#FFD667" /></View><View><Text style={styles.panelTitle}>Hall of Fame</Text><Text style={styles.panelSubtitle}>Les Synaura Awards de la semaine.</Text></View></View>
      <View style={styles.awards}>
        {awards.map((award, index) => {
          const title = award.track?.title || award.artist?.name || 'Synaura';
          const subtitle = award.track ? artistName(award.track) : award.artist ? `@${award.artist.username}` : award.subtitle;
          return (
            <MotionPressable key={award.id} onPress={() => award.track && onPlay(award.track)} style={styles.awardRow}><View style={[styles.awardIcon, index === 0 && styles.awardIconFirst]}><Ionicons name={iconName(award.icon)} size={16} color={index === 0 ? ink : '#7C5CFF'} /></View><View style={styles.awardCopy}><Text numberOfLines={1} style={styles.awardTitle}>{award.title}</Text><Text numberOfLines={1} style={styles.awardSubtitle}>{title} · {subtitle}</Text></View></MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

function Badges({ badges }: { badges: CityBadge[] }) {
  return (
    <View style={styles.lightPanel}>
      <View style={styles.panelHeader}><View style={[styles.panelIcon, { backgroundColor: '#FF4B7A' }]}><Ionicons name="ribbon" size={20} color={paper} /></View><View><Text style={styles.panelTitle}>Badges auditeur</Text><Text style={styles.panelSubtitle}>Ta facon de soutenir la scene compte.</Text></View></View>
      <View style={styles.awards}>
        {badges.map((badge) => (
          <View key={badge.id} style={[styles.badgeRow, badge.unlocked && styles.badgeRowUnlocked]}><View style={[styles.badgeIcon, badge.unlocked && styles.badgeIconUnlocked]}><Ionicons name={iconName(badge.icon)} size={16} color={badge.unlocked ? paper : 'rgba(23,19,19,0.25)'} /></View><View style={styles.badgeCopy}><Text style={styles.badgeTitle}>{badge.title}</Text><Text style={styles.badgeDescription}>{badge.description}</Text><View style={styles.badgeBar}><View style={[styles.badgeBarFill, { width: `${Math.min(100, badge.progress / badge.target * 100)}%` }]} /></View></View><Text style={styles.badgeProgress}>{badge.progress}/{badge.target}</Text></View>
        ))}
      </View>
    </View>
  );
}

function CreatorProgress({ artist, onCreate }: { artist: CityArtist | null; onCreate: () => void }) {
  const progress = artist ? Math.min(100, artist.xp / artist.nextLevelXp * 100) : 0;
  return (
    <View style={styles.creatorProgress}>
      <LinearGradient colors={['#171313', '#35213D', '#123A3B']} style={StyleSheet.absoluteFill} />
      <View style={styles.creatorProgressHeader}><View style={styles.creatorProgressIcon}><Ionicons name="analytics" size={20} color="#7EF2ED" /></View><View><Text style={styles.creatorProgressTitle}>Carte artiste evolutive</Text><Text style={styles.creatorProgressSubtitle}>Ton activite construit ton statut.</Text></View></View>
      {artist ? <View style={styles.creatorProgressBody}><Image source={artist.avatar ? { uri: artist.avatar } : require('../assets/synaura-symbol-2026.png')} style={styles.creatorProgressAvatar} /><View style={styles.creatorProgressCopy}><Text style={styles.creatorLevel}>NIVEAU {artist.level}</Text><Text style={styles.creatorLevelName}>{artist.levelName}</Text><Text style={styles.creatorXp}>{artist.xp} XP · {artist.trackCount} sons</Text></View><View style={styles.creatorBar}><View style={[styles.creatorBarFill, { width: `${progress}%` }]} /></View><Text style={styles.creatorNext}>{Math.max(0, artist.nextLevelXp - artist.xp)} XP avant le prochain niveau</Text></View> : <View style={styles.creatorEmpty}><Ionicons name="musical-notes" size={28} color="#7EF2ED" /><Text style={styles.creatorEmptyText}>Publie ton premier son pour creer ta carte artiste.</Text><MotionPressable onPress={onCreate} style={styles.creatorButton}><Text style={styles.creatorButtonText}>Commencer</Text></MotionPressable></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EFE6' },
  content: { paddingHorizontal: spacing.md, paddingBottom: 190 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  roundButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.90)', borderWidth: 1, borderColor: border },
  topCopy: { flex: 1 },
  topKicker: { color: '#7C5CFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  topTitle: { marginTop: 2, color: ink, fontSize: 25, fontWeight: '900' },
  loading: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: muted, fontSize: 12, fontWeight: '900' },
  error: { marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 18, backgroundColor: '#FEF3F2', padding: spacing.md },
  errorText: { flex: 1, color: '#B42318', fontSize: 11, fontWeight: '800' },
  hero: { minHeight: 390, overflow: 'hidden', borderRadius: 28, padding: spacing.lg, shadowColor: ink, shadowOpacity: 0.24, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  heroSignal: { position: 'absolute', right: -70, top: -70, width: 280, height: 280, borderRadius: 140, borderWidth: 1, borderColor: '#7EF2ED' },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 7 },
  heroBadgeText: { color: '#7EF2ED', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { marginTop: spacing.xl, maxWidth: 290, color: paper, fontSize: 38, lineHeight: 39, fontWeight: '900' },
  heroSubtitle: { marginTop: spacing.md, maxWidth: 310, color: 'rgba(255,250,242,0.52)', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  heroStats: { marginTop: spacing.xl, flexDirection: 'row', gap: spacing.sm },
  heroStat: { flex: 1, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', padding: spacing.sm },
  heroStatValue: { color: paper, fontSize: 19, fontWeight: '900' },
  heroStatLabel: { marginTop: 3, color: 'rgba(255,250,242,0.36)', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  heroActions: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  heroPrimary: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 22, backgroundColor: paper, paddingHorizontal: spacing.md },
  heroPrimaryText: { color: ink, fontSize: 11, fontWeight: '900' },
  heroSecondary: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: spacing.md },
  heroSecondaryText: { color: paper, fontSize: 11, fontWeight: '900' },
  sectionTitleWrap: { marginTop: 30, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: ink },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: ink, fontSize: 21, fontWeight: '900' },
  sectionSubtitle: { marginTop: 2, color: muted, fontSize: 11, fontWeight: '700' },
  horizontalRail: { gap: spacing.sm, paddingRight: spacing.md },
  stack: { gap: spacing.sm },
  showcase: { width: 218, height: 285, overflow: 'hidden', justifyContent: 'space-between', borderRadius: 24, backgroundColor: ink, padding: spacing.md },
  showcaseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  showcaseLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.36)', paddingHorizontal: 8, paddingVertical: 6 },
  showcaseLabelText: { color: paper, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  showcasePlay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: paper },
  showcaseBottom: { marginTop: 'auto' },
  showcaseCaption: { color: 'rgba(255,250,242,0.46)', fontSize: 8, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  showcaseTitle: { marginTop: 5, color: paper, fontSize: 21, lineHeight: 23, fontWeight: '900' },
  showcaseArtist: { marginTop: 4, color: 'rgba(255,250,242,0.48)', fontSize: 10, fontWeight: '700' },
  pulseCard: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 23, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,250,242,0.90)', padding: spacing.sm },
  pulseRank: { width: 20, color: 'rgba(23,19,19,0.26)', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  pulseCover: { width: 58, height: 58, borderRadius: 17 },
  pulseCopy: { flex: 1, minWidth: 0 },
  pulseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pulseTitle: { flex: 1, color: ink, fontSize: 12, fontWeight: '900' },
  pulseState: { overflow: 'hidden', borderRadius: 9, backgroundColor: 'rgba(124,92,255,0.10)', paddingHorizontal: 6, paddingVertical: 3, color: '#6D4AF1', fontSize: 7, fontWeight: '900' },
  pulseArtist: { marginTop: 4, color: muted, fontSize: 9, fontWeight: '700' },
  pulseBar: { marginTop: 7, height: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(23,19,19,0.07)' },
  pulseBarFill: { height: 4, borderRadius: 2, backgroundColor: '#7C5CFF' },
  pulseValue: { width: 38, alignItems: 'center', gap: 3 },
  pulseNumber: { color: ink, fontSize: 12, fontWeight: '900' },
  artistCard: { width: 270, overflow: 'hidden', borderRadius: 25, borderWidth: 1, borderColor: border, backgroundColor: paper },
  artistBanner: { height: 100 },
  artistBannerCover: { ...StyleSheet.absoluteFillObject, height: 100, opacity: 0.38 },
  artistBooster: { position: 'absolute', left: 12, top: 12, color: paper, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  artistAvatar: { position: 'absolute', left: 14, top: 66, width: 65, height: 65, borderRadius: 20, borderWidth: 4, borderColor: paper, backgroundColor: paper },
  artistBody: { padding: spacing.md, paddingTop: 39 },
  artistName: { color: ink, fontSize: 19, fontWeight: '900' },
  artistHandle: { marginTop: 3, color: muted, fontSize: 10, fontWeight: '700' },
  artistStats: { marginTop: spacing.sm, color: 'rgba(23,19,19,0.52)', fontSize: 9, fontWeight: '900' },
  artistActions: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  artistOpen: { height: 38, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: ink },
  artistOpenText: { color: paper, fontSize: 10, fontWeight: '900' },
  artistPlay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)' },
  premiere: { width: 230, height: 250, overflow: 'hidden', borderRadius: 24, backgroundColor: ink, padding: spacing.md },
  premiereCover: { ...StyleSheet.absoluteFillObject },
  premiereBadge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 12, backgroundColor: '#FF4B7A', paddingHorizontal: 8, paddingVertical: 6, color: paper, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  premierePlay: { position: 'absolute', right: 12, top: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: paper },
  premiereBottom: { marginTop: 'auto' },
  premierePulse: { color: '#7EF2ED', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  premiereTitle: { marginTop: 5, color: paper, fontSize: 17, fontWeight: '900' },
  premiereArtist: { marginTop: 3, color: 'rgba(255,250,242,0.42)', fontSize: 9, fontWeight: '700' },
  eventCard: { minHeight: 270, overflow: 'hidden', borderRadius: 27, backgroundColor: ink, padding: spacing.lg },
  eventIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  eventTag: { position: 'absolute', right: spacing.lg, top: spacing.lg, overflow: 'hidden', borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 9, paddingVertical: 6, color: paper, fontSize: 8, fontWeight: '900' },
  eventBody: { marginTop: 'auto' },
  eventKicker: { color: 'rgba(255,250,242,0.44)', fontSize: 8, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase' },
  eventTitle: { marginTop: 4, color: paper, fontSize: 25, fontWeight: '900' },
  eventDescription: { marginTop: 7, maxWidth: 300, color: 'rgba(255,250,242,0.50)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  eventActions: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  eventPrimary: { height: 39, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, backgroundColor: paper, paddingHorizontal: spacing.md },
  eventPrimaryText: { color: ink, fontSize: 10, fontWeight: '900' },
  eventPlay: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  battle: { overflow: 'hidden', borderRadius: 27, backgroundColor: ink, padding: spacing.md },
  battleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  battleKicker: { color: '#7EF2ED', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  battleTitle: { marginTop: 3, color: paper, fontSize: 22, fontWeight: '900' },
  battleGrid: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  battleTrack: { flex: 1, minWidth: 0, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.07)', padding: 7 },
  battleTrackSelected: { borderColor: '#7EF2ED' },
  battleCoverWrap: { aspectRatio: 1, overflow: 'hidden', borderRadius: 15 },
  battlePlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.15)' },
  battleTrackTitle: { marginTop: 7, color: paper, fontSize: 10, fontWeight: '900' },
  battleArtist: { marginTop: 2, color: 'rgba(255,250,242,0.36)', fontSize: 8, fontWeight: '700' },
  voteButton: { marginTop: 8, height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.10)' },
  voteButtonSelected: { backgroundColor: '#7EF2ED' },
  voteText: { color: paper, fontSize: 8, fontWeight: '900' },
  voteTextSelected: { color: ink },
  radar: { marginTop: 30, overflow: 'hidden', borderRadius: 28, backgroundColor: '#103334', padding: spacing.lg },
  radarRing: { position: 'absolute', right: -35, top: -45, width: 210, height: 210, borderRadius: 105, borderWidth: 1, borderColor: '#7EF2ED' },
  radarHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  radarIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7EF2ED' },
  radarTitle: { color: paper, fontSize: 21, fontWeight: '900' },
  radarSubtitle: { marginTop: 2, color: 'rgba(255,250,242,0.40)', fontSize: 10, fontWeight: '700' },
  radarList: { marginTop: spacing.lg, gap: spacing.sm },
  radarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.06)', padding: 8 },
  radarCover: { width: 45, height: 45, borderRadius: 13 },
  radarCopy: { flex: 1, minWidth: 0 },
  radarTrack: { color: paper, fontSize: 10, fontWeight: '900' },
  radarArtist: { marginTop: 3, color: 'rgba(255,250,242,0.38)', fontSize: 8, fontWeight: '700' },
  lightPanel: { marginTop: 30, borderRadius: 28, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,250,242,0.90)', padding: spacing.lg },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  panelIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: ink },
  panelTitle: { color: ink, fontSize: 21, fontWeight: '900' },
  panelSubtitle: { marginTop: 2, color: muted, fontSize: 10, fontWeight: '700' },
  awards: { marginTop: spacing.lg, gap: spacing.sm },
  awardRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.04)', padding: spacing.sm },
  awardIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: paper },
  awardIconFirst: { backgroundColor: '#FFD667' },
  awardCopy: { flex: 1, minWidth: 0 },
  awardTitle: { color: ink, fontSize: 10, fontWeight: '900' },
  awardSubtitle: { marginTop: 3, color: muted, fontSize: 8, fontWeight: '700' },
  badgeRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.035)', padding: spacing.sm },
  badgeRowUnlocked: { backgroundColor: 'rgba(124,92,255,0.08)' },
  badgeIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: paper },
  badgeIconUnlocked: { backgroundColor: '#7C5CFF' },
  badgeCopy: { flex: 1, minWidth: 0 },
  badgeTitle: { color: ink, fontSize: 10, fontWeight: '900' },
  badgeDescription: { marginTop: 2, color: muted, fontSize: 8, fontWeight: '700' },
  badgeBar: { marginTop: 6, height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(23,19,19,0.06)' },
  badgeBarFill: { height: 3, borderRadius: 2, backgroundColor: '#7C5CFF' },
  badgeProgress: { color: muted, fontSize: 8, fontWeight: '900' },
  creatorProgress: { marginTop: 30, minHeight: 250, overflow: 'hidden', borderRadius: 28, padding: spacing.lg },
  creatorProgressHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  creatorProgressIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  creatorProgressTitle: { color: paper, fontSize: 21, fontWeight: '900' },
  creatorProgressSubtitle: { marginTop: 2, color: 'rgba(255,250,242,0.38)', fontSize: 10, fontWeight: '700' },
  creatorProgressBody: { marginTop: spacing.xl },
  creatorProgressAvatar: { width: 65, height: 65, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
  creatorProgressCopy: { position: 'absolute', left: 80, top: 5 },
  creatorLevel: { color: '#7EF2ED', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  creatorLevelName: { marginTop: 4, color: paper, fontSize: 20, fontWeight: '900' },
  creatorXp: { marginTop: 3, color: 'rgba(255,250,242,0.38)', fontSize: 9, fontWeight: '700' },
  creatorBar: { marginTop: spacing.lg, height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.10)' },
  creatorBarFill: { height: 6, borderRadius: 3, backgroundColor: '#7EF2ED' },
  creatorNext: { marginTop: 7, color: 'rgba(255,250,242,0.36)', fontSize: 8, fontWeight: '900' },
  creatorEmpty: { marginTop: spacing.xl, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.06)', padding: spacing.lg },
  creatorEmptyText: { marginTop: spacing.sm, maxWidth: 260, color: paper, fontSize: 11, lineHeight: 16, fontWeight: '900', textAlign: 'center' },
  creatorButton: { marginTop: spacing.md, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: paper, paddingHorizontal: spacing.lg },
  creatorButtonText: { color: ink, fontSize: 10, fontWeight: '900' },
});

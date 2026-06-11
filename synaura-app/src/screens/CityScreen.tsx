import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
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
import {
  claimCityEventReward,
  getMyTracks,
  getSynauraCity,
  participateCityEvent,
  voteSynauraCityBattle,
  type MyTrackSummary,
} from '@/api/client';
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
import { usePlayer } from '@/player/PlayerProvider';
import { spacing } from '@/theme/tokens';

const paper = '#FFFAF2';
const ink = '#171313';
const nightBg = '#08050E';
const card = 'rgba(255,255,255,0.05)';
const cardBorder = 'rgba(255,255,255,0.09)';
const muted = 'rgba(255,250,242,0.45)';
const faint = 'rgba(255,250,242,0.32)';

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
  const [actingEventId, setActingEventId] = useState<string | null>(null);
  const [pickerEvent, setPickerEvent] = useState<CityEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);

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
      setToast('Vote enregistre. Badge de jure debloque.');
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Vote impossible');
    } finally {
      setVoting(false);
    }
  }, [auth, battle, load, voting]);

  const openParticipate = useCallback((event: CityEvent) => {
    if (!auth.requireAuth()) return;
    setPickerEvent(event);
  }, [auth]);

  const participate = useCallback(async (event: CityEvent, trackId: string) => {
    if (actingEventId) return;
    setActingEventId(event.id);
    setError(null);
    try {
      await participateCityEvent(event.id, trackId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPickerEvent(null);
      setToast(`Ton son est inscrit dans "${event.title}".`);
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Participation impossible');
    } finally {
      setActingEventId(null);
    }
  }, [actingEventId, load]);

  const claim = useCallback(async (event: CityEvent) => {
    if (actingEventId) return;
    if (!auth.requireAuth()) return;
    setActingEventId(event.id);
    setError(null);
    try {
      await claimCityEventReward(event.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast('Recompense reclamee. Bien joue.');
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Recompense impossible');
    } finally {
      setActingEventId(null);
    }
  }, [actingEventId, auth, load]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0E0718', '#08050E', '#050A10']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <CityNightOverlay />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 28) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={paper} />}
      >
        <View style={styles.topRow}>
          <MotionPressable onPress={() => navigation.goBack()} style={styles.roundButton}><Ionicons name="chevron-back" size={20} color={paper} /></MotionPressable>
          <View style={styles.topCopy}><Text style={styles.topKicker}>EN DIRECT</Text><Text style={styles.topTitle}>Synaura City</Text></View>
          <MotionPressable onPress={() => void load(true)} style={styles.roundButton}><Ionicons name="refresh" size={18} color={paper} /></MotionPressable>
        </View>

        {loading && !city ? <LoadingCity /> : null}
        {error ? <View style={styles.error}><Ionicons name="alert-circle" size={16} color="#FF8A80" /><Text style={styles.errorText}>{error}</Text></View> : null}
        {city ? (
          <>
            <CityHero city={city} onUpload={() => navigation.navigate('Upload')} onCommunity={() => navigation.navigate('Community')} />
            <ImpactStrip city={city} />
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
                  : <EventCard key={event.id} event={event} index={index} busy={actingEventId === event.id} onParticipate={() => openParticipate(event)} onClaim={() => claim(event)} onPlay={play} />
              ))}
            </View>

            <Radar tracks={city.radar} player={player} onPlay={play} />
            <HallOfFame awards={city.hallOfFame} onPlay={play} />
            <Badges badges={city.listenerBadges} />
            <CreatorProgress artist={city.creatorCard} onCreate={() => navigation.navigate('Upload')} />
          </>
        ) : null}
      </ScrollView>

      <TrackPickerSheet
        event={pickerEvent}
        busy={Boolean(actingEventId)}
        onClose={() => setPickerEvent(null)}
        onPick={(trackId) => pickerEvent && void participate(pickerEvent, trackId)}
        onCreate={() => {
          setPickerEvent(null);
          navigation.navigate('Upload');
        }}
      />

      {toast ? (
        <View pointerEvents="none" style={[styles.toast, { bottom: insets.bottom + 108 }]}>
          <Ionicons name="checkmark-circle" size={15} color="#7EF2ED" />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CityNightOverlay() {
  const drift = useRef(new Animated.Value(0)).current;
  const meteor = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const driftLoop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 5600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 5600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    const meteorLoop = Animated.loop(Animated.sequence([
      Animated.timing(meteor, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.delay(2400),
    ]));
    driftLoop.start();
    meteorLoop.start();
    return () => {
      driftLoop.stop();
      meteorLoop.stop();
    };
  }, [drift, meteor]);

  const bob = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const meteorX = meteor.interpolate({ inputRange: [0, 1], outputRange: [200, -300] });
  const meteorY = meteor.interpolate({ inputRange: [0, 1], outputRange: [-30, 300] });
  const meteorOpacity = meteor.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 0.7, 0] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.orbViolet, { transform: [{ translateY: bob }] }]} />
      <Animated.View style={[styles.orbRose, { transform: [{ translateY: Animated.multiply(bob, -0.8) }] }]} />
      <Animated.View style={[styles.orbCyan, { transform: [{ translateY: Animated.multiply(bob, 0.6) }] }]} />
      <Animated.View style={[styles.meteor, { opacity: meteorOpacity, transform: [{ translateX: meteorX }, { translateY: meteorY }, { rotate: '-24deg' }] }]} />
    </View>
  );
}

function LoadingCity() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={paper} />
      <Text style={styles.loadingText}>Les neons s allument...</Text>
    </View>
  );
}

function CityHero({ city, onUpload, onCommunity }: { city: SynauraCityData; onUpload: () => void; onCommunity: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return (
    <View style={styles.hero}>
      <LinearGradient colors={['#1B0B26', '#12081C', '#04101A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.heroBlast, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.18] }) }] }]} />
      <Animated.View style={[styles.heroRing, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.12] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) }] }]} />
      <View style={styles.heroBadge}>
        <Animated.View style={[styles.heroLiveDot, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }]} />
        <Text style={styles.heroBadgeText}>EN DIRECT DE SYNAURA CITY</Text>
      </View>
      <Text style={styles.heroTitle}>{city.cityMood.title}</Text>
      <Text style={styles.heroSubtitle}>{city.cityMood.subtitle}</Text>
      <View style={styles.heroStats}>
        <HeroStat label="Reactions" value={compact(city.cityMood.reactionsToday)} color="#FF7B91" />
        <HeroStat label="Drops" value={compact(city.cityMood.newDrops)} color="#7EF2ED" />
        <HeroStat label="Pulse" value={compact(city.pulse.filter((track) => track.pulse >= 60).length)} color="#B9A8FF" />
      </View>
      <View style={styles.heroActions}>
        <MotionPressable onPress={onUpload} style={styles.heroPrimary}><Ionicons name="rocket" size={15} color={ink} /><Text style={styles.heroPrimaryText}>Lancer un drop</Text></MotionPressable>
        <MotionPressable onPress={onCommunity} style={styles.heroSecondary}><Ionicons name="people" size={15} color={paper} /><Text style={styles.heroSecondaryText}>Communaute</Text></MotionPressable>
      </View>
    </View>
  );
}

function ImpactStrip({ city }: { city: SynauraCityData }) {
  return (
    <View style={styles.impactStrip}>
      <View style={styles.impactPill}><Ionicons name="flame" size={14} color="#FFD667" /><Text style={styles.impactText}>{city.pulse.filter((track) => track.pulse >= 78).length} sons en feu</Text></View>
      <View style={styles.impactPill}><Ionicons name="flash" size={14} color="#7EF2ED" /><Text style={styles.impactText}>Battle live</Text></View>
      <View style={styles.impactPill}><Ionicons name="trophy" size={14} color="#FFD667" /><Text style={styles.impactText}>Awards ouverts</Text></View>
    </View>
  );
}

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.heroStat}>
      <View style={[styles.heroStatDot, { backgroundColor: color }]} />
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <View style={styles.sectionIcon}><Ionicons name={icon} size={17} color="#7EF2ED" /></View>
      <View style={styles.sectionCopy}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>
    </View>
  );
}

function ShowcaseCard({ item, index, playing, onPlay }: { item: CityShowcaseItem; index: number; playing: boolean; onPlay: (track: Track) => void }) {
  return (
    <Reveal delay={index * 55}>
      <MotionPressable onPress={() => onPlay(item.track)} style={styles.showcase}>
        <TrackCover track={item.track} active style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(8,5,14,0.05)', 'rgba(8,5,14,0.35)', 'rgba(8,5,14,0.97)']} style={StyleSheet.absoluteFill} />
        <View style={styles.showcaseTop}>
          <View style={styles.showcaseLabel}><Ionicons name={iconName(item.icon)} size={12} color={item.accent} /><Text style={styles.showcaseLabelText}>{item.label}</Text></View>
          <View style={styles.showcasePlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={ink} /></View>
        </View>
        <View style={styles.showcaseBottom}>
          <Text style={[styles.showcaseCaption, { color: item.accent }]}>{item.caption}</Text>
          <Text numberOfLines={2} style={styles.showcaseTitle}>{item.track.title}</Text>
          <Text numberOfLines={1} style={styles.showcaseArtist}>{artistName(item.track)}</Text>
        </View>
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
        <View style={styles.pulseBar}>
          <LinearGradient colors={['#00C2CB', '#7C5CFF', '#FF4B7A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.pulseBarFill, { width: `${track.pulse}%` }]} />
        </View>
      </View>
      <View style={styles.pulseValue}><Text style={styles.pulseNumber}>{track.pulse}%</Text><Ionicons name={playing ? 'pause' : 'pulse'} size={13} color="#B9A8FF" /></View>
    </MotionPressable>
  );
}

function ArtistCard({ artist, index, onOpen, onPlay }: { artist: CityArtist; index: number; onOpen: () => void; onPlay: (track: Track) => void }) {
  return (
    <Reveal delay={index * 55}>
      <View style={styles.artistCard}>
        <View style={styles.artistBanner}>
          <LinearGradient colors={['#FF4B7A', '#7C5CFF', '#00A7B2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {artist.featuredTrack ? <TrackCover track={artist.featuredTrack} active style={styles.artistBannerCover} /> : null}
          <Text style={styles.artistBooster}>NOUVEAU TALENT DECOUVERT</Text>
        </View>
        <Image source={artist.avatar ? { uri: artist.avatar } : require('../assets/synaura-symbol-2026.png')} style={styles.artistAvatar} />
        <View style={styles.artistBody}>
          <Text numberOfLines={1} style={styles.artistName}>{artist.name}</Text>
          <Text numberOfLines={1} style={styles.artistHandle}>@{artist.username} · {artist.genre[0] || artist.levelName}</Text>
          <Text style={styles.artistStats}>{compact(artist.totalPlays)} ecoutes · {compact(artist.totalLikes)} likes</Text>
          <View style={styles.artistActions}>
            <MotionPressable onPress={onOpen} style={styles.artistOpen}><Text style={styles.artistOpenText}>Decouvrir</Text></MotionPressable>
            {artist.featuredTrack ? <MotionPressable onPress={() => onPlay(artist.featuredTrack!)} style={styles.artistPlay}><Ionicons name="play" size={14} color={paper} /></MotionPressable> : null}
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
        <LinearGradient colors={['rgba(8,5,14,0.05)', 'rgba(8,5,14,0.92)']} style={StyleSheet.absoluteFill} />
        <Text style={styles.premiereBadge}>NOUVEAU DROP</Text>
        <View style={styles.premierePlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={ink} /></View>
        <View style={styles.premiereBottom}><Text style={styles.premierePulse}>DISPONIBLE · PULSE {track.pulse}%</Text><Text numberOfLines={1} style={styles.premiereTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.premiereArtist}>Nouveau drop de {artistName(track)}</Text></View>
      </MotionPressable>
    </Reveal>
  );
}

function EventCard({
  event,
  index,
  busy,
  onParticipate,
  onClaim,
  onPlay,
}: {
  event: CityEvent;
  index: number;
  busy: boolean;
  onParticipate: () => void;
  onClaim: () => void;
  onPlay: (track: Track) => void;
}) {
  const first = event.tracks?.[0];
  const winner = event.winners?.[0];
  const participated = Boolean(event.userParticipation);
  const claimable = event.claimStatus === 'available';
  const cta = busy
    ? 'Chargement...'
    : claimable
      ? 'Reclamer ma recompense'
      : participated
        ? 'Participation envoyee'
        : 'Participer avec un son';
  return (
    <Reveal delay={index * 45}>
      <View style={styles.eventCard}>
        {first ? <TrackCover track={first} active style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={['rgba(8,5,14,0.97)', 'rgba(8,5,14,0.78)', 'rgba(8,5,14,0.40)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.eventGlow, { backgroundColor: event.accent }]} />
        <View style={styles.eventIcon}><Ionicons name={iconName(event.icon)} size={20} color={event.accent} /></View>
        <View style={styles.eventTagWrap}>
          <Text style={[styles.eventTag, event.isLive && styles.eventTagLive]}>{event.isLive ? '· LIVE' : event.status || 'live'}</Text>
          {event.challengeTag ? <Text style={styles.eventTag}>{event.challengeTag}</Text> : null}
        </View>
        <View style={styles.eventBody}>
          <Text style={[styles.eventKicker, { color: event.accent }]}>{event.subtitle}</Text>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDescription}>{event.description}</Text>
          <View style={styles.eventMetaRow}>
            <Text style={styles.eventMeta}>{event.participationCount || 0} participations</Text>
            {event.reward ? <Text style={styles.eventMeta}>{event.reward.title}</Text> : null}
            {winner ? <Text style={styles.eventWinner}>Winner: {winner.track?.title || winner.trackId}</Text> : null}
          </View>
          <View style={styles.eventActions}>
            <MotionPressable
              disabled={busy || (participated && !claimable)}
              onPress={claimable ? onClaim : onParticipate}
              style={[styles.eventPrimary, claimable && styles.eventPrimaryClaim, participated && !claimable && styles.eventPrimaryDone]}
            >
              {participated && !claimable ? <Ionicons name="checkmark" size={14} color={paper} /> : null}
              <Text style={[styles.eventPrimaryText, participated && !claimable && styles.eventPrimaryTextDone]}>{cta}</Text>
              {!participated || claimable ? <Ionicons name="arrow-forward" size={14} color={ink} /> : null}
            </MotionPressable>
            {first ? <MotionPressable onPress={() => onPlay(first)} style={styles.eventPlay}><Ionicons name="play" size={14} color={paper} /></MotionPressable> : null}
          </View>
        </View>
      </View>
    </Reveal>
  );
}

function BattleCard({ event, voting, player, onPlay, onVote }: { event: CityEvent; voting: boolean; player: ReturnType<typeof usePlayer>; onPlay: (track: Track) => void; onVote: (trackId: string) => void }) {
  const tracks = event.tracks || [];
  const total = tracks.reduce((sum, track) => sum + Number(event.voteCounts?.[track._id] || 0), 0) || 1;
  return (
    <View style={styles.battle}>
      <View style={styles.battleHeader}><View><Text style={styles.battleKicker}>{event.subtitle}</Text><Text style={styles.battleTitle}>{event.title}</Text><Text style={styles.battleMeta}>{event.totalVotes || 0} votes · {event.isLive ? 'en direct' : event.status || 'live'}</Text></View><View style={styles.battleFlash}><Ionicons name="flash" size={20} color="#7EF2ED" /></View></View>
      {event.winnerTrackId ? <Text style={styles.battleWinner}>Gagnant: {tracks.find((track) => track._id === event.winnerTrackId)?.title || event.winnerTrackId}</Text> : null}
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
              <View style={styles.battleBar}><View style={[styles.battleBarFill, { width: `${percent}%` }]} /></View>
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
    <View style={styles.panel}>
      <View style={styles.panelHeader}><View style={[styles.panelIcon, { backgroundColor: 'rgba(255,214,103,0.14)' }]}><Ionicons name="trophy" size={20} color="#FFD667" /></View><View><Text style={styles.panelTitle}>Hall of Fame</Text><Text style={styles.panelSubtitle}>Les Synaura Awards de la semaine.</Text></View></View>
      <View style={styles.awards}>
        {awards.map((award, index) => {
          const title = award.track?.title || award.artist?.name || 'Synaura';
          const subtitle = award.track ? artistName(award.track) : award.artist ? `@${award.artist.username}` : award.subtitle;
          return (
            <MotionPressable key={award.id} onPress={() => award.track && onPlay(award.track)} style={styles.awardRow}><View style={[styles.awardIcon, index === 0 && styles.awardIconFirst]}><Ionicons name={iconName(award.icon)} size={16} color={index === 0 ? ink : '#B9A8FF'} /></View><View style={styles.awardCopy}><Text numberOfLines={1} style={styles.awardTitle}>{award.title}</Text><Text numberOfLines={1} style={styles.awardSubtitle}>{title} · {subtitle}</Text></View></MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

function Badges({ badges }: { badges: CityBadge[] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}><View style={[styles.panelIcon, { backgroundColor: 'rgba(255,75,122,0.14)' }]}><Ionicons name="ribbon" size={20} color="#FF7B91" /></View><View><Text style={styles.panelTitle}>Badges auditeur</Text><Text style={styles.panelSubtitle}>Ta facon de soutenir la scene compte.</Text></View></View>
      <View style={styles.awards}>
        {badges.map((badge) => (
          <View key={badge.id} style={[styles.badgeRow, badge.unlocked && styles.badgeRowUnlocked]}><View style={[styles.badgeIcon, badge.unlocked && styles.badgeIconUnlocked]}><Ionicons name={iconName(badge.icon)} size={16} color={badge.unlocked ? paper : faint} /></View><View style={styles.badgeCopy}><Text style={styles.badgeTitle}>{badge.title}</Text><Text style={styles.badgeDescription}>{badge.description}</Text><View style={styles.badgeBar}><View style={[styles.badgeBarFill, { width: `${Math.min(100, badge.progress / badge.target * 100)}%` }]} /></View></View><Text style={styles.badgeProgress}>{badge.progress}/{badge.target}</Text></View>
        ))}
      </View>
    </View>
  );
}

function CreatorProgress({ artist, onCreate }: { artist: CityArtist | null; onCreate: () => void }) {
  const progress = artist ? Math.min(100, artist.xp / artist.nextLevelXp * 100) : 0;
  return (
    <View style={styles.creatorProgress}>
      <LinearGradient colors={['#1B0B26', '#12081C', '#0A1B22']} style={StyleSheet.absoluteFill} />
      <View style={styles.creatorProgressHeader}><View style={styles.creatorProgressIcon}><Ionicons name="analytics" size={20} color="#7EF2ED" /></View><View><Text style={styles.creatorProgressTitle}>Carte artiste evolutive</Text><Text style={styles.creatorProgressSubtitle}>Ton activite construit ton statut.</Text></View></View>
      {artist ? <View style={styles.creatorProgressBody}><Image source={artist.avatar ? { uri: artist.avatar } : require('../assets/synaura-symbol-2026.png')} style={styles.creatorProgressAvatar} /><View style={styles.creatorProgressCopy}><Text style={styles.creatorLevel}>NIVEAU {artist.level}</Text><Text style={styles.creatorLevelName}>{artist.levelName}</Text><Text style={styles.creatorXp}>{artist.xp} XP · {artist.trackCount} sons</Text></View><View style={styles.creatorBar}><LinearGradient colors={['#00C2CB', '#7C5CFF', '#FF4B7A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.creatorBarFill, { width: `${progress}%` }]} /></View><Text style={styles.creatorNext}>{Math.max(0, artist.nextLevelXp - artist.xp)} XP avant le prochain niveau</Text></View> : <View style={styles.creatorEmpty}><Ionicons name="musical-notes" size={28} color="#7EF2ED" /><Text style={styles.creatorEmptyText}>Publie ton premier son pour creer ta carte artiste.</Text><MotionPressable onPress={onCreate} style={styles.creatorButton}><Text style={styles.creatorButtonText}>Commencer</Text></MotionPressable></View>}
    </View>
  );
}

function TrackPickerSheet({
  event,
  busy,
  onClose,
  onPick,
  onCreate,
}: {
  event: CityEvent | null;
  busy: boolean;
  onClose: () => void;
  onPick: (trackId: string) => void;
  onCreate: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [tracks, setTracks] = useState<MyTrackSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!event) {
      setTracks(null);
      setSelected(null);
      setLoadError(null);
      return;
    }
    let active = true;
    getMyTracks()
      .then((next) => {
        if (active) setTracks(next);
      })
      .catch((nextError) => {
        if (active) setLoadError(nextError instanceof Error ? nextError.message : 'Impossible de charger tes sons.');
      });
    return () => {
      active = false;
    };
  }, [event]);

  return (
    <Modal visible={Boolean(event)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetKicker}>{event?.subtitle || 'Synaura City'}</Text>
          <Text style={styles.sheetTitle}>Choisis ton son pour "{event?.title}"</Text>
          {loadError ? (
            <Text style={styles.sheetError}>{loadError}</Text>
          ) : tracks === null ? (
            <View style={styles.sheetLoading}><ActivityIndicator color={paper} /></View>
          ) : tracks.length === 0 ? (
            <View style={styles.sheetEmpty}>
              <Ionicons name="musical-notes" size={26} color={muted} />
              <Text style={styles.sheetEmptyText}>Tu n as pas encore publie de son.</Text>
              <MotionPressable onPress={onCreate} style={styles.sheetCreate}><Text style={styles.sheetCreateText}>Publier un son</Text></MotionPressable>
            </View>
          ) : (
            <FlatList
              data={tracks}
              keyExtractor={(item) => item.id}
              style={styles.sheetList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selected === item.id;
                return (
                  <Pressable onPress={() => setSelected(item.id)} style={[styles.sheetTrack, isSelected && styles.sheetTrackSelected]}>
                    <Image source={item.coverVideoPosterUrl || item.coverUrl ? { uri: item.coverVideoPosterUrl || item.coverUrl || '' } : require('../assets/synaura-symbol-2026.png')} style={styles.sheetCover} />
                    <View style={styles.sheetTrackCopy}>
                      <Text numberOfLines={1} style={styles.sheetTrackTitle}>{item.title}</Text>
                      <Text numberOfLines={1} style={styles.sheetTrackDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : 'Mon son'}</Text>
                    </View>
                    <View style={[styles.sheetCheck, isSelected && styles.sheetCheckSelected]}>{isSelected ? <Ionicons name="checkmark" size={14} color={ink} /> : null}</View>
                  </Pressable>
                );
              }}
            />
          )}
          <MotionPressable
            disabled={!selected || busy}
            onPress={() => selected && onPick(selected)}
            style={[styles.sheetSubmit, (!selected || busy) && styles.sheetSubmitDisabled]}
          >
            <Ionicons name={busy ? 'hourglass' : 'rocket'} size={15} color={ink} />
            <Text style={styles.sheetSubmitText}>{busy ? 'Inscription en cours...' : 'Inscrire ce son dans l event'}</Text>
          </MotionPressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nightBg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 190 },
  orbViolet: { position: 'absolute', left: -110, top: 60, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(124,92,255,0.16)' },
  orbRose: { position: 'absolute', right: -90, top: 320, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,75,122,0.12)' },
  orbCyan: { position: 'absolute', left: -60, top: 640, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(0,194,203,0.10)' },
  meteor: { position: 'absolute', right: -40, top: 60, width: 150, height: 2, borderRadius: 1, backgroundColor: '#7EF2ED', shadowColor: '#7EF2ED', shadowOpacity: 0.5, shadowRadius: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, borderRadius: 24, borderWidth: 1, borderColor: cardBorder, backgroundColor: 'rgba(255,255,255,0.04)', padding: 6 },
  roundButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: cardBorder },
  topCopy: { flex: 1 },
  topKicker: { color: '#FF7B91', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  topTitle: { marginTop: 2, color: paper, fontSize: 25, fontWeight: '900' },
  loading: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: muted, fontSize: 12, fontWeight: '900' },
  error: { marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,138,128,0.3)', backgroundColor: 'rgba(255,82,82,0.10)', padding: spacing.md },
  errorText: { flex: 1, color: '#FF8A80', fontSize: 11, fontWeight: '800' },
  toast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(126,242,237,0.3)', backgroundColor: 'rgba(10,22,23,0.96)', paddingHorizontal: 16, paddingVertical: 11, shadowColor: '#7EF2ED', shadowOpacity: 0.25, shadowRadius: 18, elevation: 10 },
  toastText: { color: '#7EF2ED', fontSize: 11, fontWeight: '900' },
  hero: { minHeight: 430, overflow: 'hidden', borderRadius: 32, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#7C5CFF', shadowOpacity: 0.35, shadowRadius: 34, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
  heroBlast: { position: 'absolute', right: -92, bottom: -80, width: 285, height: 285, borderRadius: 143, backgroundColor: 'rgba(255,75,122,0.30)' },
  heroRing: { position: 'absolute', right: -70, top: -70, width: 280, height: 280, borderRadius: 140, borderWidth: 1, borderColor: 'rgba(126,242,237,0.5)' },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 11, paddingVertical: 7 },
  heroLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF4B7A' },
  heroBadgeText: { color: 'rgba(255,250,242,0.78)', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { marginTop: spacing.xl, maxWidth: 320, color: paper, fontSize: 46, lineHeight: 44, fontWeight: '900', letterSpacing: -1.8, textShadowColor: 'rgba(255,75,122,0.35)', textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
  heroSubtitle: { marginTop: spacing.md, maxWidth: 310, color: 'rgba(255,250,242,0.55)', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  heroStats: { marginTop: spacing.xl, flexDirection: 'row', gap: spacing.sm },
  heroStat: { flex: 1, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', padding: spacing.sm },
  heroStatDot: { width: 7, height: 7, borderRadius: 4 },
  heroStatValue: { marginTop: 9, color: paper, fontSize: 19, fontWeight: '900' },
  heroStatLabel: { marginTop: 3, color: faint, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  heroActions: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  heroPrimary: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 22, backgroundColor: paper, paddingHorizontal: spacing.md, shadowColor: paper, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  heroPrimaryText: { color: ink, fontSize: 11, fontWeight: '900' },
  heroSecondary: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.md },
  heroSecondaryText: { color: paper, fontSize: 11, fontWeight: '900' },
  impactStrip: { marginTop: spacing.md, flexDirection: 'row', gap: 7 },
  impactPill: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 18, borderWidth: 1, borderColor: cardBorder, backgroundColor: card },
  impactText: { color: 'rgba(255,250,242,0.78)', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitleWrap: { marginTop: 30, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: card, borderWidth: 1, borderColor: cardBorder },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: paper, fontSize: 22, fontWeight: '900' },
  sectionSubtitle: { marginTop: 2, color: muted, fontSize: 11, fontWeight: '700' },
  horizontalRail: { gap: spacing.sm, paddingRight: spacing.md },
  stack: { gap: spacing.sm },
  showcase: { width: 232, height: 310, overflow: 'hidden', justifyContent: 'space-between', borderRadius: 28, backgroundColor: '#100A18', padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#7C5CFF', shadowOpacity: 0.25, shadowRadius: 22, elevation: 9 },
  showcaseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  showcaseLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 8, paddingVertical: 6 },
  showcaseLabelText: { color: paper, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  showcasePlay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: paper },
  showcaseBottom: { marginTop: 'auto' },
  showcaseCaption: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  showcaseTitle: { marginTop: 5, color: paper, fontSize: 21, lineHeight: 23, fontWeight: '900' },
  showcaseArtist: { marginTop: 4, color: 'rgba(255,250,242,0.48)', fontSize: 10, fontWeight: '700' },
  pulseCard: { minHeight: 84, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 24, borderWidth: 1, borderColor: cardBorder, backgroundColor: card, padding: spacing.sm },
  pulseRank: { width: 20, color: faint, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  pulseCover: { width: 58, height: 58, borderRadius: 17 },
  pulseCopy: { flex: 1, minWidth: 0 },
  pulseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pulseTitle: { flex: 1, color: paper, fontSize: 12, fontWeight: '900' },
  pulseState: { overflow: 'hidden', borderRadius: 9, backgroundColor: 'rgba(124,92,255,0.18)', paddingHorizontal: 6, paddingVertical: 3, color: '#B9A8FF', fontSize: 7, fontWeight: '900' },
  pulseArtist: { marginTop: 4, color: muted, fontSize: 9, fontWeight: '700' },
  pulseBar: { marginTop: 7, height: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  pulseBarFill: { height: 4, borderRadius: 2 },
  pulseValue: { width: 38, alignItems: 'center', gap: 3 },
  pulseNumber: { color: paper, fontSize: 12, fontWeight: '900' },
  artistCard: { width: 270, overflow: 'hidden', borderRadius: 25, borderWidth: 1, borderColor: cardBorder, backgroundColor: card },
  artistBanner: { height: 100, overflow: 'hidden' },
  artistBannerCover: { ...StyleSheet.absoluteFillObject, opacity: 0.45 },
  artistBooster: { position: 'absolute', left: 12, top: 12, color: paper, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  artistAvatar: { position: 'absolute', left: 14, top: 66, width: 65, height: 65, borderRadius: 20, borderWidth: 4, borderColor: '#140E1E', backgroundColor: '#140E1E' },
  artistBody: { padding: spacing.md, paddingTop: 39 },
  artistName: { color: paper, fontSize: 19, fontWeight: '900' },
  artistHandle: { marginTop: 3, color: muted, fontSize: 10, fontWeight: '700' },
  artistStats: { marginTop: spacing.sm, color: 'rgba(255,250,242,0.55)', fontSize: 9, fontWeight: '900' },
  artistActions: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  artistOpen: { height: 38, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: paper },
  artistOpenText: { color: ink, fontSize: 10, fontWeight: '900' },
  artistPlay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: cardBorder },
  premiere: { width: 230, height: 250, overflow: 'hidden', borderRadius: 24, backgroundColor: '#100A18', padding: spacing.md, borderWidth: 1, borderColor: cardBorder },
  premiereCover: { ...StyleSheet.absoluteFillObject },
  premiereBadge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 12, backgroundColor: '#FF4B7A', paddingHorizontal: 8, paddingVertical: 6, color: paper, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  premierePlay: { position: 'absolute', right: 12, top: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: paper },
  premiereBottom: { marginTop: 'auto' },
  premierePulse: { color: '#7EF2ED', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  premiereTitle: { marginTop: 5, color: paper, fontSize: 17, fontWeight: '900' },
  premiereArtist: { marginTop: 3, color: 'rgba(255,250,242,0.42)', fontSize: 9, fontWeight: '700' },
  eventCard: { minHeight: 286, overflow: 'hidden', borderRadius: 30, backgroundColor: '#100A18', padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#FF4B7A', shadowOpacity: 0.18, shadowRadius: 22, elevation: 8 },
  eventGlow: { position: 'absolute', right: -52, bottom: -44, width: 170, height: 170, borderRadius: 85, opacity: 0.25 },
  eventIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: cardBorder },
  eventTagWrap: { position: 'absolute', right: spacing.lg, top: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  eventTag: { overflow: 'hidden', borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 9, paddingVertical: 6, color: 'rgba(255,250,242,0.72)', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  eventTagLive: { backgroundColor: 'rgba(255,75,122,0.18)', color: '#FF7B91' },
  eventBody: { marginTop: 'auto' },
  eventKicker: { fontSize: 8, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase' },
  eventTitle: { marginTop: 4, color: paper, fontSize: 25, fontWeight: '900' },
  eventDescription: { marginTop: 7, maxWidth: 300, color: 'rgba(255,250,242,0.50)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  eventMetaRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  eventMeta: { overflow: 'hidden', borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 8, paddingVertical: 5, color: 'rgba(255,250,242,0.58)', fontSize: 8, fontWeight: '900' },
  eventWinner: { overflow: 'hidden', borderRadius: 11, backgroundColor: '#FFD667', paddingHorizontal: 8, paddingVertical: 5, color: ink, fontSize: 8, fontWeight: '900' },
  eventActions: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  eventPrimary: { height: 41, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 21, backgroundColor: paper, paddingHorizontal: spacing.md },
  eventPrimaryClaim: { backgroundColor: '#FFD667' },
  eventPrimaryDone: { backgroundColor: 'rgba(255,255,255,0.10)' },
  eventPrimaryText: { color: ink, fontSize: 10, fontWeight: '900' },
  eventPrimaryTextDone: { color: 'rgba(255,250,242,0.8)' },
  eventPlay: { width: 41, height: 41, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: cardBorder },
  battle: { overflow: 'hidden', borderRadius: 30, backgroundColor: '#100A18', padding: spacing.md, borderWidth: 1, borderColor: 'rgba(126,242,237,0.18)', shadowColor: '#7EF2ED', shadowOpacity: 0.20, shadowRadius: 24, elevation: 10 },
  battleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  battleKicker: { color: '#7EF2ED', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  battleTitle: { marginTop: 3, color: paper, fontSize: 22, fontWeight: '900' },
  battleMeta: { marginTop: 3, color: faint, fontSize: 8, fontWeight: '900' },
  battleFlash: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(126,242,237,0.10)', borderWidth: 1, borderColor: 'rgba(126,242,237,0.22)' },
  battleWinner: { marginTop: spacing.sm, overflow: 'hidden', borderRadius: 14, backgroundColor: '#FFD667', paddingHorizontal: 10, paddingVertical: 8, color: ink, fontSize: 10, fontWeight: '900' },
  battleGrid: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  battleTrack: { flex: 1, minWidth: 0, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 7 },
  battleTrackSelected: { borderColor: '#7EF2ED', backgroundColor: 'rgba(126,242,237,0.07)' },
  battleCoverWrap: { aspectRatio: 1, overflow: 'hidden', borderRadius: 15 },
  battlePlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,5,14,0.18)' },
  battleTrackTitle: { marginTop: 7, color: paper, fontSize: 10, fontWeight: '900' },
  battleArtist: { marginTop: 2, color: faint, fontSize: 8, fontWeight: '700' },
  battleBar: { marginTop: 7, height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  battleBarFill: { height: 3, borderRadius: 2, backgroundColor: '#7EF2ED' },
  voteButton: { marginTop: 8, height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  voteButtonSelected: { backgroundColor: '#7EF2ED' },
  voteText: { color: paper, fontSize: 8, fontWeight: '900' },
  voteTextSelected: { color: ink },
  radar: { marginTop: 30, overflow: 'hidden', borderRadius: 30, backgroundColor: '#0A2426', padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(126,242,237,0.18)' },
  radarRing: { position: 'absolute', right: -35, top: -45, width: 210, height: 210, borderRadius: 105, borderWidth: 1, borderColor: '#7EF2ED' },
  radarHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  radarIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7EF2ED' },
  radarTitle: { color: paper, fontSize: 21, fontWeight: '900' },
  radarSubtitle: { marginTop: 2, color: 'rgba(255,250,242,0.40)', fontSize: 10, fontWeight: '700' },
  radarList: { marginTop: spacing.lg, gap: spacing.sm },
  radarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8 },
  radarCover: { width: 45, height: 45, borderRadius: 13 },
  radarCopy: { flex: 1, minWidth: 0 },
  radarTrack: { color: paper, fontSize: 10, fontWeight: '900' },
  radarArtist: { marginTop: 3, color: 'rgba(255,250,242,0.38)', fontSize: 8, fontWeight: '700' },
  panel: { marginTop: 30, borderRadius: 30, borderWidth: 1, borderColor: cardBorder, backgroundColor: card, padding: spacing.lg },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  panelIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  panelTitle: { color: paper, fontSize: 21, fontWeight: '900' },
  panelSubtitle: { marginTop: 2, color: muted, fontSize: 10, fontWeight: '700' },
  awards: { marginTop: spacing.lg, gap: spacing.sm },
  awardRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.04)', padding: spacing.sm },
  awardIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  awardIconFirst: { backgroundColor: '#FFD667' },
  awardCopy: { flex: 1, minWidth: 0 },
  awardTitle: { color: paper, fontSize: 10, fontWeight: '900' },
  awardSubtitle: { marginTop: 3, color: muted, fontSize: 8, fontWeight: '700' },
  badgeRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.03)', padding: spacing.sm },
  badgeRowUnlocked: { backgroundColor: 'rgba(124,92,255,0.10)', borderColor: 'rgba(124,92,255,0.28)' },
  badgeIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  badgeIconUnlocked: { backgroundColor: '#7C5CFF' },
  badgeCopy: { flex: 1, minWidth: 0 },
  badgeTitle: { color: paper, fontSize: 10, fontWeight: '900' },
  badgeDescription: { marginTop: 2, color: muted, fontSize: 8, fontWeight: '700' },
  badgeBar: { marginTop: 6, height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)' },
  badgeBarFill: { height: 3, borderRadius: 2, backgroundColor: '#7C5CFF' },
  badgeProgress: { color: muted, fontSize: 8, fontWeight: '900' },
  creatorProgress: { marginTop: 30, minHeight: 250, overflow: 'hidden', borderRadius: 30, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  creatorProgressHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  creatorProgressIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  creatorProgressTitle: { color: paper, fontSize: 21, fontWeight: '900' },
  creatorProgressSubtitle: { marginTop: 2, color: 'rgba(255,250,242,0.38)', fontSize: 10, fontWeight: '700' },
  creatorProgressBody: { marginTop: spacing.xl },
  creatorProgressAvatar: { width: 65, height: 65, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
  creatorProgressCopy: { position: 'absolute', left: 80, top: 5 },
  creatorLevel: { color: '#7EF2ED', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  creatorLevelName: { marginTop: 4, color: paper, fontSize: 20, fontWeight: '900' },
  creatorXp: { marginTop: 3, color: 'rgba(255,250,242,0.38)', fontSize: 9, fontWeight: '700' },
  creatorBar: { marginTop: spacing.lg, height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.10)' },
  creatorBarFill: { height: 6, borderRadius: 3 },
  creatorNext: { marginTop: 7, color: 'rgba(255,250,242,0.36)', fontSize: 8, fontWeight: '900' },
  creatorEmpty: { marginTop: spacing.xl, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.lg },
  creatorEmptyText: { marginTop: spacing.sm, maxWidth: 260, color: paper, fontSize: 11, lineHeight: 16, fontWeight: '900', textAlign: 'center' },
  creatorButton: { marginTop: spacing.md, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: paper, paddingHorizontal: spacing.lg },
  creatorButtonText: { color: ink, fontSize: 10, fontWeight: '900' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.66)' },
  sheet: { maxHeight: '78%', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: '#120B1C', paddingHorizontal: spacing.lg, paddingTop: 10 },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  sheetKicker: { marginTop: spacing.md, color: '#7EF2ED', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  sheetTitle: { marginTop: 5, color: paper, fontSize: 19, fontWeight: '900' },
  sheetError: { marginVertical: spacing.lg, color: '#FF8A80', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  sheetLoading: { paddingVertical: 40, alignItems: 'center' },
  sheetEmpty: { paddingVertical: 26, alignItems: 'center' },
  sheetEmptyText: { marginTop: 10, color: paper, fontSize: 12, fontWeight: '900' },
  sheetCreate: { marginTop: spacing.md, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: paper, paddingHorizontal: spacing.lg },
  sheetCreateText: { color: ink, fontSize: 11, fontWeight: '900' },
  sheetList: { marginTop: spacing.md, maxHeight: 320 },
  sheetTrack: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 9, marginBottom: 7 },
  sheetTrackSelected: { borderColor: 'rgba(126,242,237,0.5)', backgroundColor: 'rgba(126,242,237,0.08)' },
  sheetCover: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.06)' },
  sheetTrackCopy: { flex: 1, minWidth: 0 },
  sheetTrackTitle: { color: paper, fontSize: 12, fontWeight: '900' },
  sheetTrackDate: { marginTop: 3, color: muted, fontSize: 9, fontWeight: '700' },
  sheetCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  sheetCheckSelected: { backgroundColor: '#7EF2ED' },
  sheetSubmit: { marginTop: spacing.sm, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 24, backgroundColor: paper },
  sheetSubmitDisabled: { opacity: 0.4 },
  sheetSubmitText: { color: ink, fontSize: 12, fontWeight: '900' },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { BattleDuel, EventCard as EventSummaryCard, EventTicker, PulseBadge, PulseBar, SectionHeader, VoteCountdownBanner } from '@/components/events/SynauraEvents';
import { SynauraBackground } from '@/components/SynauraBackground';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, spacing } from '@/theme/tokens';

function compact(value: number | undefined) {
  const next = Number(value || 0);
  if (next >= 1_000_000) return `${(next / 1_000_000).toFixed(1)}M`;
  if (next >= 1_000) return `${(next / 1_000).toFixed(1)}K`;
  return String(next);
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
  const scrollRef = useRef<ScrollView>(null);
  const auth = useAuth();
  const player = usePlayer();
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState(false);
  const [actingEventId, setActingEventId] = useState<string | null>(null);
  const [pickerEvent, setPickerEvent] = useState<CityEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CityEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [celebrationEvent, setCelebrationEvent] = useState<CityEvent | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setCity(await getSynauraCity());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Impossible de charger les Events Synaura.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detailEvent || !city) return;
    const refreshed = city.events.find((event) => event.id === detailEvent.id);
    if (refreshed && refreshed !== detailEvent) setDetailEvent(refreshed);
  }, [city, detailEvent]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!city) return;
    const winner = city.events.find((event) => event.userIsWinner && event.celebration);
    if (!winner) return;
    void AsyncStorage.getItem(`synaura.city.win.seen.${winner.id}`).then((seen) => {
      if (seen !== '1') setCelebrationEvent(winner);
    });
  }, [city]);

  const closeCelebration = useCallback(() => {
    if (celebrationEvent) void AsyncStorage.setItem(`synaura.city.win.seen.${celebrationEvent.id}`, '1');
    setCelebrationEvent(null);
  }, [celebrationEvent]);

  const play = useCallback(async (track: Track) => {
    if (player.current?._id === track._id) await player.togglePlayPause();
    else await player.playTrack(track);
  }, [player]);

  const vote = useCallback(async (eventId: string, trackId: string) => {
    if (voting) return;
    if (!auth.requireAuth()) {
      setToast('Connecte-toi pour voter.');
      navigation.navigate('Login');
      return;
    }
    setVoting(true);
    setError(null);
    try {
      await voteSynauraCityBattle(eventId, trackId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast('Vote enregistré. Ton avis compte dans le Pulse.');
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Vote impossible.');
    } finally {
      setVoting(false);
    }
  }, [auth, load, navigation, voting]);

  const openParticipate = useCallback((event: CityEvent) => {
    if (auth.requireAuth()) {
      setPickerEvent(event);
      return;
    }
    setToast('Connecte-toi pour inscrire un son.');
    navigation.navigate('Login');
  }, [auth, navigation]);

  const participate = useCallback(async (event: CityEvent, trackId: string) => {
    if (actingEventId) return;
    setActingEventId(event.id);
    setError(null);
    try {
      await participateCityEvent(event.id, trackId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPickerEvent(null);
      setToast(`Ton son rejoint « ${event.title} ».`);
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Participation impossible.');
    } finally {
      setActingEventId(null);
    }
  }, [actingEventId, load]);

  const claim = useCallback(async (event: CityEvent) => {
    if (actingEventId || !auth.requireAuth()) return;
    setActingEventId(event.id);
    setError(null);
    try {
      await claimCityEventReward(event.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast('Récompense récupérée. Bien joué.');
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Récompense impossible.');
    } finally {
      setActingEventId(null);
    }
  }, [actingEventId, auth, load]);

  return (
    <View style={styles.root}>
      <SynauraBackground variant="warm" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.text} />}
      >
        <View style={styles.topbar}>
          <MotionPressable onPress={() => navigation.goBack()} style={styles.roundButton}><Ionicons name="chevron-back" size={20} color={colors.text} /></MotionPressable>
          <View style={styles.topCopy}><Text style={styles.topKicker}>SYNAURA LIVE</Text><Text style={styles.topTitle}>Events</Text></View>
          <View style={styles.topActions}>
            <MotionPressable onPress={() => void load(true)} style={styles.roundButton}><Ionicons name="refresh" size={18} color={colors.text} /></MotionPressable>
            <MobileAccountButton compact />
          </View>
        </View>

        {city ? <EventTicker city={city} /> : null}
        {city ? <VoteCountdownBanner current={city.currentVoteSession} next={city.nextVoteSession} onOpen={() => setDetailEvent(city.currentVoteSession || city.nextVoteSession || null)} onNotify={() => setToast('Rappel activé pour le prochain vote.')} /> : null}
        {loading && !city ? <LoadingEvents /> : null}
        {error ? <View style={styles.error}><Ionicons name="alert-circle" size={16} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}

        {city ? (
          <>
            <EventsHero city={city} onUpload={() => navigation.navigate('Upload')} onCommunity={() => navigation.navigate('Community')} />

            <SectionHeader eyebrow="EN LIVE MAINTENANT" title="Les rendez-vous actifs" subtitle="Vote, participe et gagne de la visibilité." />
            <View style={styles.stack}>
              {city.events.map((event, index) => (
                event.kind === 'battle'
                  ? <BattleCard key={event.id} event={event} voting={voting} player={player} onPlay={play} onVote={(trackId) => vote(event.id, trackId)} onDetails={() => setDetailEvent(event)} />
                  : <LiveEventCard key={event.id} event={event} index={index} busy={actingEventId === event.id} onDetails={() => setDetailEvent(event)} onParticipate={() => openParticipate(event)} onClaim={() => claim(event)} onPlay={play} />
              ))}
            </View>

            <SectionHeader eyebrow="LA VITRINE DU JOUR" title="Aujourd’hui sur Synaura" subtitle="Des découvertes différentes à chaque visite." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
              {city.showcase.map((item, index) => <ShowcaseCard key={item.id} item={item} index={index} playing={player.current?._id === item.track._id && player.isPlaying} onPlay={play} />)}
            </ScrollView>

            <SectionHeader eyebrow="SYNAURA PULSE" title="Sons en feu" subtitle="Les titres qui font le plus réagir maintenant." />
            <View style={styles.stack}>
              {city.pulse.slice(0, 7).map((track, index) => <PulseTrackCard key={track._id} track={track} rank={index + 1} playing={player.current?._id === track._id && player.isPlaying} onPlay={play} />)}
            </View>

            <SectionHeader eyebrow="NOUVEAUX TALENTS" title="Le radar vient de les trouver" subtitle="Découvre-les avant tout le monde." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
              {city.spotlightArtists.map((artist, index) => <ArtistCard key={artist.id} artist={artist} index={index} onOpen={() => navigation.navigate('PublicProfile', { username: artist.username })} onPlay={play} />)}
            </ScrollView>

            {city.premieres.length ? (
              <>
                <SectionHeader eyebrow="PREMIÈRES 24H" title="Nouveaux drops" subtitle="Sois parmi les premiers à écouter." />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
                  {city.premieres.slice(0, 5).map((track, index) => <PremiereCard key={track._id} track={track} index={index} playing={player.current?._id === track._id && player.isPlaying} onPlay={play} />)}
                </ScrollView>
              </>
            ) : null}

            <Radar tracks={city.radar} player={player} onPlay={play} />
            <HallOfFame awards={city.hallOfFame} onPlay={play} />
            <Badges badges={city.listenerBadges} />
            <CreatorProgress artist={city.creatorCard} onCreate={() => navigation.navigate('Upload')} />
          </>
        ) : null}
      </ScrollView>

      <EventDetailSheet
        event={detailEvent}
        player={player}
        voting={voting}
        onClose={() => setDetailEvent(null)}
        onPlay={play}
        onVote={(eventId, trackId) => void vote(eventId, trackId)}
        onParticipate={(event) => {
          setDetailEvent(null);
          openParticipate(event);
        }}
      />

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

      <WinnerCelebration
        event={celebrationEvent}
        busy={Boolean(actingEventId)}
        onClose={closeCelebration}
        onClaim={() => {
          if (!celebrationEvent) return;
          void claim(celebrationEvent).finally(closeCelebration);
        }}
      />

      {toast ? <View pointerEvents="none" style={[styles.toast, { bottom: insets.bottom + 112 }]}><Ionicons name="checkmark-circle" size={16} color={colors.paper} /><Text style={styles.toastText}>{toast}</Text></View> : null}
    </View>
  );
}

function LoadingEvents() {
  return <View style={styles.loading}><ActivityIndicator color={colors.text} /><Text style={styles.loadingText}>Le Pulse se met à jour...</Text></View>;
}

function EventsHero({ city, onUpload, onCommunity }: { city: SynauraCityData; onUpload: () => void; onCommunity: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  const hot = city.pulse.filter((track) => track.pulse >= 78).length;
  const live = city.events.filter((event) => event.isLive).length;
  return (
    <View style={styles.hero}>
      <LinearGradient colors={['#FFE1D8', '#F2EBFF', '#DDF8F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.heroPulse, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.2] }) }] }]} />
      <View style={styles.heroBadge}><View style={styles.heroDot} /><Text style={styles.heroBadgeText}>LE PULSE EST EN LIVE</Text></View>
      <Text style={styles.heroTitle}>{city.cityMood.title}</Text>
      <Text style={styles.heroSubtitle}>{city.cityMood.subtitle}</Text>
      <View style={styles.heroStats}>
        <HeroStat value={String(hot)} label="sons en feu" />
        <HeroStat value={String(live)} label="events live" />
        <HeroStat value={compact(city.cityMood.reactionsToday)} label="réactions" />
      </View>
      <View style={styles.heroActions}>
        <MotionPressable onPress={onUpload} style={styles.primaryButton}><Ionicons name="add" size={16} color={colors.paper} /><Text style={styles.primaryButtonText}>Participer</Text></MotionPressable>
        <MotionPressable onPress={onCommunity} style={styles.secondaryButton}><Ionicons name="people" size={15} color={colors.text} /><Text style={styles.secondaryButtonText}>Communauté</Text></MotionPressable>
      </View>
    </View>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return <View style={styles.heroStat}><Text style={styles.heroStatValue}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View>;
}

function ShowcaseCard({ item, index, playing, onPlay }: { item: CityShowcaseItem; index: number; playing: boolean; onPlay: (track: Track) => void }) {
  return (
    <Reveal delay={index * 45}>
      <MotionPressable onPress={() => onPlay(item.track)} style={styles.showcase}>
        <TrackCover track={item.track} active style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(23,19,19,0.02)', 'rgba(23,19,19,0.88)']} style={StyleSheet.absoluteFill} />
        <View style={styles.showcaseLabel}><Ionicons name={iconName(item.icon)} size={12} color={item.accent} /><Text style={styles.showcaseLabelText}>{item.label}</Text></View>
        <View style={styles.showcasePlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.text} /></View>
        <View style={styles.showcaseBottom}><Text style={[styles.showcaseCaption, { color: item.accent }]}>{item.caption}</Text><Text numberOfLines={2} style={styles.showcaseTitle}>{item.track.title}</Text><Text numberOfLines={1} style={styles.showcaseArtist}>{artistName(item.track)}</Text></View>
      </MotionPressable>
    </Reveal>
  );
}

function PulseTrackCard({ track, rank, playing, onPlay }: { track: CityPulseTrack; rank: number; playing: boolean; onPlay: (track: Track) => void }) {
  return (
    <MotionPressable onPress={() => onPlay(track)} style={styles.pulseCard}>
      <Text style={styles.pulseRank}>{String(rank).padStart(2, '0')}</Text>
      <TrackCover track={track} active={playing} style={styles.pulseCover} />
      <View style={styles.pulseCopy}>
        <Text numberOfLines={1} style={styles.pulseTitle}>{track.title}</Text>
        <Text numberOfLines={1} style={styles.pulseArtist}>{artistName(track)} · {track.pulseReasons.join(' · ')}</Text>
        <PulseBar value={track.pulse} />
      </View>
      <View style={styles.pulseSide}><PulseBadge track={track} compact /><Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={27} color={colors.text} /></View>
    </MotionPressable>
  );
}

function ArtistCard({ artist, index, onOpen, onPlay }: { artist: CityArtist; index: number; onOpen: () => void; onPlay: (track: Track) => void }) {
  return (
    <Reveal delay={index * 45}>
      <View style={styles.artistCard}>
        <LinearGradient colors={['#FFE4DD', '#EEE9FF', '#E0F7F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.artistTop} />
        <Image source={artist.avatar ? { uri: artist.avatar } : require('../assets/synaura-symbol-2026.png')} style={styles.artistAvatar} />
        <View style={styles.artistBody}>
          <Text style={styles.artistBooster}>NOUVEAU TALENT DÉCOUVERT</Text>
          <Text numberOfLines={1} style={styles.artistName}>{artist.name}</Text>
          <Text numberOfLines={1} style={styles.artistHandle}>@{artist.username} · {artist.genre[0] || artist.levelName}</Text>
          <Text style={styles.artistStats}>{compact(artist.totalPlays)} écoutes · {compact(artist.totalLikes)} likes</Text>
          <View style={styles.artistActions}>
            <MotionPressable onPress={onOpen} style={styles.artistOpen}><Text style={styles.artistOpenText}>Découvrir</Text></MotionPressable>
            {artist.featuredTrack ? <MotionPressable onPress={() => onPlay(artist.featuredTrack!)} style={styles.artistPlay}><Ionicons name="play" size={14} color={colors.paper} /></MotionPressable> : null}
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
        <TrackCover track={track} active={playing} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(23,19,19,0.04)', 'rgba(23,19,19,0.88)']} style={StyleSheet.absoluteFill} />
        <Text style={styles.premiereBadge}>NOUVEAU DROP</Text>
        <View style={styles.premierePlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.text} /></View>
        <View style={styles.premiereBottom}><Text style={styles.premierePulse}>PREMIÈRES 24H · PULSE {track.pulse}%</Text><Text numberOfLines={1} style={styles.premiereTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.premiereArtist}>{artistName(track)}</Text></View>
      </MotionPressable>
    </Reveal>
  );
}

function LiveEventCard({ event, index, busy, onDetails, onParticipate, onClaim, onPlay }: { event: CityEvent; index: number; busy: boolean; onDetails: () => void; onParticipate: () => void; onClaim: () => void; onPlay: (track: Track) => void }) {
  const first = event.tracks?.[0];
  const participated = Boolean(event.userParticipation);
  const claimable = event.claimStatus === 'available';
  return (
    <Reveal delay={index * 40}>
      <View style={styles.liveEvent}>
        <EventSummaryCard event={event} onOpen={onDetails} />
        <Text style={styles.liveEventDescription}>{event.description}</Text>
        <View style={styles.liveEventActions}>
          <MotionPressable disabled={busy || (participated && !claimable)} onPress={claimable ? onClaim : onParticipate} style={[styles.primaryButton, participated && !claimable && styles.doneButton]}>
            <Ionicons name={participated && !claimable ? 'checkmark' : claimable ? 'gift' : 'add'} size={15} color={colors.paper} />
            <Text style={styles.primaryButtonText}>{busy ? 'Chargement...' : claimable ? 'Récupérer' : participated ? 'Inscrit' : 'Participer'}</Text>
          </MotionPressable>
          <MotionPressable onPress={onDetails} style={styles.secondaryButton}><Ionicons name="people" size={15} color={colors.text} /><Text style={styles.secondaryButtonText}>Inscrits</Text></MotionPressable>
          {first ? <MotionPressable onPress={() => onPlay(first)} style={styles.iconAction}><Ionicons name="play" size={15} color={colors.text} /></MotionPressable> : null}
        </View>
      </View>
    </Reveal>
  );
}

function BattleCard({ event, voting, player, onPlay, onVote, onDetails }: { event: CityEvent; voting: boolean; player: ReturnType<typeof usePlayer>; onPlay: (track: Track) => void; onVote: (trackId: string) => void; onDetails: () => void }) {
  const tracks = event.tracks || [];
  const total = tracks.reduce((sum, track) => sum + Number(event.voteCounts?.[track._id] || 0), 0) || 1;
  const canVote = Boolean(event.isLive);
  return (
    <View style={styles.battle}>
      <LinearGradient colors={['#EEE9FF', '#FFF4ED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.battleHeader}><View style={styles.battleHeaderCopy}><Text style={styles.battleKicker}>{canVote ? 'VOTE EN COURS' : event.isEnded ? 'VOTE TERMINÉ' : 'PROCHAIN VOTE'}</Text><Text style={styles.battleTitle}>{event.title}</Text><Text style={styles.battleMeta}>{event.totalVotes || 0} votes · quel son mérite la vitrine ?</Text></View><MotionPressable onPress={onDetails} style={styles.battleFlash}><Ionicons name="people" size={20} color={colors.paper} /></MotionPressable></View>
      <BattleDuel event={event} />
      <View style={styles.battleGrid}>
        {tracks.slice(0, 2).map((track) => {
          const selected = event.selectedTrackId === track._id;
          const percent = Math.round(Number(event.voteCounts?.[track._id] || 0) / total * 100);
          const playing = player.current?._id === track._id && player.isPlaying;
          return (
            <View key={track._id} style={[styles.battleTrack, selected && styles.battleTrackSelected]}>
              <MotionPressable onPress={() => onPlay(track)} style={styles.battleCoverWrap}><TrackCover track={track} active={playing} style={StyleSheet.absoluteFill} /><View style={styles.battlePlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.text} /></View></MotionPressable>
              <Text numberOfLines={1} style={styles.battleTrackTitle}>{track.title}</Text>
              <Text numberOfLines={1} style={styles.battleArtist}>{artistName(track)}</Text>
              <PulseBar value={percent} height={5} />
              <MotionPressable disabled={voting || !canVote} onPress={() => onVote(track._id)} style={[styles.voteButton, selected && styles.voteButtonSelected, !canVote && { opacity: 0.45 }]}><Ionicons name={selected ? 'checkmark' : 'flash'} size={12} color={colors.paper} /><Text style={styles.voteText}>{selected ? 'Ton vote' : canVote ? `Voter · ${percent}%` : event.isEnded ? `Résultat · ${percent}%` : 'Bientôt'}</Text></MotionPressable>
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
      <Animated.View style={[styles.radarRing, { opacity: scan.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0] }), transform: [{ scale: scan.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.4] }) }] }]} />
      <SectionHeader eyebrow="RADAR DES TALENTS" title="Pépites détectées" subtitle="Des titres prometteurs encore sous les radars." />
      <View style={styles.stack}>
        {tracks.slice(0, 5).map((track) => <MotionPressable key={track._id} onPress={() => onPlay(track)} style={styles.radarRow}><TrackCover track={track} active style={styles.radarCover} /><View style={styles.radarCopy}><Text numberOfLines={1} style={styles.radarTrack}>{track.title}</Text><Text numberOfLines={1} style={styles.radarArtist}>{artistName(track)} · signal {track.pulse}%</Text><PulseBar value={track.pulse} height={4} /></View><Ionicons name={player.current?._id === track._id && player.isPlaying ? 'pause-circle' : 'play-circle'} size={27} color={colors.text} /></MotionPressable>)}
      </View>
    </View>
  );
}

function HallOfFame({ awards, onPlay }: { awards: CityAward[]; onPlay: (track: Track) => void }) {
  return (
    <View style={styles.panel}>
      <SectionHeader eyebrow="HALL OF FAME" title="Gagnants récents" subtitle="Les moments marquants de la semaine." />
      {awards.map((award, index) => {
        const title = award.track?.title || award.artist?.name || 'Synaura';
        const subtitle = award.track ? artistName(award.track) : award.artist ? `@${award.artist.username}` : award.subtitle;
        return <MotionPressable key={award.id} onPress={() => award.track && onPlay(award.track)} style={styles.awardRow}><View style={[styles.awardIcon, index === 0 && styles.awardIconFirst]}><Ionicons name={iconName(award.icon)} size={16} color={index === 0 ? colors.paper : colors.violet} /></View><View style={styles.awardCopy}><Text numberOfLines={1} style={styles.awardTitle}>{award.title}</Text><Text numberOfLines={1} style={styles.awardSubtitle}>{title} · {subtitle}</Text></View></MotionPressable>;
      })}
    </View>
  );
}

function Badges({ badges }: { badges: CityBadge[] }) {
  return (
    <View style={styles.panel}>
      <SectionHeader eyebrow="BADGES AUDITEUR" title="Ta présence compte" subtitle="Soutiens les artistes tôt et débloque des badges." />
      {badges.map((badge) => <View key={badge.id} style={[styles.badgeRow, badge.unlocked && styles.badgeRowUnlocked]}><View style={[styles.badgeIcon, badge.unlocked && styles.badgeIconUnlocked]}><Ionicons name={iconName(badge.icon)} size={16} color={badge.unlocked ? colors.paper : colors.textTertiary} /></View><View style={styles.badgeCopy}><Text style={styles.badgeTitle}>{badge.title}</Text><Text style={styles.badgeDescription}>{badge.description}</Text><PulseBar value={Math.min(100, badge.progress / Math.max(1, badge.target) * 100)} height={4} /></View><Text style={styles.badgeProgress}>{badge.progress}/{badge.target}</Text></View>)}
    </View>
  );
}

function CreatorProgress({ artist, onCreate }: { artist: CityArtist | null; onCreate: () => void }) {
  const progress = artist ? Math.min(100, artist.xp / Math.max(1, artist.nextLevelXp) * 100) : 0;
  return (
    <View style={styles.creatorProgress}>
      <LinearGradient colors={['#171313', '#32262A']} style={StyleSheet.absoluteFill} />
      <Text style={styles.creatorKicker}>CARTE ARTISTE ÉVOLUTIVE</Text>
      <Text style={styles.creatorTitle}>Ton activité construit ton statut.</Text>
      {artist ? <View style={styles.creatorBody}><Image source={artist.avatar ? { uri: artist.avatar } : require('../assets/synaura-symbol-2026.png')} style={styles.creatorAvatar} /><View style={styles.creatorCopy}><Text style={styles.creatorLevel}>NIVEAU {artist.level}</Text><Text style={styles.creatorLevelName}>{artist.levelName}</Text><Text style={styles.creatorXp}>{artist.xp} XP · {artist.trackCount} sons</Text></View><View style={styles.creatorFullBar}><LinearGradient colors={[colors.cyan, colors.violet, colors.coral]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.creatorBarFill, { width: `${progress}%` }]} /></View><Text style={styles.creatorNext}>{Math.max(0, artist.nextLevelXp - artist.xp)} XP avant le prochain niveau</Text></View> : <View style={styles.creatorEmpty}><Text style={styles.creatorEmptyText}>Publie ton premier son pour créer ta carte artiste.</Text><MotionPressable onPress={onCreate} style={styles.creatorButton}><Text style={styles.creatorButtonText}>Commencer</Text></MotionPressable></View>}
    </View>
  );
}

function EventDetailSheet({
  event,
  player,
  voting,
  onClose,
  onPlay,
  onVote,
  onParticipate,
}: {
  event: CityEvent | null;
  player: ReturnType<typeof usePlayer>;
  voting: boolean;
  onClose: () => void;
  onPlay: (track: Track) => void;
  onVote: (eventId: string, trackId: string) => void;
  onParticipate: (event: CityEvent) => void;
}) {
  const insets = useSafeAreaInsets();
  const participants = event?.participants?.length
    ? event.participants
    : (event?.tracks || []).map((track) => ({
        id: `track-${track._id}`,
        eventId: event?.id || '',
        userId: String(track.artist?._id || ''),
        username: track.artist?.username || null,
        name: artistName(track),
        avatar: track.artist?.avatar || null,
        trackId: track._id,
        status: 'contender' as const,
        track,
      }));

  return (
    <Modal visible={Boolean(event)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.eventDetailSheet, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.eventDetailHero}>
            {event?.tracks?.[0] ? <TrackCover track={event.tracks[0]} style={StyleSheet.absoluteFill} /> : null}
            <LinearGradient colors={['rgba(23,19,19,0.36)', 'rgba(23,19,19,0.94)']} style={StyleSheet.absoluteFill} />
            <View style={styles.eventDetailTop}><View style={styles.eventDetailStatus}><View style={styles.eventDetailDot} /><Text style={styles.eventDetailStatusText}>{event?.isLive ? 'EN LIVE' : 'EVENT SYNAURA'}</Text></View><MotionPressable onPress={onClose} style={styles.eventDetailClose}><Ionicons name="close" size={18} color={colors.paper} /></MotionPressable></View>
            <View style={styles.eventDetailHeroCopy}><Text style={styles.eventDetailTitle}>{event?.title}</Text><Text style={styles.eventDetailDescription}>{event?.description}</Text><Text style={styles.eventDetailMeta}>{participants.length} inscrit{participants.length > 1 ? 's' : ''}{event?.kind === 'battle' ? ` · ${event.totalVotes || 0} votes` : ''}</Text></View>
          </View>
          <ScrollView style={styles.eventDetailList} contentContainerStyle={styles.eventDetailListContent} showsVerticalScrollIndicator={false}>
            {participants.length ? participants.map((participant) => {
              const track = participant.track as Track | null | undefined;
              if (!track) return null;
              const selected = event?.selectedTrackId === track._id;
              const playing = player.current?._id === track._id && player.isPlaying;
              return (
                <View key={participant.id} style={[styles.eventParticipant, selected && styles.eventParticipantSelected]}>
                  <MotionPressable onPress={() => onPlay(track)} style={styles.eventParticipantCover}><TrackCover track={track} active={playing} style={StyleSheet.absoluteFill} /><View style={styles.eventParticipantPlay}><Ionicons name={playing ? 'pause' : 'play'} size={13} color={colors.text} /></View></MotionPressable>
                  <View style={styles.eventParticipantCopy}><Text numberOfLines={1} style={styles.eventParticipantTrack}>{track.title}</Text><Text numberOfLines={1} style={styles.eventParticipantArtist}>{participant.name}{participant.username ? ` · @${participant.username}` : ''}</Text></View>
                  {event?.kind === 'battle' ? <MotionPressable disabled={!event.isLive || voting} onPress={() => onVote(event.id, track._id)} style={[styles.eventParticipantVote, selected && styles.eventParticipantVoteSelected, (!event.isLive || voting) && styles.eventParticipantVoteDisabled]}><Ionicons name={selected ? 'checkmark' : 'flash'} size={13} color={colors.paper} /><Text style={styles.eventParticipantVoteText}>{selected ? 'Voté' : 'Voter'}</Text></MotionPressable> : null}
                </View>
              );
            }) : <View style={styles.eventDetailEmpty}><Ionicons name="musical-notes" size={25} color={colors.textTertiary} /><Text style={styles.eventDetailEmptyText}>Aucun son inscrit. Tu peux être le premier.</Text></View>}
          </ScrollView>
          {event && event.kind !== 'battle' && !event.isEnded ? <MotionPressable onPress={() => onParticipate(event)} style={styles.eventDetailAction}><Ionicons name="add-circle" size={16} color={colors.paper} /><Text style={styles.eventDetailActionText}>{event.userParticipation ? 'Changer mon son inscrit' : 'Inscrire un de mes sons'}</Text></MotionPressable> : null}
        </View>
      </View>
    </Modal>
  );
}

function TrackPickerSheet({ event, busy, onClose, onPick, onCreate }: { event: CityEvent | null; busy: boolean; onClose: () => void; onPick: (trackId: string) => void; onCreate: () => void }) {
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
    getMyTracks().then((next) => active && setTracks(next)).catch((nextError) => active && setLoadError(nextError instanceof Error ? nextError.message : 'Impossible de charger tes sons.'));
    return () => { active = false; };
  }, [event]);
  return (
    <Modal visible={Boolean(event)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetKicker}>PARTICIPER À L’EVENT</Text>
          <Text style={styles.sheetTitle}>Choisis ton son pour « {event?.title} »</Text>
          {loadError ? <Text style={styles.sheetError}>{loadError}</Text> : tracks === null ? <View style={styles.sheetLoading}><ActivityIndicator color={colors.text} /></View> : tracks.length === 0 ? <View style={styles.sheetEmpty}><Ionicons name="musical-notes" size={26} color={colors.textTertiary} /><Text style={styles.sheetEmptyText}>Tu n’as pas encore publié de son.</Text><MotionPressable onPress={onCreate} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Publier un son</Text></MotionPressable></View> : (
            <FlatList data={tracks} keyExtractor={(item) => item.id} style={styles.sheetList} showsVerticalScrollIndicator={false} renderItem={({ item }) => {
              const isSelected = selected === item.id;
              return <Pressable onPress={() => setSelected(item.id)} style={[styles.sheetTrack, isSelected && styles.sheetTrackSelected]}><Image source={item.coverVideoPosterUrl || item.coverUrl ? { uri: item.coverVideoPosterUrl || item.coverUrl || '' } : require('../assets/synaura-symbol-2026.png')} style={styles.sheetCover} /><View style={styles.sheetTrackCopy}><Text numberOfLines={1} style={styles.sheetTrackTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.sheetTrackDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : 'Mon son'}</Text></View><View style={[styles.sheetCheck, isSelected && styles.sheetCheckSelected]}>{isSelected ? <Ionicons name="checkmark" size={14} color={colors.paper} /> : null}</View></Pressable>;
            }} />
          )}
          <MotionPressable disabled={!selected || busy} onPress={() => selected && onPick(selected)} style={[styles.sheetSubmit, (!selected || busy) && styles.sheetSubmitDisabled]}><Ionicons name={busy ? 'hourglass' : 'rocket'} size={15} color={colors.paper} /><Text style={styles.sheetSubmitText}>{busy ? 'Inscription en cours...' : 'Inscrire ce son'}</Text></MotionPressable>
        </View>
      </View>
    </Modal>
  );
}

function WinnerCelebration({ event, busy, onClose, onClaim }: { event: CityEvent | null; busy: boolean; onClose: () => void; onClaim: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(event)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.winnerBackdrop}>
        <View style={[styles.winnerCard, { paddingBottom: insets.bottom + 18 }]}>
          <LinearGradient colors={['#2A2026', '#171313']} style={StyleSheet.absoluteFill} />
          <View style={styles.winnerTrophy}><Ionicons name="trophy" size={26} color={colors.text} /></View>
          <Text style={styles.winnerKicker}>VICTOIRE SYNAURA</Text>
          <Text style={styles.winnerTitle}>{event?.celebration?.title || 'Ton titre gagne la battle'}</Text>
          <Text style={styles.winnerText}>{event?.celebration?.message}</Text>
          {event ? <BattleDuel event={event} /> : null}
          <View style={styles.winnerReward}>
            <Text style={styles.winnerRewardKicker}>GAIN DISPONIBLE</Text>
            <Text style={styles.winnerRewardTitle}>{event?.reward?.title || 'Mise en avant Synaura'}</Text>
            <Text style={styles.winnerRewardText}>{event?.reward?.description || 'Ton titre passe sous les projecteurs pendant 24 h.'}</Text>
          </View>
          <View style={styles.winnerActions}>
            <MotionPressable disabled={busy} onPress={onClaim} style={styles.winnerClaim}><Ionicons name="sparkles" size={16} color={colors.text} /><Text style={styles.winnerClaimText}>{busy ? 'Activation...' : 'Activer mon gain'}</Text></MotionPressable>
            <MotionPressable onPress={onClose} style={styles.winnerLater}><Text style={styles.winnerLaterText}>Plus tard</Text></MotionPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: 190, gap: spacing.md },
  topbar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  roundButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.88)', borderWidth: 1, borderColor: colors.border },
  topCopy: { flex: 1 },
  topKicker: { color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  topTitle: { marginTop: 1, color: colors.text, fontSize: 29, fontWeight: '900' },
  loading: { minHeight: 430, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: colors.textTertiary, fontSize: 11, fontWeight: '900' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(217,45,32,0.2)', backgroundColor: 'rgba(217,45,32,0.07)', padding: 12 },
  errorText: { flex: 1, color: colors.danger, fontSize: 10, fontWeight: '800' },
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: '90%', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 22, backgroundColor: colors.text, paddingHorizontal: 16, paddingVertical: 11, elevation: 10 },
  toastText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
  hero: { minHeight: 365, overflow: 'hidden', borderRadius: 30, borderWidth: 1, borderColor: colors.border, padding: 18 },
  heroPulse: { position: 'absolute', right: -70, bottom: -90, width: 290, height: 290, borderRadius: 145, backgroundColor: colors.coral },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: 'rgba(255,250,242,0.68)', paddingHorizontal: 10, paddingVertical: 7 },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.coral },
  heroBadgeText: { color: colors.text, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { marginTop: 28, maxWidth: 310, color: colors.text, fontSize: 38, lineHeight: 39, fontWeight: '900' },
  heroSubtitle: { marginTop: 10, maxWidth: 310, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  heroStats: { marginTop: 24, flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, borderRadius: 17, backgroundColor: 'rgba(255,250,242,0.62)', padding: 10 },
  heroStatValue: { color: colors.text, fontSize: 19, fontWeight: '900' },
  heroStatLabel: { marginTop: 2, color: colors.textTertiary, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  heroActions: { marginTop: 18, flexDirection: 'row', gap: 8 },
  primaryButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 21, backgroundColor: colors.text, paddingHorizontal: 16 },
  primaryButtonText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
  secondaryButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 21, backgroundColor: 'rgba(255,250,242,0.68)', paddingHorizontal: 16 },
  secondaryButtonText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  doneButton: { opacity: 0.46 },
  iconAction: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)' },
  stack: { gap: 10 },
  horizontalRail: { gap: 10, paddingRight: 14 },
  showcase: { width: 220, height: 282, overflow: 'hidden', borderRadius: 25, backgroundColor: colors.text },
  showcaseLabel: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13, backgroundColor: 'rgba(23,19,19,0.62)', paddingHorizontal: 8, paddingVertical: 6 },
  showcaseLabelText: { color: colors.paper, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  showcasePlay: { position: 'absolute', right: 12, top: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  showcaseBottom: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  showcaseCaption: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  showcaseTitle: { marginTop: 4, color: colors.paper, fontSize: 19, lineHeight: 22, fontWeight: '900' },
  showcaseArtist: { marginTop: 3, color: 'rgba(255,250,242,0.54)', fontSize: 10, fontWeight: '800' },
  pulseCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,250,242,0.86)', padding: 10 },
  pulseRank: { width: 22, color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  pulseCover: { width: 58, height: 58, borderRadius: 16 },
  pulseCopy: { flex: 1, minWidth: 0, gap: 5 },
  pulseTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  pulseArtist: { color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  pulseSide: { alignItems: 'flex-end', gap: 7 },
  artistCard: { width: 244, overflow: 'hidden', borderRadius: 27, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,250,242,0.9)' },
  artistTop: { height: 86 },
  artistAvatar: { width: 70, height: 70, marginTop: -38, marginLeft: 14, borderRadius: 22, borderWidth: 3, borderColor: colors.paper, backgroundColor: '#E8DCCA' },
  artistBody: { padding: 14 },
  artistBooster: { color: colors.violet, fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  artistName: { marginTop: 6, color: colors.text, fontSize: 18, fontWeight: '900' },
  artistHandle: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  artistStats: { marginTop: 8, color: colors.textSecondary, fontSize: 9, fontWeight: '800' },
  artistActions: { marginTop: 12, flexDirection: 'row', gap: 7 },
  artistOpen: { flex: 1, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  artistOpenText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
  artistPlay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  premiere: { width: 210, height: 235, overflow: 'hidden', borderRadius: 25, backgroundColor: colors.text },
  premiereBadge: { position: 'absolute', left: 12, top: 12, color: colors.paper, fontSize: 8, fontWeight: '900', letterSpacing: 1, backgroundColor: colors.coral, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6 },
  premierePlay: { position: 'absolute', right: 12, top: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  premiereBottom: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  premierePulse: { color: '#FFC6BC', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  premiereTitle: { marginTop: 5, color: colors.paper, fontSize: 17, fontWeight: '900' },
  premiereArtist: { marginTop: 3, color: 'rgba(255,250,242,0.5)', fontSize: 9, fontWeight: '800' },
  liveEvent: { gap: 10, borderRadius: 27, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,250,242,0.72)', padding: 10 },
  liveEventDescription: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '700', paddingHorizontal: 4 },
  liveEventActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingBottom: 2 },
  battle: { overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 14 },
  battleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  battleHeaderCopy: { flex: 1 },
  battleKicker: { color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  battleTitle: { marginTop: 5, color: colors.text, fontSize: 20, fontWeight: '900' },
  battleMeta: { marginTop: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  battleFlash: { width: 43, height: 43, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  battleGrid: { marginTop: 13, flexDirection: 'row', gap: 8 },
  battleTrack: { flex: 1, minWidth: 0, borderRadius: 20, backgroundColor: 'rgba(255,250,242,0.68)', padding: 8, gap: 5 },
  battleTrackSelected: { borderWidth: 1, borderColor: colors.violet, backgroundColor: 'rgba(124,92,255,0.1)' },
  battleCoverWrap: { aspectRatio: 1, overflow: 'hidden', borderRadius: 16 },
  battlePlay: { position: 'absolute', right: 7, bottom: 7, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  battleTrackTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },
  battleArtist: { color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  voteButton: { height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, backgroundColor: colors.text },
  voteButtonSelected: { backgroundColor: colors.violet },
  voteText: { color: colors.paper, fontSize: 8, fontWeight: '900' },
  winnerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.74)', padding: 15 },
  winnerCard: { width: '100%', maxWidth: 440, overflow: 'hidden', borderRadius: 31, padding: 18, elevation: 18 },
  winnerTrophy: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD667' },
  winnerKicker: { marginTop: 16, color: '#FF9A90', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  winnerTitle: { marginTop: 6, color: colors.paper, fontSize: 27, lineHeight: 30, fontWeight: '900' },
  winnerText: { marginTop: 8, color: 'rgba(255,250,242,0.58)', fontSize: 10, lineHeight: 16, fontWeight: '700' },
  winnerReward: { borderRadius: 19, backgroundColor: 'rgba(255,250,242,0.08)', padding: 12 },
  winnerRewardKicker: { color: 'rgba(255,250,242,0.38)', fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  winnerRewardTitle: { marginTop: 5, color: colors.paper, fontSize: 13, fontWeight: '900' },
  winnerRewardText: { marginTop: 4, color: 'rgba(255,250,242,0.48)', fontSize: 9, lineHeight: 14, fontWeight: '700' },
  winnerActions: { marginTop: 13, flexDirection: 'row', gap: 8 },
  winnerClaim: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 22, backgroundColor: colors.paper },
  winnerClaimText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  winnerLater: { minHeight: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(255,250,242,0.1)', paddingHorizontal: 15 },
  winnerLaterText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
  radar: { overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(221,248,245,0.72)', padding: 14 },
  radarRing: { position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: 90, borderWidth: 2, borderColor: colors.cyan },
  radarRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 19, backgroundColor: 'rgba(255,250,242,0.72)', padding: 8 },
  radarCover: { width: 50, height: 50, borderRadius: 14 },
  radarCopy: { flex: 1, minWidth: 0, gap: 5 },
  radarTrack: { color: colors.text, fontSize: 11, fontWeight: '900' },
  radarArtist: { color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  panel: { gap: 9, borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,250,242,0.84)', padding: 14 },
  awardRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', padding: 9 },
  awardIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,92,255,0.12)' },
  awardIconFirst: { backgroundColor: colors.text },
  awardCopy: { flex: 1, minWidth: 0 },
  awardTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },
  awardSubtitle: { marginTop: 3, color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  badgeRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 19, backgroundColor: 'rgba(23,19,19,0.04)', padding: 9, opacity: 0.68 },
  badgeRowUnlocked: { opacity: 1, backgroundColor: 'rgba(124,92,255,0.08)' },
  badgeIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.07)' },
  badgeIconUnlocked: { backgroundColor: colors.violet },
  badgeCopy: { flex: 1, minWidth: 0, gap: 4 },
  badgeTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },
  badgeDescription: { color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  badgeProgress: { color: colors.textTertiary, fontSize: 8, fontWeight: '900' },
  creatorProgress: { overflow: 'hidden', borderRadius: 28, padding: 16 },
  creatorKicker: { color: '#C8B8FF', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  creatorTitle: { marginTop: 6, color: colors.paper, fontSize: 20, fontWeight: '900' },
  creatorBody: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  creatorAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#E8DCCA' },
  creatorCopy: { flex: 1, minWidth: 0 },
  creatorLevel: { color: colors.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  creatorLevelName: { marginTop: 3, color: colors.paper, fontSize: 15, fontWeight: '900' },
  creatorXp: { marginTop: 3, color: 'rgba(255,250,242,0.48)', fontSize: 8, fontWeight: '700' },
  creatorFullBar: { width: '100%', height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(255,250,242,0.1)' },
  creatorBarFill: { height: '100%' },
  creatorNext: { color: 'rgba(255,250,242,0.48)', fontSize: 8, fontWeight: '700' },
  creatorEmpty: { marginTop: 15, gap: 12 },
  creatorEmptyText: { color: 'rgba(255,250,242,0.6)', fontSize: 10, fontWeight: '700' },
  creatorButton: { alignSelf: 'flex-start', minHeight: 39, justifyContent: 'center', borderRadius: 20, backgroundColor: colors.paper, paddingHorizontal: 15 },
  creatorButtonText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,19,0.38)' },
  eventDetailSheet: { maxHeight: '88%', overflow: 'hidden', borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.paper },
  eventDetailHero: { minHeight: 238, justifyContent: 'space-between', overflow: 'hidden', padding: 16 },
  eventDetailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventDetailStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: 'rgba(255,250,242,0.16)', paddingHorizontal: 9, paddingVertical: 7 },
  eventDetailDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.coral },
  eventDetailStatusText: { color: colors.paper, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eventDetailClose: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.14)' },
  eventDetailHeroCopy: { gap: 7 },
  eventDetailTitle: { color: colors.paper, fontSize: 28, lineHeight: 31, fontWeight: '900' },
  eventDetailDescription: { color: 'rgba(255,250,242,0.68)', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  eventDetailMeta: { color: '#FFB2A7', fontSize: 9, fontWeight: '900' },
  eventDetailList: { maxHeight: 355 },
  eventDetailListContent: { gap: 8, padding: 12 },
  eventParticipant: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 21, backgroundColor: 'rgba(23,19,19,0.045)', padding: 9 },
  eventParticipantSelected: { borderWidth: 1, borderColor: colors.violet, backgroundColor: 'rgba(124,92,255,0.1)' },
  eventParticipantCover: { width: 58, height: 58, overflow: 'hidden', borderRadius: 16 },
  eventParticipantPlay: { position: 'absolute', right: 5, bottom: 5, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  eventParticipantCopy: { flex: 1, minWidth: 0 },
  eventParticipantTrack: { color: colors.text, fontSize: 11, fontWeight: '900' },
  eventParticipantArtist: { marginTop: 4, color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  eventParticipantVote: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 18, backgroundColor: colors.text, paddingHorizontal: 11 },
  eventParticipantVoteSelected: { backgroundColor: colors.violet },
  eventParticipantVoteDisabled: { opacity: 0.38 },
  eventParticipantVoteText: { color: colors.paper, fontSize: 8, fontWeight: '900' },
  eventDetailEmpty: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 22, backgroundColor: 'rgba(23,19,19,0.035)', padding: 18 },
  eventDetailEmptyText: { color: colors.textTertiary, fontSize: 10, fontWeight: '800' },
  eventDetailAction: { minHeight: 48, marginHorizontal: 12, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 24, backgroundColor: colors.text },
  eventDetailActionText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
  sheet: { maxHeight: '78%', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.paper, padding: 16 },
  sheetHandle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: 'rgba(23,19,19,0.16)' },
  sheetKicker: { marginTop: 14, color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  sheetTitle: { marginTop: 5, color: colors.text, fontSize: 21, lineHeight: 25, fontWeight: '900' },
  sheetError: { marginTop: 12, color: colors.danger, fontSize: 10, fontWeight: '800' },
  sheetLoading: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  sheetEmpty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  sheetEmptyText: { color: colors.textTertiary, fontSize: 10, fontWeight: '800' },
  sheetList: { marginTop: 12 },
  sheetTrack: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, backgroundColor: 'rgba(23,19,19,0.045)', padding: 9, marginBottom: 8 },
  sheetTrackSelected: { backgroundColor: 'rgba(124,92,255,0.1)', borderWidth: 1, borderColor: colors.violet },
  sheetCover: { width: 52, height: 52, borderRadius: 15 },
  sheetTrackCopy: { flex: 1, minWidth: 0 },
  sheetTrackTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  sheetTrackDate: { marginTop: 3, color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  sheetCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  sheetCheckSelected: { borderColor: colors.violet, backgroundColor: colors.violet },
  sheetSubmit: { marginTop: 10, minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, backgroundColor: colors.text },
  sheetSubmitDisabled: { opacity: 0.3 },
  sheetSubmitText: { color: colors.paper, fontSize: 11, fontWeight: '900' },
});

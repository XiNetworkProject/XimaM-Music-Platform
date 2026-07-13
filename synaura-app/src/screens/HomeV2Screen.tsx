import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getHomeData, getNotifications, togglePostLike } from '@/api/client';
import type { Creator, HomeData, HomePost, Playlist, Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { PostAttachedTrackCard } from '@/components/social/PostAttachedTrackCard';
import { UniversalSearchModal, NotificationModal } from '@/components/HomeOverlays';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { SynauraBackground } from '@/components/SynauraBackground';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const emptyHome: HomeData = {
  forYou: [],
  trending: [],
  recent: [],
  boosted: [],
  playlists: [],
  creators: [],
  posts: [],
};

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function uniqueTracks(tracks: Track[]) {
  const byId = new Map<string, Track>();
  tracks.forEach((track) => {
    if (track?._id && !byId.has(track._id)) byId.set(track._id, track);
  });
  return Array.from(byId.values());
}

export function HomeV2Screen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const player = usePlayer();
  const [data, setData] = useState<HomeData>(emptyHome);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await getHomeData();
      setData(next);
      void getNotifications().then((result) => setUnread(result.unread)).catch(() => {});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const forYou = useMemo(() => uniqueTracks(data.forYou).slice(0, 10), [data.forYou]);
  const boosted = useMemo(() => uniqueTracks(data.boosted).slice(0, 8), [data.boosted]);
  const trending = useMemo(() => uniqueTracks(data.trending).slice(0, 10), [data.trending]);
  const recommendations = useMemo(
    () => uniqueTracks([...data.forYou, ...data.boosted, ...data.trending]).slice(0, 10),
    [data.boosted, data.forYou, data.trending],
  );
  const recent = useMemo(() => uniqueTracks(data.recent).slice(0, 8), [data.recent]);
  const hero = recommendations[0] || recent[0] || player.current;
  const featuredCollection = useMemo(
    () => data.playlists.find((playlist) => playlist.isEditorial || playlist.collection || playlist.bannerUrl) || null,
    [data.playlists],
  );

  const playFrom = useCallback(async (tracks: Track[], track: Track) => {
    const playable = tracks.filter((item) => item.audioUrl);
    const index = Math.max(0, playable.findIndex((item) => item._id === track._id));
    await player.setQueueAndPlay(playable, index);
  }, [player]);

  return (
    <View style={styles.root}>
      <SynauraBackground variant="warm" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          { paddingTop: insets.top + 12, paddingBottom: responsive.miniPlayerClearance + 10 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text} />}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require('../assets/synaura-symbol-2026.png')} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>Synaura</Text>
              <Text style={styles.brandLine}>Ton monde musical</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Rechercher" onPress={() => setSearchOpen(true)} style={styles.headerButton}>
              <Ionicons name="search" size={18} color={colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Notifications" onPress={() => setNotificationsOpen(true)} style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={19} color={colors.text} />
              {unread ? <View style={styles.unreadDot} /> : null}
            </Pressable>
            <MobileAccountButton compact />
          </View>
        </View>

        {player.current ? (
          <Pressable onPress={() => navigation.navigate('Swipe')} style={styles.resume}>
            <TrackCover track={player.current} active={player.isPlaying} style={styles.resumeCover} />
            <View style={styles.resumeCopy}>
              <Text style={styles.resumeKicker}>REPRENDRE L'ECOUTE</Text>
              <Text numberOfLines={1} style={styles.resumeTitle}>{player.current.title}</Text>
              <Text numberOfLines={1} style={styles.resumeArtist}>{artistName(player.current)}</Text>
            </View>
            <Pressable onPress={() => void player.togglePlayPause()} style={styles.resumePlay}>
              <Ionicons name={player.isPlaying ? 'pause' : 'play'} size={18} color={colors.paper} />
            </Pressable>
          </Pressable>
        ) : null}

        {hero ? (
          <View style={styles.hero}>
            <TrackCover track={hero} active={player.current?._id === hero._id && player.isPlaying} autoPlayVideo style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(19,16,17,0.02)', 'rgba(19,16,17,0.82)']} locations={[0.2, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroContent}>
              <Text style={styles.heroKicker}>CHOISI POUR TOI</Text>
              <Text numberOfLines={2} style={styles.heroTitle}>{hero.title}</Text>
              <Text numberOfLines={1} style={styles.heroArtist}>{artistName(hero)}</Text>
              <View style={styles.heroActions}>
                <Pressable onPress={() => playFrom(recommendations.length ? recommendations : [hero], hero)} style={styles.heroPlay}>
                  <Ionicons name={player.current?._id === hero._id && player.isPlaying ? 'pause' : 'play'} size={18} color={colors.text} />
                  <Text style={styles.heroPlayText}>{player.current?._id === hero._id && player.isPlaying ? 'En lecture' : 'Ecouter'}</Text>
                </Pressable>
                <Pressable onPress={() => navigation.navigate('Swipe')} style={styles.heroScroll}>
                  <Text style={styles.heroScrollLetter}>S</Text>
                  <Text style={styles.heroScrollText}>Scroll</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : loading ? <ActivityIndicator color={colors.text} style={styles.loader} /> : null}

        <View style={styles.shortcutRow}>
          <Shortcut icon="musical-notes-outline" title="Scroll" subtitle="Decouvrir maintenant" onPress={() => navigation.navigate('Swipe')} />
          <Shortcut icon="sparkles-outline" title="Studio" subtitle="Creer un morceau" onPress={() => navigation.navigate('AIStudio')} />
        </View>

        <CommunityComposerCard
          onPost={() => navigation.navigate('CreatePost')}
          onUpload={() => navigation.navigate('Upload')}
          onStudio={() => navigation.navigate('AIStudio')}
          onCommunity={() => navigation.navigate('Community', { compose: true })}
        />

        <PulseCard
          tracks={trending}
          postsCount={data.posts.length}
          creatorsCount={data.creators.length}
          onOpen={() => navigation.navigate('City')}
          onScroll={() => navigation.navigate('Swipe')}
        />

        {featuredCollection ? (
          <CollectionFeatureCard
            playlist={featuredCollection}
            onPress={() => navigation.navigate('PlaylistDetail', { playlistId: featuredCollection.slug || featuredCollection.id })}
          />
        ) : null}

        <TrackRail title="Pour toi" tracks={forYou.length ? forYou : recommendations} player={player} onPlay={(track) => playFrom(forYou.length ? forYou : recommendations, track)} onSeeAll={() => navigation.navigate('Discover')} />
        <TrackRail title="Tendances maintenant" tracks={trending} player={player} onPlay={(track) => playFrom(trending, track)} onSeeAll={() => navigation.navigate('Discover')} />
        <TrackRail title="Mis en avant" tracks={boosted} player={player} onPlay={(track) => playFrom(boosted, track)} onSeeAll={() => navigation.navigate('Discover')} />

        {data.creators.length ? (
          <>
            <SectionHeader title="Artistes qui montent" action="Explorer" onPress={() => navigation.navigate('Discover')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorRail}>
              {data.creators.slice(0, 8).map((creator) => (
                <CreatorBubble key={creator.id} creator={creator} onPress={() => navigation.navigate('PublicProfile', { username: creator.handle.replace(/^@/, '') })} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {data.playlists.length ? (
          <>
            <SectionHeader title="Playlists et ambiances" action="Voir" onPress={() => navigation.navigate('Library')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistRail}>
              {data.playlists.slice(0, 8).map((playlist) => (
                <PlaylistTile key={playlist.id} playlist={playlist} onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.slug || playlist.id })} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {data.posts.length ? (
          <>
            <SectionHeader title="Dans la communaute" action="Ouvrir" onPress={() => navigation.navigate('Community')} />
            <View style={styles.postList}>
              {data.posts.slice(0, 5).map((post) => (
                <PostPreviewCard
                  key={post.id}
                  post={post}
                  activeId={player.current?._id}
                  isPlaying={player.isPlaying}
                  onOpen={() => navigation.navigate('PostDetail', { postId: post.id })}
                  onOpenProfile={() => navigation.navigate('PublicProfile', { username: post.handle.replace(/^@/, '') })}
                  onPlay={(track) => playFrom([track, ...recommendations], track)}
                  onRemix={(track) => navigation.navigate('AIStudio', { sourceTrackId: track._id, sourceTrackType: track._id.startsWith('ai-') ? 'ai_track' : 'track', mode: 'remix' })}
                />
              ))}
            </View>
          </>
        ) : (
          <CommunityEmptyCard onPost={() => navigation.navigate('CreatePost')} />
        )}

        {recent.length ? (
          <>
            <SectionHeader title="Fraichement publie" />
            <View style={styles.recentList}>
              {recent.map((track) => (
                <Pressable key={track._id} onPress={() => playFrom(recent, track)} style={styles.recentRow}>
                  <TrackCover track={track} active={player.current?._id === track._id && player.isPlaying} style={styles.recentCover} />
                  <View style={styles.recentCopy}>
                    <Text numberOfLines={1} style={styles.recentTitle}>{track.title}</Text>
                    <Text numberOfLines={1} style={styles.recentArtist}>{artistName(track)}</Text>
                  </View>
                  <Ionicons name={player.current?._id === track._id && player.isPlaying ? 'pause-circle' : 'play-circle'} size={32} color={colors.text} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <UniversalSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationModal visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} onUnreadChange={setUnread} />
    </View>
  );
}

function Shortcut({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.shortcut}>
      <View style={styles.shortcutIcon}><Ionicons name={icon} size={19} color={colors.text} /></View>
      <View style={styles.shortcutCopy}><Text style={styles.shortcutTitle}>{title}</Text><Text numberOfLines={1} style={styles.shortcutSubtitle}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Pressable onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

function TrackRail({
  title,
  subtitle,
  tracks,
  player,
  onPlay,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  tracks: Track[];
  player: ReturnType<typeof usePlayer>;
  onPlay: (track: Track) => void;
  onSeeAll?: () => void;
}) {
  if (!tracks.length) return null;
  return (
    <View>
      <SectionHeader title={title} action={onSeeAll ? 'Tout voir' : undefined} onPress={onSeeAll} />
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackRail}>
        {tracks.map((track) => (
          <TrackTile
            key={track._id}
            track={track}
            playing={player.current?._id === track._id && player.isPlaying}
            onPress={() => onPlay(track)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CommunityComposerCard({
  onPost,
  onUpload,
  onStudio,
  onCommunity,
}: {
  onPost: () => void;
  onUpload: () => void;
  onStudio: () => void;
  onCommunity: () => void;
}) {
  return (
    <View style={styles.composerCard}>
      <View style={styles.composerAvatar}><Text style={styles.composerAvatarText}>S</Text></View>
      <View style={styles.composerBody}>
        <Text style={styles.composerKicker}>PUBLIER MAINTENANT</Text>
        <Text style={styles.composerTitle}>Quoi de neuf dans ton univers ?</Text>
        <View style={styles.composerActions}>
          <PillAction icon="chatbubble-outline" label="Post" active onPress={onPost} />
          <PillAction icon="musical-notes-outline" label="Son" onPress={onUpload} />
          <PillAction icon="sparkles-outline" label="Studio" onPress={onStudio} />
          <PillAction icon="people-outline" label="Avis" onPress={onCommunity} />
        </View>
      </View>
    </View>
  );
}

function PulseCard({
  tracks,
  postsCount,
  creatorsCount,
  onOpen,
  onScroll,
}: {
  tracks: Track[];
  postsCount: number;
  creatorsCount: number;
  onOpen: () => void;
  onScroll: () => void;
}) {
  const covers = tracks.slice(0, 3);
  return (
    <View style={styles.pulseCard}>
      <LinearGradient colors={['#FFF7ED', '#F3EEFF', '#E9FAF8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.pulseTop}>
        <View>
          <Text style={styles.pulseKicker}>SYNAURA PULSE</Text>
          <Text style={styles.pulseTitle}>Ce qui bouge maintenant</Text>
        </View>
        <View style={styles.coverStack}>
          {covers.map((track, index) => (
            <TrackCover key={track._id} track={track} style={[styles.stackCover, { marginLeft: index ? -12 : 0, transform: [{ rotate: `${index * 5 - 5}deg` }] }]} />
          ))}
        </View>
      </View>
      <View style={styles.pulseStats}>
        <MiniStat value={tracks.length} label="sons" />
        <MiniStat value={postsCount} label="posts" />
        <MiniStat value={creatorsCount} label="artistes" />
      </View>
      <View style={styles.pulseActions}>
        <Pressable onPress={onOpen} style={styles.pulsePrimary}><Text style={styles.pulsePrimaryText}>Voir Events</Text></Pressable>
        <Pressable onPress={onScroll} style={styles.pulseSecondary}><Text style={styles.pulseSecondaryText}>Entrer dans S</Text></Pressable>
      </View>
    </View>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return <View style={styles.miniStat}><Text style={styles.miniStatValue}>{value}</Text><Text style={styles.miniStatLabel}>{label}</Text></View>;
}

function PillAction({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pillAction, active && styles.pillActionActive]}>
      <Ionicons name={icon} size={13} color={active ? colors.paper : colors.textSecondary} />
      <Text style={[styles.pillActionText, active && styles.pillActionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TrackTile({ track, playing, onPress }: { track: Track; playing: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.trackTile}>
      <View style={styles.trackTileCoverWrap}>
        <TrackCover track={track} active={playing} style={styles.trackTileCover} />
        <View style={styles.trackTilePlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.text} /></View>
      </View>
      <Text numberOfLines={1} style={styles.trackTileTitle}>{track.title}</Text>
      <Text numberOfLines={1} style={styles.trackTileArtist}>{artistName(track)}</Text>
    </Pressable>
  );
}

function CreatorBubble({ creator, onPress }: { creator: Creator; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.creator}>
      <View style={[styles.creatorAvatar, { backgroundColor: creator.tint || '#8B8193' }]}>
        {creator.avatar?.startsWith('http') ? <Image source={{ uri: creator.avatar }} style={StyleSheet.absoluteFill} /> : <Text style={styles.creatorInitial}>{creator.avatar || creator.name.slice(0, 1)}</Text>}
      </View>
      <Text numberOfLines={1} style={styles.creatorName}>{creator.name}</Text>
      <Text numberOfLines={1} style={styles.creatorTag}>{creator.tag || creator.handle}</Text>
    </Pressable>
  );
}

function PlaylistTile({ playlist, onPress }: { playlist: Playlist; onPress: () => void }) {
  const covers = playlist.covers.filter(Boolean).slice(0, 4);
  const banner = playlist.bannerUrl || playlist.collection?.bannerUrl;
  const badge = playlist.badge || playlist.collection?.badge;
  return (
    <Pressable onPress={onPress} style={styles.playlistTile}>
      {banner ? (
        <View style={styles.playlistBanner}>
          <Image source={{ uri: banner }} style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={['rgba(23,19,19,0.02)', 'rgba(23,19,19,0.66)']} style={StyleSheet.absoluteFillObject} />
          {badge ? <Text numberOfLines={1} style={styles.playlistBadge}>{badge}</Text> : null}
        </View>
      ) : (
        <View style={styles.playlistCover}>
          {covers.length ? covers.map((cover, index) => (
            <Image key={`${cover}-${index}`} source={{ uri: cover }} style={styles.playlistCoverPart} />
          )) : <Ionicons name="albums-outline" size={26} color={colors.textTertiary} />}
        </View>
      )}
      <Text numberOfLines={1} style={styles.playlistTitle}>{playlist.title}</Text>
      <Text numberOfLines={1} style={styles.playlistMeta}>{playlist.tracks || playlist.vibe}</Text>
    </Pressable>
  );
}

function CollectionFeatureCard({ playlist, onPress }: { playlist: Playlist; onPress: () => void }) {
  const responsive = useResponsiveLayout();
  const collection = playlist.collection;
  const cardColors = collection?.themeColors?.length ? collection.themeColors : playlist.themeColors?.length ? playlist.themeColors : ['#8B5CF6', '#EC4899', '#22D3EE'];
  const banner = playlist.bannerUrl || collection?.bannerUrl || playlist.coverUrl || playlist.covers[0];

  return (
    <Pressable onPress={onPress} style={styles.collectionFeature}>
      <LinearGradient colors={cardColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      {banner ? <Image source={{ uri: banner }} style={styles.collectionFeatureImage} /> : null}
      <LinearGradient colors={['rgba(19,16,17,0.20)', 'rgba(19,16,17,0.86)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.collectionFeatureBody}>
        <Text style={styles.collectionFeatureBadge}>{playlist.badge || collection?.badge || 'Collection officielle'}</Text>
        <Text numberOfLines={2} style={[styles.collectionFeatureTitle, responsive.isNarrow && styles.collectionFeatureTitleNarrow]}>{collection?.title || playlist.title}</Text>
        <Text numberOfLines={2} style={styles.collectionFeatureText}>{collection?.subtitle || playlist.vibe}</Text>
        <View style={styles.collectionFeatureAction}>
          <Ionicons name="play" size={17} color={colors.text} />
          <Text style={styles.collectionFeatureActionText}>Ouvrir la collection</Text>
        </View>
      </View>
    </Pressable>
  );
}

function PostPreviewCard({
  post,
  activeId,
  isPlaying,
  onOpen,
  onOpenProfile,
  onPlay,
  onRemix,
}: {
  post: HomePost;
  activeId?: string;
  isPlaying: boolean;
  onOpen: () => void;
  onOpenProfile: () => void;
  onPlay: (track: Track) => void;
  onRemix: (track: Track) => void;
}) {
  const navigation = useNavigation<any>();
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likesCount);
  const playingThis = post.track ? activeId === post.track._id && isPlaying : false;

  const like = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((value) => Math.max(0, value + (next ? 1 : -1)));
    try {
      await togglePostLike(post.id);
    } catch {
      setLiked(!next);
      setLikes((value) => Math.max(0, value + (next ? -1 : 1)));
    }
  };

  const share = () => {
    Share.share({ message: `${post.author} sur Synaura: ${post.text}` }).catch(() => {});
  };

  return (
    <View style={styles.postCard}>
      <Pressable onPress={onOpenProfile} style={styles.postHeader}>
        <View style={styles.postAvatar}>
          {post.avatar?.startsWith('http') ? <Image source={{ uri: post.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.postAvatarText}>{post.avatar || post.author.slice(0, 1)}</Text>}
        </View>
        <View style={styles.postAuthor}>
          <Text numberOfLines={1} style={styles.postName}>{post.author}</Text>
          <Text numberOfLines={1} style={styles.postMeta}>{post.handle} · {post.time} · {post.mood}</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
      </Pressable>
      <Pressable onPress={onOpen}>
        <Text numberOfLines={4} style={styles.postText}>{post.text}</Text>
      </Pressable>
      {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} /> : null}
      {post.track ? (
        <PostAttachedTrackCard
          track={post.track}
          playing={playingThis}
          onPlay={() => onPlay(post.track!)}
          onOpen={() => navigation.navigate('TrackDetail', { trackId: post.track!._id, track: post.track })}
        />
      ) : null}
      <View style={styles.postActions}>
        <Pressable onPress={like} style={[styles.postAction, liked && styles.postActionActive]}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={15} color={liked ? colors.paper : colors.textSecondary} /><Text style={[styles.postActionText, liked && styles.postActionTextActive]}>{likes || 'Like'}</Text></Pressable>
        <Pressable onPress={onOpen} style={styles.postAction}><Ionicons name="chatbubble-outline" size={15} color={colors.textSecondary} /><Text style={styles.postActionText}>{post.commentsCount || 'Avis'}</Text></Pressable>
        {post.track ? <Pressable onPress={() => onRemix(post.track!)} style={styles.postAction}><Ionicons name="sparkles-outline" size={15} color={colors.textSecondary} /><Text style={styles.postActionText}>Remix</Text></Pressable> : null}
        <Pressable onPress={share} style={styles.postAction}><Ionicons name="share-social-outline" size={15} color={colors.textSecondary} /><Text style={styles.postActionText}>Partager</Text></Pressable>
      </View>
    </View>
  );
}

function CommunityEmptyCard({ onPost }: { onPost: () => void }) {
  return (
    <View style={styles.emptyCommunity}>
      <Ionicons name="chatbubbles-outline" size={22} color={colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.emptyCommunityTitle}>Aucun post pour l'instant</Text>
      </View>
      <Pressable onPress={onPost} style={styles.emptyCommunityButton}><Ionicons name="add" size={18} color={colors.paper} /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 145 },
  header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 31, height: 31, borderRadius: 9 },
  brandName: { color: colors.text, fontSize: 17, fontWeight: '900' },
  brandLine: { marginTop: 1, color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  unreadDot: { position: 'absolute', top: 7, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#D46C78' },
  resume: { marginTop: 12, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 7 },
  resumeCover: { width: 40, height: 40, borderRadius: 9 },
  resumeCopy: { flex: 1, minWidth: 0 },
  resumeKicker: { color: colors.textTertiary, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  resumeTitle: { marginTop: 3, color: colors.text, fontSize: 13, fontWeight: '900' },
  resumeArtist: { marginTop: 2, color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  resumePlay: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  hero: { height: 224, marginTop: 12, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 16, backgroundColor: colors.black },
  heroContent: { padding: 16 },
  heroKicker: { color: 'rgba(255,249,239,0.62)', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  heroTitle: { marginTop: 5, maxWidth: '92%', color: colors.paper, fontSize: 22, lineHeight: 24, fontWeight: '900' },
  heroArtist: { marginTop: 5, color: 'rgba(255,249,239,0.7)', fontSize: 13, fontWeight: '800' },
  heroActions: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroPlay: { height: 39, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, backgroundColor: colors.paper, paddingHorizontal: 13 },
  heroPlayText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  heroScroll: { height: 39, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11 },
  heroScrollLetter: { color: colors.paper, fontSize: 18, fontWeight: '900' },
  heroScrollText: { color: colors.paper, fontSize: 10, fontWeight: '800' },
  loader: { marginVertical: 90 },
  shortcutRow: { marginTop: 8, flexDirection: 'row', gap: 8 },
  shortcut: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9 },
  shortcutIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.09)' },
  shortcutCopy: { flex: 1 },
  shortcutTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  shortcutSubtitle: { display: 'none' },
  sectionHeader: { marginTop: 19, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionSubtitle: { marginTop: -4, marginBottom: 10, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  sectionAction: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  trackRail: { gap: 12, paddingRight: 18 },
  trackTile: { width: 118 },
  trackTileCoverWrap: { width: 118, height: 118, overflow: 'hidden', borderRadius: 13, backgroundColor: 'rgba(17,17,17,0.06)' },
  trackTileCover: { width: '100%', height: '100%' },
  trackTilePlay: { position: 'absolute', right: 7, bottom: 7, width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)' },
  trackTileTitle: { marginTop: 8, color: colors.text, fontSize: 12, fontWeight: '900' },
  trackTileArtist: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  creatorRail: { gap: 15, paddingRight: 18 },
  creator: { width: 78, alignItems: 'center' },
  creatorAvatar: { width: 62, height: 62, borderRadius: 31, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.72)' },
  creatorInitial: { color: colors.paper, fontSize: 20, fontWeight: '900' },
  creatorName: { marginTop: 7, width: 78, color: colors.text, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  creatorTag: { marginTop: 1, width: 78, color: colors.textTertiary, fontSize: 8, fontWeight: '700', textAlign: 'center' },
  recentList: { gap: 7 },
  recentRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 7 },
  recentCover: { width: 42, height: 42, borderRadius: 9 },
  recentCopy: { flex: 1, minWidth: 0 },
  recentTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  recentArtist: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  composerCard: { marginTop: 12, flexDirection: 'row', gap: 10, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,250,242,0.88)', padding: 12 },
  composerAvatar: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  composerAvatarText: { color: colors.paper, fontSize: 17, fontWeight: '900' },
  composerBody: { flex: 1, minWidth: 0 },
  composerKicker: { color: colors.accent, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  composerTitle: { marginTop: 4, color: colors.text, fontSize: 17, fontWeight: '900' },
  composerText: { marginTop: 4, color: colors.textSecondary, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  composerActions: { marginTop: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pillAction: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, backgroundColor: 'rgba(23,19,19,0.06)', paddingHorizontal: 10 },
  pillActionActive: { backgroundColor: colors.text },
  pillActionText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  pillActionTextActive: { color: colors.paper },
  pulseCard: { marginTop: 12, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14 },
  pulseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pulseKicker: { color: colors.accent, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  pulseTitle: { marginTop: 4, color: colors.text, fontSize: 18, fontWeight: '900' },
  pulseText: { marginTop: 7, color: colors.textSecondary, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  coverStack: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  stackCover: { width: 42, height: 42, borderRadius: 13, borderWidth: 2, borderColor: colors.paper },
  pulseStats: { marginTop: 12, flexDirection: 'row', gap: 8 },
  miniStat: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.58)', alignItems: 'center', justifyContent: 'center' },
  miniStatValue: { color: colors.text, fontSize: 16, fontWeight: '900' },
  miniStatLabel: { marginTop: 1, color: colors.textTertiary, fontSize: 8, fontWeight: '900' },
  pulseActions: { marginTop: 11, flexDirection: 'row', gap: 8 },
  pulsePrimary: { flex: 1, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  pulsePrimaryText: { color: colors.paper, fontSize: 11, fontWeight: '900' },
  pulseSecondary: { flex: 1, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.58)' },
  pulseSecondaryText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  playlistRail: { gap: 12, paddingRight: 18 },
  playlistTile: { width: 126 },
  playlistCover: { width: 126, height: 96, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', borderRadius: 14, backgroundColor: 'rgba(23,19,19,0.06)', alignItems: 'center', justifyContent: 'center' },
  playlistCoverPart: { width: '50%', height: '50%' },
  playlistBanner: { width: 126, height: 96, overflow: 'hidden', borderRadius: 14, backgroundColor: 'rgba(23,19,19,0.08)', justifyContent: 'flex-end', padding: 9 },
  playlistBadge: { color: colors.paper, fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  playlistTitle: { marginTop: 8, color: colors.text, fontSize: 12, fontWeight: '900' },
  playlistMeta: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  collectionFeature: { minHeight: 310, borderRadius: 30, overflow: 'hidden', marginTop: 4, marginBottom: 6, backgroundColor: colors.text, shadowColor: colors.text, shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 5 },
  collectionFeatureImage: { ...StyleSheet.absoluteFillObject, opacity: 0.48 },
  collectionFeatureBody: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  collectionFeatureBadge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, backgroundColor: 'rgba(255,249,239,0.18)', paddingHorizontal: 12, paddingVertical: 7, color: colors.paper, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' },
  collectionFeatureTitle: { marginTop: 12, color: colors.paper, fontSize: 34, lineHeight: 34, fontWeight: '900' },
  collectionFeatureTitleNarrow: { fontSize: 27, lineHeight: 29 },
  collectionFeatureText: { marginTop: 10, color: 'rgba(255,249,239,0.78)', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  collectionFeatureAction: { alignSelf: 'flex-start', marginTop: 16, height: 48, borderRadius: 24, backgroundColor: colors.paper, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  collectionFeatureActionText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  postList: { gap: 10 },
  postCard: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,250,242,0.9)', padding: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  postAvatar: { width: 36, height: 36, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  postAvatarText: { color: colors.paper, fontSize: 15, fontWeight: '900' },
  postAuthor: { flex: 1, minWidth: 0 },
  postName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  postMeta: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  postText: { marginTop: 12, color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  postImage: { marginTop: 10, width: '100%', height: 160, borderRadius: 16 },
  postTrack: { marginTop: 10, minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: 'rgba(23,19,19,0.055)', padding: 9 },
  postTrackCover: { width: 56, height: 56, borderRadius: 13 },
  postTrackCopy: { flex: 1, minWidth: 0 },
  postTrackTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  postTrackArtist: { marginTop: 3, color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  postPlay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  wave: { marginTop: 7, flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 18 },
  waveBar: { width: 5, borderRadius: 3, backgroundColor: 'rgba(115,87,198,0.42)' },
  postActions: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  postAction: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 17, backgroundColor: 'rgba(23,19,19,0.055)', paddingHorizontal: 10 },
  postActionActive: { backgroundColor: '#171313' },
  postActionText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  postActionTextActive: { color: colors.paper },
  emptyCommunity: { marginTop: 16, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12 },
  emptyCommunityTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  emptyCommunityText: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  emptyCommunityButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { api, type ApiTrack, type PopularUser } from "../services/api";
import { usePlayer } from "../contexts/PlayerContext";
import { useAuth } from "../contexts/AuthContext";
import { SynauraLogotype } from "../components/SynauraLogo";
import { ENV } from "../config/env";

const { width } = Dimensions.get("window");

const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

// ---------- ACCUEIL (inspiré web) ----------

type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  tag: string;
  actionLabel: string;
  actionType: "navigate" | "play";
  actionTarget?: string;
  track?: ApiTrack;
};

function assetUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${ENV.API_BASE_URL}${encodeURI(p)}`;
}

// ---------- PETITS COMPOSANTS ----------

type SectionHeaderProps = {
  icon?: React.ReactNode;
  title: string;
  action?: string;
  onActionPress?: () => void;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  action,
  onActionPress,
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      {icon}
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
    {action && (
      <Pressable onPress={onActionPress}>
        <Text style={styles.sectionHeaderAction}>{action}</Text>
      </Pressable>
    )}
  </View>
);

const Pill: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.pill}>
    <Text style={styles.pillText}>{label}</Text>
  </View>
);

type TrackCardProps = {
  title: string;
  artist: string;
  duration: string;
  coverUrl?: string | null;
  index?: number;
  onPlay?: () => void;
  onPress?: () => void;
  playing?: boolean;
  loading?: boolean;
};

const TrackCard: React.FC<TrackCardProps> = ({
  title,
  artist,
  duration,
  coverUrl,
  index,
  onPlay,
  onPress,
  playing,
  loading,
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={({ pressed }) => [
      styles.trackCard,
      pressed && onPress ? { transform: [{ scale: 0.98 }], opacity: 0.96 } : null,
    ]}
  >
    <View style={styles.trackCardImageWrapper}>
      <View style={styles.trackCardImage}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["rgba(139,92,246,0.7)", "rgba(56,189,248,0.7)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={["rgba(255,255,255,0.18)", "rgba(0,0,0,0.08)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {typeof index === "number" && (
        <View style={styles.trackIndexBadge}>
          <Text style={styles.trackIndexText}>#{index + 1}</Text>
        </View>
      )}
      <Pressable
        style={styles.trackPlayButton}
        onPress={(e) => {
          (e as any)?.stopPropagation?.();
          onPlay?.();
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={playing ? "Pause" : "Lecture"}
      >
        {loading ? (
          <ActivityIndicator color="#f9fafb" />
        ) : (
          <Ionicons name={playing ? "pause" : "play"} size={14} color="#f9fafb" />
        )}
      </Pressable>
    </View>
    <Text numberOfLines={1} style={styles.trackTitle}>
      {title}
    </Text>
    <Text numberOfLines={1} style={styles.trackArtist}>
      {artist}
    </Text>
    <View style={styles.trackMetaRow}>
      <Ionicons name="time-outline" size={11} color="#94a3b8" />
      <Text style={styles.trackDuration}>{duration}</Text>
    </View>
  </Pressable>
);

type CreatorCardProps = {
  name: string;
  username: string;
  plays: number;
  avatarUrl?: string | null;
  followers?: number;
  onPress?: () => void;
};

const CreatorCard: React.FC<CreatorCardProps> = ({
  name,
  username,
  plays,
  avatarUrl,
  followers,
  onPress,
}) => (
  <Pressable style={styles.creatorCard} onPress={onPress}>
    <View style={styles.creatorTopRow}>
      <View style={styles.creatorAvatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={styles.creatorAvatarText}>
            {(name || username || "?").charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.creatorInfo}>
        <Text numberOfLines={1} style={styles.creatorName}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.creatorUsername}>
          @{username}
        </Text>
        <Text style={styles.creatorPlays}>
          {plays.toLocaleString("fr-FR")} écoutes
        </Text>
        {typeof followers === "number" ? (
          <Text style={styles.creatorFollowers}>
            {followers.toLocaleString("fr-FR")} abonnés
          </Text>
        ) : null}
      </View>
    </View>
    <View style={styles.creatorButtonsRow}>
      <Pressable
        style={styles.creatorListenButton}
        onPress={(e) => {
          (e as any)?.stopPropagation?.();
        }}
      >
        <Ionicons name="play" size={12} color="#f9fafb" />
        <Text style={styles.creatorListenButtonText}>Écouter</Text>
      </Pressable>
      <Pressable
        style={styles.creatorFollowButton}
        onPress={(e) => {
          (e as any)?.stopPropagation?.();
        }}
      >
        <Text style={styles.creatorFollowButtonText}>Suivre</Text>
      </Pressable>
    </View>
  </Pressable>
);

const WeatherCard: React.FC = () => (
  <LinearGradient
    colors={[
      "rgba(59,130,246,0.25)",
      "rgba(56,189,248,0.25)",
      "rgba(37,99,235,0.25)",
    ]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.weatherCard}
  >
    <View style={styles.weatherLeft}>
      <View style={styles.weatherIconWrapper}>
        <Ionicons name="cloud-outline" size={18} color="#bae6fd" />
      </View>
      <View>
        <Text style={styles.weatherTitle}>Alertemps — Météo</Text>
        <Text style={styles.weatherSubtitle}>Ciel dégagé · Dunkerque</Text>
      </View>
    </View>
    <View style={styles.weatherRight}>
      <Text style={styles.weatherTemp}>18°C</Text>
      <Text style={styles.weatherUpdate}>Bulletin actualisé</Text>
    </View>
  </LinearGradient>
);

type RadioCardProps = {
  title: string;
  subtitle: string;
  accent?: string;
  logoUrl?: string;
  onPress?: () => void;
  /** false = problème serveur, afficher "Indisponible" et désactiver le bouton */
  available?: boolean;
};

const RadioCard: React.FC<RadioCardProps> = ({ title, subtitle, accent = "#6ee7b7", logoUrl, onPress, available = true }) => (
  <LinearGradient
    colors={[
      "rgba(79,70,229,0.4)",
      "rgba(192,38,211,0.35)",
      "rgba(14,165,233,0.3)",
    ]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.radioCard, !available && { opacity: 0.85 }]}
  >
    <View style={styles.radioLeft}>
      <View style={styles.radioIconWrapper}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={{ width: 32, height: 20 }} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name="radio-tower" size={20} color={accent} />
        )}
      </View>
      <View style={styles.radioTexts}>
        <Text numberOfLines={1} style={styles.radioTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.radioSubtitle}>
          {available ? subtitle : "Indisponible — Problème serveur"}
        </Text>
      </View>
    </View>
    <Pressable style={[styles.radioButton, !available && styles.radioButtonDisabled]} onPress={available ? onPress : undefined}>
      <Ionicons name="play" size={14} color="#f9fafb" />
      <Text style={styles.radioButtonText}>Écouter</Text>
    </Pressable>
  </LinearGradient>
);

const AlertempsCard: React.FC<{ onPress?: () => void }> = ({ onPress }) => (
  <Pressable style={styles.alertempsCard} onPress={onPress}>
    <LinearGradient
      colors={["rgba(30,64,175,0.55)", "rgba(14,165,233,0.35)", "rgba(6,182,212,0.18)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.alertempsInner}>
      <View style={styles.alertempsLeft}>
        <View style={styles.alertempsIcon}>
          <Ionicons name="cloud-outline" size={18} color="#e0f2fe" />
        </View>
        <View>
          <Text style={styles.alertempsTitle}>Alertemps</Text>
          <Text style={styles.alertempsSubtitle}>Prévisions détaillées</Text>
        </View>
      </View>
      <View style={styles.alertempsBtn}>
        <Text style={styles.alertempsBtnText}>Voir</Text>
        <Ionicons name="chevron-forward" size={16} color="#e0f2fe" />
      </View>
    </View>
  </Pressable>
);

const ContinueListening: React.FC<{
  track: ApiTrack;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onOpen: () => void;
}> = ({ track, isPlaying, isLoading, onToggle, onOpen }) => {
  const artistName = track.artist?.name || track.artist?.artistName || track.artist?.username || "Artiste";
  return (
    <Pressable style={styles.continueCard} onPress={onOpen}>
      <LinearGradient
        colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.continueRow}>
        <View style={styles.continueCover}>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.continueLabel}>Reprendre</Text>
          <Text numberOfLines={1} style={styles.continueTitle}>
            {track.title || "Piste"}
          </Text>
          <Text numberOfLines={1} style={styles.continueSubtitle}>
            {artistName}
          </Text>
        </View>
        <Pressable
          style={styles.continuePlayBtn}
          onPress={(e) => {
            (e as any)?.stopPropagation?.();
            onToggle();
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    </Pressable>
  );
};

const ShortcutButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  variant?: "primary" | "default";
}> = ({ icon, label, onPress, variant = "default" }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.shortcutBtn,
      variant === "primary" ? styles.shortcutBtnPrimary : null,
      pressed ? { transform: [{ scale: 0.98 }], opacity: 0.96 } : null,
    ]}
  >
    {icon}
    <Text style={styles.shortcutText}>{label}</Text>
  </Pressable>
);

const HeroCarouselMobile: React.FC<{
  slides: HeroSlide[];
  onAction: (slide: HeroSlide) => void;
}> = ({ slides, onAction }) => {
  const scrollRef = React.useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Progression rAF (comme le web)
  useEffect(() => {
    if (!slides.length) return;
    const DURATION = 5000;
    let raf = 0;
    let lastTs = 0;
    const tick = (ts: number) => {
      if (!lastTs) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;
      setProgress((p) => {
        const next = p + delta / DURATION;
        if (next >= 1) return 1;
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [slides.length]);

  useEffect(() => {
    if (progress < 1) return;
    const next = (index + 1) % slides.length;
    setIndex(next);
    setProgress(0);
    scrollRef.current?.scrollTo({ x: next * (width - 32), animated: true });
  }, [index, progress, slides.length]);

  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroProgressRow}>
        {slides.map((_, i) => (
          <View key={i} style={styles.heroProgressBar}>
            <View
              style={[
                styles.heroProgressFill,
                {
                  width:
                    i < index ? "100%" : i > index ? "0%" : `${Math.round(progress * 100)}%`,
                },
              ]}
            />
          </View>
        ))}
      </View>

      <ScrollView
        ref={(r) => {
          scrollRef.current = r;
        }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const idx = Math.round(x / Math.max(1, width - 32));
          if (Number.isFinite(idx)) {
            setIndex(Math.max(0, Math.min(slides.length - 1, idx)));
            setProgress(0);
          }
        }}
        style={styles.heroScroller}
      >
        {slides.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onAction(s)}
            style={styles.heroSlide}
          >
            {s.image ? (
              <Image source={{ uri: s.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : null}
            <LinearGradient
              colors={["rgba(0,0,0,0.10)", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.78)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroSlideContent}>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>{s.tag}</Text>
              </View>
              <View style={styles.heroSlideRow}>
                <View style={styles.heroIcon}>
                  <Ionicons
                    name={s.actionType === "play" ? "play" : "chevron-forward"}
                    size={18}
                    color="#e5e7eb"
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.heroTitle}>{s.title}</Text>
                  <Text style={styles.heroSubtitle}>{s.subtitle}</Text>
                </View>
              </View>
              <View style={styles.heroCtaRow}>
                <View style={styles.heroCtaBtn}>
                  <Ionicons name={s.actionType === "play" ? "play" : "open-outline"} size={14} color="#e5f4ff" />
                  <Text style={styles.heroCtaText}>{s.actionLabel}</Text>
                </View>
                <View style={styles.heroCtaHint}>
                  <Text style={styles.heroCtaHintText}>Swipe</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const LibraryGrid: React.FC<{ onOpen: (path: string) => void }> = ({ onOpen }) => (
  <View style={styles.libraryGrid}>
    <Pressable style={styles.libraryItem} onPress={() => onOpen("/library?tab=favorites")}>
      <View style={[styles.libraryIconWrapper, styles.libraryIconFavorites]}>
        <Ionicons name="heart-outline" size={16} color="#fecaca" />
      </View>
      <Text style={styles.libraryTitle}>Favoris</Text>
      <Text style={styles.librarySubtitle}>128 tracks</Text>
    </Pressable>
    <Pressable style={styles.libraryItem} onPress={() => onOpen("/library?tab=playlists")}>
      <View style={[styles.libraryIconWrapper, styles.libraryIconPlaylists]}>
        <Ionicons name="disc-outline" size={16} color="#ddd6fe" />
      </View>
      <Text style={styles.libraryTitle}>Playlists</Text>
      <Text style={styles.librarySubtitle}>7 dossiers</Text>
    </Pressable>
    <Pressable style={styles.libraryItem} onPress={() => onOpen("/library?tab=recent")}>
      <View style={[styles.libraryIconWrapper, styles.libraryIconHistory]}>
        <Ionicons name="time-outline" size={16} color="#a5f3fc" />
      </View>
      <Text style={styles.libraryTitle}>Historique</Text>
      <Text style={styles.librarySubtitle}>Récemment écoutés</Text>
    </Pressable>
    <Pressable style={styles.libraryItem} onPress={() => onOpen("/ai-library")}>
      <View style={[styles.libraryIconWrapper, styles.libraryIconIA]}>
        <Ionicons name="sparkles-outline" size={16} color="#e0e7ff" />
      </View>
      <Text style={styles.libraryTitle}>Générations IA</Text>
      <Text style={styles.librarySubtitle}>34 créations</Text>
    </Pressable>
  </View>
);

// ---------- HOME SCREEN PRINCIPAL ----------

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { current, isPlaying, isLoading, playTrack, togglePlayPause, setQueueAndPlay } = usePlayer();

  const [featuredTracks, setFeaturedTracks] = useState<ApiTrack[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [forYouFeed, setForYouFeed] = useState<ApiTrack[]>([]);
  const [forYouLoading, setForYouLoading] = useState(true);
  const [forYouError, setForYouError] = useState<string | null>(null);

  const [recentTracks, setRecentTracks] = useState<ApiTrack[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

  const [trendingTracks, setTrendingTracks] = useState<ApiTrack[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  const [newUsers, setNewUsers] = useState<PopularUser[]>([]);
  const [newUsersLoading, setNewUsersLoading] = useState(true);
  const [newUsersError, setNewUsersError] = useState<string | null>(null);

  type SuggestedCreator = {
    _id: string;
    username: string;
    name: string;
    avatar?: string | null;
    totalPlays: number;
    tracks: ApiTrack[];
  };
  const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [suggestedError, setSuggestedError] = useState<string | null>(null);

  const [mixxRadioTitle, setMixxRadioTitle] = useState("EDM, remixes et sets non-stop");
  const [ximamRadioTitle, setXimamRadioTitle] = useState("Sélections & nouveautés");
  const [mixxRadioAvailable, setMixxRadioAvailable] = useState(true);
  const [ximamRadioAvailable, setXimamRadioAvailable] = useState(true);

  const goPlaceholder = useCallback(
    (screen: string, title: string, subtitle: string) => {
      navigation.navigate(screen, { title, subtitle });
    },
    [navigation]
  );

  const loadFeatured = useCallback(async () => {
    setFeaturedLoading(true);
    const r = await api.getFeaturedTracks(10);
    if (!r.success) {
      setFeaturedTracks([]);
      setFeaturedLoading(false);
      return;
    }
    setFeaturedTracks(r.data.tracks || []);
    setFeaturedLoading(false);
  }, []);

  const loadForYou = useCallback(async () => {
    setForYouLoading(true);
    setForYouError(null);
    const r = await api.getForYouFeed(30, true);
    if (!r.success) {
      setForYouError(r.error);
      setForYouFeed([]);
      setForYouLoading(false);
      return;
    }
    setForYouFeed(r.data.tracks || []);
    setForYouLoading(false);
  }, []);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    const r = await api.getRecentTracks(24);
    if (!r.success) {
      setRecentError(r.error);
      setRecentTracks([]);
      setRecentLoading(false);
      return;
    }
    setRecentTracks(r.data.tracks || []);
    setRecentLoading(false);
  }, []);

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    setTrendingError(null);
    const r = await api.getTrendingTracks(24);
    if (!r.success) {
      setTrendingError(r.error);
      setTrendingTracks([]);
      setTrendingLoading(false);
      return;
    }
    setTrendingTracks(r.data.tracks || []);
    setTrendingLoading(false);
  }, []);

  const loadNewUsers = useCallback(async () => {
    setNewUsersLoading(true);
    setNewUsersError(null);
    const r = await api.getNewUsers(12);
    if (!r.success) {
      setNewUsersError(r.error);
      setNewUsers([]);
      setNewUsersLoading(false);
      return;
    }
    setNewUsers(r.data.users || []);
    setNewUsersLoading(false);
  }, []);

  const loadSuggestedCreators = useCallback(async () => {
    setSuggestedLoading(true);
    setSuggestedError(null);
    const r = await api.getTracks(100);
    if (!r.success) {
      setSuggestedError(r.error);
      setSuggestedCreators([]);
      setSuggestedLoading(false);
      return;
    }
    const tracks = r.data.tracks || [];
    const map = new Map<string, SuggestedCreator>();
    tracks.forEach((t) => {
      const id = t.artist?._id;
      if (!id) return;
      const username = t.artist?.username || "";
      const name = t.artist?.name || t.artist?.artistName || username || "Créateur";
      const prev = map.get(id);
      if (!prev) {
        map.set(id, {
          _id: id,
          username,
          name,
          avatar: t.artist?.avatar || null,
          totalPlays: 0,
          tracks: [t],
        });
      } else {
        prev.tracks.push(t);
      }
    });
    const list = Array.from(map.values())
      .filter((c) => (c.tracks?.length || 0) >= 3)
      .map((c) => ({
        ...c,
        totalPlays: (c.tracks || []).reduce((sum, tt) => sum + (tt.plays || 0), 0),
      }))
      .sort((a, b) => (b.totalPlays || 0) - (a.totalPlays || 0))
      .slice(0, 8);
    setSuggestedCreators(list);
    setSuggestedLoading(false);
  }, []);

  useEffect(() => {
    loadFeatured();
    loadForYou();
    loadRecent();
    loadTrending();
    loadNewUsers();
    loadSuggestedCreators();
  }, [loadFeatured, loadForYou, loadNewUsers, loadRecent, loadSuggestedCreators, loadTrending]);

  // Radio metadata (poll léger, comme web)
  useEffect(() => {
    let mounted = true;
    let interval: any = null;

    const fetchOnce = async () => {
      const [mixx, ximam] = await Promise.all([api.getRadioStatus("mixx_party"), api.getRadioStatus("ximam")]);
      if (!mounted) return;
      if (mixx.success && mixx.data?.success && mixx.data?.data?.currentTrack?.title) {
        const t = `${mixx.data.data.currentTrack.artist} — ${mixx.data.data.currentTrack.title}`.trim();
        setMixxRadioTitle(t || mixxRadioTitle);
      }
      setMixxRadioAvailable(mixx.success && mixx.data ? mixx.data.available !== false : false);
      if (ximam.success && ximam.data?.success && ximam.data?.data?.currentTrack?.title) {
        const t = `${ximam.data.data.currentTrack.artist} — ${ximam.data.data.currentTrack.title}`.trim();
        setXimamRadioTitle(t || ximamRadioTitle);
      }
      setXimamRadioAvailable(ximam.success && ximam.data ? ximam.data.available !== false : false);
    };

    fetchOnce().catch(() => {});
    interval = setInterval(() => fetchOnce().catch(() => {}), 15000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forYouTracks = useMemo(
    () => (forYouFeed.length ? forYouFeed.slice(0, 12) : recentTracks.slice(0, 12)),
    [forYouFeed, recentTracks]
  );
  const trendingList = useMemo(() => trendingTracks.slice(0, 12), [trendingTracks]);
  const newTracks = useMemo(() => recentTracks.slice().reverse().slice(0, 12), [recentTracks]);

  const heroSlides: HeroSlide[] = useMemo(() => {
    const slides: HeroSlide[] = [
      {
        id: "meteo",
        title: "Météo Alertemps sur Synaura",
        subtitle: "Bulletin météo professionnel par Alertemps",
        image: assetUrl("/meteocaroussel.webp"),
        tag: "Bulletin météo",
        actionLabel: "Voir la météo",
        actionType: "navigate",
        actionTarget: "Meteo",
      },
      {
        id: "subscriptions",
        title: "Débloquez tout Synaura",
        subtitle: "Accédez à toutes les fonctionnalités premium",
        image: assetUrl("/fe904850-2547-4e2e-8cc3-085a7704488b.webp"),
        tag: "Offre Premium",
        actionLabel: "Voir les abonnements",
        actionType: "navigate",
        actionTarget: "Premium",
      },
      {
        id: "ai",
        title: "Générateur de Musique IA",
        subtitle: "Créez de la musique unique avec l'IA",
        image: assetUrl(
          "/DALL·E 2025-09-26 23.14.53 - A minimalist, abstract landscape-format illustration symbolizing AI-generated music. The image features a stylized humanoid head made of flowing digit.webp"
        ),
        tag: "IA Musicale",
        actionLabel: "Ouvrir le studio",
        actionType: "navigate",
        actionTarget: "Studio",
      },
    ];

    if (featuredTracks.length) {
      featuredTracks.slice(0, 5).forEach((t) => {
        slides.push({
          id: t._id,
          title: t.title,
          subtitle: t.artist?.name || t.artist?.username || "Artiste",
          image: t.coverUrl || undefined,
          tag: "En vedette",
          actionLabel: "Écouter",
          actionType: "play",
          track: t,
        });
      });
    }
    return slides;
  }, [featuredTracks]);

  const openPlayer = useCallback(
    (list: ApiTrack[], index: number, title: string) => {
      const parent = navigation.getParent?.();
      setQueueAndPlay(list, index).catch(() => {});
      (parent || navigation).navigate("Player", { tracks: list, startIndex: index, title });
    },
    [navigation, setQueueAndPlay]
  );

  const radioMixx: ApiTrack = useMemo(
    () => ({
      _id: "radio-mixx-party",
      title: mixxRadioTitle,
      artist: { _id: "mixxparty", username: "mixxparty", name: "Mixx Party" },
      audioUrl: "https://stream.mixx-party.fr/listen/mixx_party/radio.mp3",
      coverUrl: assetUrl("/mixxparty1.png"),
      duration: 0,
    }),
    [mixxRadioTitle]
  );

  const radioXimam: ApiTrack = useMemo(
    () => ({
      _id: "radio-ximam",
      title: ximamRadioTitle,
      artist: { _id: "ximam", username: "ximam", name: "XimaM" },
      audioUrl: "https://stream.mixx-party.fr/listen/ximam/radio.mp3",
      coverUrl: assetUrl("/ximam-radio-x.svg"),
      duration: 0,
    }),
    [ximamRadioTitle]
  );

  return (
    <View style={styles.screen}>
      {/* Fond global */}
      <LinearGradient
        colors={["#020017", "#05010b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backgroundGrid} />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <View style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Accueil</Text>
            <SynauraLogotype height={22} />
          </View>
          <Pressable
            style={styles.headerButton}
            onPress={() => {
              const root = navigation.getParent();
              if (user) {
                navigation.navigate("Studio");
              } else {
                root?.navigate("Login");
              }
            }}
          >
            <Text style={styles.headerButtonText}>{user ? "Studio IA" : "Se connecter"}</Text>
          </Pressable>
        </View>

        {/* Barre de recherche + filtres */}
        <View style={styles.searchSection}>
          <Pressable
            style={styles.searchBar}
            onPress={() => navigation.navigate("Search", { autoFocus: true })}
            accessibilityRole="button"
            accessibilityLabel="Rechercher"
          >
            <Ionicons name="search" size={14} color="#94a3b8" />
            <Text style={styles.searchPlaceholder}>
              Rechercher un son, un créateur...
            </Text>
          </Pressable>
          <Pressable style={styles.iconSmallButton}>
            <Ionicons name="headset-outline" size={16} color="#e5e7eb" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[
            styles.mainScrollContent,
            current ? { paddingBottom: 220 } : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillsRow}
            contentContainerStyle={styles.pillsRowContent}
          >
            <Pill label="Pour toi" />
            <Pill label="Tendances" />
            <Pill label="Nouveaux" />
            <Pill label="Radio" />
            <Pill label="Météo" />
          </ScrollView>

          {/* Reprendre */}
          {current ? (
            <ContinueListening
              track={current}
              isPlaying={isPlaying}
              isLoading={isLoading}
              onToggle={() => togglePlayPause()}
              onOpen={() => openPlayer([current], 0, "Lecture en cours")}
            />
          ) : null}

          {/* Hero (carousel type web) */}
          <HeroCarouselMobile
            slides={heroSlides}
            onAction={(slide) => {
              if (slide.actionType === "play" && slide.track) {
                playTrack(slide.track);
                openPlayer([slide.track], 0, "En vedette");
                return;
              }
              if (slide.actionType === "navigate") {
                if (slide.actionTarget === "Studio") {
                  navigation.navigate("Studio");
                  return;
                }
                if (slide.actionTarget) {
                  goPlaceholder(
                    slide.actionTarget,
                    slide.title,
                    slide.actionTarget === "Premium"
                      ? "Abonnements premium (écran mobile en cours)."
                      : slide.actionTarget === "Meteo"
                      ? "Météo Alertemps (écran mobile en cours)."
                      : "Cette section arrive sur mobile."
                  );
                  return;
                }
              }
            }}
          />

          {/* Raccourcis (comme web) */}
          <View style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="grid-outline" size={16} color="#bfdbfe" />}
              title="Raccourcis"
            />
            <View style={styles.shortcutsGrid}>
              <ShortcutButton
                icon={<Ionicons name="gift-outline" size={16} color="#e5e7eb" />}
                label="Boosters"
                onPress={() => goPlaceholder("Boosters", "Boosters", "Boosters & missions (mobile en cours).")}
              />
              <ShortcutButton
                icon={<Ionicons name="people-outline" size={16} color="#e5e7eb" />}
                label="Communauté"
                onPress={() => goPlaceholder("Community", "Communauté", "Forum & FAQ (mobile en cours).")}
              />
              <ShortcutButton
                icon={<Ionicons name="library-outline" size={16} color="#e5e7eb" />}
                label="Bibliothèque"
                onPress={() => goPlaceholder("Library", "Bibliothèque", "Favoris, playlists, historique (mobile en cours).")}
              />
              <ShortcutButton
                icon={<Ionicons name="trending-up-outline" size={16} color="#e5e7eb" />}
                label="Trending"
                onPress={() => navigation.navigate("Trending")}
              />
              <ShortcutButton
                icon={<Ionicons name="sparkles-outline" size={16} color="#e5e7eb" />}
                label="Swipe"
                onPress={() => {
                  const parent = navigation.getParent?.();
                  (parent || navigation).navigate("Player", { source: "forYou", title: "Swipe" });
                }}
              />
              <ShortcutButton
                icon={<Ionicons name="cloud-upload-outline" size={16} color="#e5e7eb" />}
                label="Uploader"
                onPress={() => goPlaceholder("Upload", "Uploader", "Upload de pistes (mobile en cours).")}
              />
              <ShortcutButton
                icon={<Ionicons name="diamond-outline" size={16} color="#e5e7eb" />}
                label="Premium"
                variant="primary"
                onPress={() => goPlaceholder("Premium", "Premium", "Abonnements premium (mobile en cours).")}
              />
            </View>
          </View>

          {/* Radio + Météo widgets */}
          <View style={styles.widgetsGrid}>
            <RadioCard
              title="Mixx Party — Radio en direct"
              subtitle={mixxRadioTitle}
              logoUrl={assetUrl("/mixxpartywhitelog.png")}
              available={mixxRadioAvailable}
              onPress={() => {
                if (!mixxRadioAvailable) return;
                if (current?._id === radioMixx._id) togglePlayPause();
                else playTrack(radioMixx);
                openPlayer([radioMixx], 0, "Radio — Mixx Party");
              }}
            />
            <RadioCard
              title="XimaM — Radio en direct"
              subtitle={ximamRadioTitle}
              accent="#fca5a5"
              logoUrl={assetUrl("/ximam-radio-x.svg")}
              available={ximamRadioAvailable}
              onPress={() => {
                if (!ximamRadioAvailable) return;
                if (current?._id === radioXimam._id) togglePlayPause();
                else playTrack(radioXimam);
                openPlayer([radioXimam], 0, "Radio — XimaM");
              }}
            />
            <Pressable onPress={() => goPlaceholder("Meteo", "Alertemps — Météo", "Météo mobile (en cours).")}>
              <WeatherCard />
            </Pressable>
            <AlertempsCard onPress={() => goPlaceholder("Meteo", "Alertemps", "Prévisions détaillées (mobile en cours).")} />
          </View>

          {/* Pour toi */}
          <View style={styles.section}>
            <SectionHeader
              icon={
                <Ionicons name="sparkles-outline" size={16} color="#e9d5ff" />
              }
              title="Pour toi"
              action="Tout voir"
              onActionPress={() => navigation.navigate("ForYou")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {forYouLoading ? (
                <View style={{ paddingVertical: 18, paddingHorizontal: 12 }}>
                  <ActivityIndicator color="#c7d2fe" />
                </View>
              ) : forYouError ? (
                <Pressable
                  onPress={loadForYou}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: "rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>
                    Impossible de charger
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 }}>
                    Appuie pour réessayer
                  </Text>
                </Pressable>
              ) : (
                forYouTracks.map((t, idx) => {
                  const artistName = t.artist?.name || t.artist?.artistName || t.artist?.username || "Artiste";
                  const isThis = current?._id === t._id;
                  return (
                    <TrackCard
                      key={t._id}
                      title={t.title}
                      artist={artistName}
                      duration={formatDuration(t.duration)}
                      coverUrl={t.coverUrl}
                      onPlay={() => playTrack(t)}
                      onPress={() => openPlayer(forYouTracks, idx, "Pour toi")}
                      playing={isThis && isPlaying}
                      loading={isThis && isLoading}
                    />
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Les plus écoutées */}
          <View style={styles.section}>
            <SectionHeader
              icon={
                <Ionicons name="trending-up-outline" size={16} color="#bfdbfe" />
              }
              title="Les plus écoutées"
              action="Top 50"
              onActionPress={() => navigation.navigate("Trending")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {trendingLoading ? (
                <View style={{ paddingVertical: 18, paddingHorizontal: 12 }}>
                  <ActivityIndicator color="#c7d2fe" />
                </View>
              ) : trendingError ? (
                <Pressable
                  onPress={loadTrending}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: "rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>
                    Impossible de charger
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 }}>
                    Appuie pour réessayer
                  </Text>
                </Pressable>
              ) : (
                trendingList.map((t, idx) => {
                  const artistName = t.artist?.name || t.artist?.artistName || t.artist?.username || "Artiste";
                  const isThis = current?._id === t._id;
                  return (
                    <TrackCard
                      key={t._id}
                      title={t.title}
                      artist={artistName}
                      duration={formatDuration(t.duration)}
                      coverUrl={t.coverUrl}
                      index={idx}
                      onPlay={() => playTrack(t)}
                      onPress={() => openPlayer(trendingList, idx, "Les plus écoutées")}
                      playing={isThis && isPlaying}
                      loading={isThis && isLoading}
                    />
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Nouveaux créateurs (comme web: /api/users triés récent) */}
          <View style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="people-outline" size={16} color="#c4b5fd" />}
              title="Nouveaux créateurs"
              action="Explorer"
              onActionPress={() => goPlaceholder("Community", "Découvrir", "Découverte créateurs (mobile en cours).")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {newUsersLoading ? (
                <View style={{ paddingVertical: 18, paddingHorizontal: 12 }}>
                  <ActivityIndicator color="#c7d2fe" />
                </View>
              ) : newUsersError ? (
                <Pressable
                  onPress={loadNewUsers}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: "rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>
                    Impossible de charger
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 }}>
                    Appuie pour réessayer
                  </Text>
                </Pressable>
              ) : (
                newUsers.map((u) => {
                  const name = u.artistName || u.name || u.username;
                  return (
                    <CreatorCard
                      key={u._id}
                      name={name}
                      username={u.username}
                      plays={u.totalPlays || 0}
                      followers={u.followerCount}
                      avatarUrl={u.avatar}
                      onPress={() => navigation.navigate("Search", { initialQuery: u.username || name, filter: "artists" })}
                    />
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Créateurs suggérés (comme web: groupés depuis /api/tracks) */}
          <View style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="star-outline" size={16} color="#fde68a" />}
              title="Créateurs suggérés"
              action="Actualiser"
              onActionPress={loadSuggestedCreators}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {suggestedLoading ? (
                <View style={{ paddingVertical: 18, paddingHorizontal: 12 }}>
                  <ActivityIndicator color="#c7d2fe" />
                </View>
              ) : suggestedError ? (
                <Pressable
                  onPress={loadSuggestedCreators}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: "rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>
                    Impossible de charger
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 }}>
                    Appuie pour réessayer
                  </Text>
                </Pressable>
              ) : (
                suggestedCreators.map((c) => {
                  const top3 = (c.tracks || []).slice(0, 3);
                  return (
                    <Pressable
                      key={c._id}
                      style={styles.suggestedCreatorCard}
                      onPress={() => navigation.navigate("Search", { initialQuery: c.username || c.name, filter: "artists" })}
                    >
                      <View style={styles.suggestedTopRow}>
                        <View style={styles.suggestedAvatar}>
                          {c.avatar ? (
                            <Image source={{ uri: c.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          ) : (
                            <Text style={styles.suggestedAvatarText}>{(c.name || "?").charAt(0).toUpperCase()}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={styles.suggestedName}>{c.name}</Text>
                          <Text numberOfLines={1} style={styles.suggestedPlays}>
                            {c.totalPlays.toLocaleString("fr-FR")} écoutes
                          </Text>
                        </View>
                      </View>

                      <View style={styles.suggestedCoversRow}>
                        {top3.map((t) => (
                          <View key={t._id} style={styles.suggestedCover}>
                            {t.coverUrl ? (
                              <Image source={{ uri: t.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                            ) : (
                              <LinearGradient
                                colors={["rgba(139,92,246,0.55)", "rgba(56,189,248,0.35)"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                              />
                            )}
                          </View>
                        ))}
                      </View>

                      <View style={styles.suggestedButtonsRow}>
                        <Pressable
                          style={styles.suggestedListenBtn}
                          onPress={(e) => {
                            (e as any)?.stopPropagation?.();
                            const list = c.tracks || [];
                            if (!list.length) return;
                            openPlayer(list, 0, `Créateur: ${c.name}`);
                          }}
                        >
                          <Ionicons name="play" size={12} color="#f9fafb" />
                          <Text style={styles.suggestedListenText}>Écouter</Text>
                        </Pressable>
                        <Pressable
                          style={styles.suggestedFollowBtn}
                          onPress={(e) => {
                            (e as any)?.stopPropagation?.();
                          }}
                        >
                          <Text style={styles.suggestedFollowText}>Suivre</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Ta bibliothèque */}
          <View style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="library-outline" size={16} color="#a5b4fc" />}
              title="Ta bibliothèque"
              action="Gérer"
              onActionPress={() => goPlaceholder("Library", "Bibliothèque", "Gestion de bibliothèque (mobile en cours).")}
            />
            <LibraryGrid
              onOpen={(path) => {
                // pas de web: on route vers la bibliothèque mobile (placeholder pour l’instant)
                goPlaceholder("Library", "Bibliothèque", `Section: ${path}`);
              }}
            />
          </View>

          {/* Nouvelles musiques */}
          <View style={[styles.section, { paddingBottom: 16 }]}>
            <SectionHeader
              icon={<Ionicons name="musical-notes-outline" size={16} color="#bfdbfe" />}
              title="Nouvelles musiques"
              action="Tout voir"
              onActionPress={() => goPlaceholder("Community", "Découvrir", "Nouveautés & découverte (mobile en cours).")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {recentLoading ? (
                <View style={{ paddingVertical: 18, paddingHorizontal: 12 }}>
                  <ActivityIndicator color="#c7d2fe" />
                </View>
              ) : recentError ? (
                <Pressable
                  onPress={loadRecent}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: "rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>
                    Impossible de charger
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 }}>
                    Appuie pour réessayer
                  </Text>
                </Pressable>
              ) : (
                newTracks.map((t, idx) => {
                    const artistName = t.artist?.name || t.artist?.artistName || t.artist?.username || "Artiste";
                    const isThis = current?._id === t._id;
                    return (
                      <TrackCard
                        key={`new-${t._id}`}
                        title={t.title}
                        artist={artistName}
                        duration={formatDuration(t.duration)}
                        coverUrl={t.coverUrl}
                        onPlay={() => playTrack(t)}
                        onPress={() => openPlayer(newTracks, idx, "Nouvelles musiques")}
                        playing={isThis && isPlaying}
                        loading={isThis && isLoading}
                      />
                    );
                  })
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default HomeScreen;

// ---------- STYLES ----------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020017",
  },
  safeArea: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  backgroundGrid: {
    position: "absolute",
    inset: 0,
    opacity: 0.14,
    backgroundColor: "transparent",
    backgroundRepeat: "repeat",
  } as any, // RN ne gère pas les backgroundImage, mais on garde l'idée visuelle
  backgroundGlowTop: {
    position: "absolute",
    top: -120,
    left: -80,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 999,
    backgroundColor: "rgba(139,92,246,0.55)",
    opacity: 0.7,
    filter: "blur(60px)" as any,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -120,
    right: -80,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.5)",
    opacity: 0.7,
    filter: "blur(60px)" as any,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.2)",
    backgroundColor: "rgba(15,23,42,0.8)",
  },
  headerButtonText: {
    fontSize: 11,
    color: "#f9fafb",
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 6,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  searchPlaceholder: {
    fontSize: 12,
    color: "#94a3b8",
  },
  iconSmallButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    backgroundColor: "rgba(15,23,42,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainScroll: {
    flex: 1,
    marginTop: 4,
  },
  mainScrollContent: {
    paddingBottom: 80,
  },
  pillsRow: {
    marginBottom: 8,
  },
  pillsRowContent: {
    gap: 6,
    paddingRight: 16,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.8)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  pillText: {
    fontSize: 11,
    color: "#e5e7eb",
  },

  // ---- Hero carousel (mobile, inspiré web) ----
  heroWrap: {
    marginBottom: 10,
  },
  heroProgressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  heroProgressBar: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroProgressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  heroScroller: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.15)",
  },
  heroSlide: {
    width: width - 32,
    height: 190,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: "space-between",
  },
  heroSlideContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  heroSlideRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  heroIcon: {
    height: 36,
    width: 36,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  heroCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.35)",
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  heroCtaText: {
    fontSize: 11,
    color: "#e5f4ff",
    fontWeight: "700",
  },
  heroCtaHint: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.22)",
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  heroCtaHintText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "700",
  },

  // ---- Continue listening ----
  continueCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.12)",
    backgroundColor: "rgba(15,23,42,0.7)",
    padding: 12,
    marginBottom: 10,
  },
  continueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  continueCover: {
    height: 46,
    width: 46,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  continueLabel: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)",
    fontWeight: "800",
  },
  continueTitle: { color: "#f9fafb", fontWeight: "900", fontSize: 13, marginTop: 2 },
  continueSubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
  continuePlayBtn: {
    height: 44,
    width: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,0.9)",
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.25)",
  },

  // ---- Shortcuts ----
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  shortcutBtn: {
    flexBasis: (width - 16 * 2 - 8) / 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  shortcutBtnPrimary: {
    backgroundColor: "rgba(139,92,246,0.85)",
    borderColor: "rgba(236,72,153,0.25)",
  },
  shortcutText: {
    color: "#e5e7eb",
    fontWeight: "800",
    fontSize: 12,
  },
  heroSection: {
    marginBottom: 10,
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.15)",
  },
  heroBackground: {
    width: "100%",
    height: 190,
    padding: 0,
  },
  heroContent: {
    position: "absolute",
    inset: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: "space-between",
  },
  heroTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
  },
  heroTagText: {
    fontSize: 10,
    color: "#f9fafb",
  },
  heroTagSecondary: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(15,23,42,0.65)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.2)",
  },
  heroTagSecondaryText: {
    fontSize: 10,
    color: "#e5e7eb",
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 11,
    color: "#e0f2fe",
  },
  heroButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  heroPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.35)",
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  heroPrimaryButtonText: {
    fontSize: 11,
    color: "#e5f4ff",
  },
  heroSecondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  heroSecondaryButtonText: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  widgetsGrid: {
    gap: 8,
    marginBottom: 10,
  },
  alertempsCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.2)",
  },
  alertempsInner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertempsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertempsIcon: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.7)",
  },
  alertempsTitle: { fontSize: 12, fontWeight: "700", color: "#f9fafb" },
  alertempsSubtitle: { fontSize: 11, color: "rgba(224,242,254,0.9)" },
  alertempsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.35)",
    backgroundColor: "rgba(15,23,42,0.75)",
  },
  alertempsBtnText: { fontSize: 11, color: "#e0f2fe", fontWeight: "800" },
  radioCard: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  radioLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  radioIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioTexts: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9fafb",
  },
  radioSubtitle: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.35)",
    backgroundColor: "rgba(15,23,42,0.75)",
  },
  radioButtonDisabled: {
    opacity: 0.5,
  },
  radioButtonText: {
    fontSize: 11,
    color: "#f9fafb",
  },
  weatherCard: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.2)",
  },
  weatherLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weatherIconWrapper: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.7)",
  },
  weatherTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9fafb",
  },
  weatherSubtitle: {
    fontSize: 11,
    color: "#e0f2fe",
  },
  weatherRight: {
    alignItems: "flex-end",
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f9fafb",
  },
  weatherUpdate: {
    fontSize: 10,
    color: "#e0f2fe",
  },
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  sectionHeaderAction: {
    fontSize: 11,
    color: "#94a3b8",
  },
  horizontalList: {
    paddingRight: 16,
    gap: 8,
  },
  trackCard: {
    width: 130,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 8,
  },
  trackCardImageWrapper: {
    position: "relative",
    marginBottom: 6,
  },
  trackCardImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  trackCardGlow: {
    flex: 1,
    borderRadius: 12,
  },
  trackIndexBadge: {
    position: "absolute",
    top: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.7)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.3)",
  },
  trackIndexText: {
    fontSize: 10,
    color: "#f9fafb",
  },
  trackPlayButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  trackTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9fafb",
  },
  trackArtist: {
    fontSize: 11,
    color: "#94a3b8",
  },
  trackMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  trackDuration: {
    fontSize: 10,
    color: "#94a3b8",
  },
  creatorCard: {
    width: 180,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 10,
  },
  creatorTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,51,234,0.7)",
    overflow: "hidden",
  },
  creatorAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9fafb",
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f9fafb",
  },
  creatorUsername: {
    fontSize: 11,
    color: "#94a3b8",
  },
  creatorPlays: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  creatorFollowers: {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    marginTop: 1,
  },
  creatorButtonsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  creatorListenButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.35)",
    backgroundColor: "rgba(147,51,234,0.7)",
  },
  creatorListenButtonText: {
    fontSize: 11,
    color: "#f9fafb",
  },
  creatorFollowButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
    backgroundColor: "rgba(15,23,42,0.8)",
  },
  creatorFollowButtonText: {
    fontSize: 11,
    color: "#e5e7eb",
  },

  // ---- Suggested creators (cards type web) ----
  suggestedCreatorCard: {
    width: 210,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 10,
  },
  suggestedTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  suggestedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,51,234,0.7)",
  },
  suggestedAvatarText: {
    color: "#f9fafb",
    fontWeight: "800",
    fontSize: 16,
  },
  suggestedName: {
    color: "#f9fafb",
    fontWeight: "800",
    fontSize: 13,
  },
  suggestedPlays: {
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  suggestedCoversRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  suggestedCover: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  suggestedButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  suggestedListenBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.85)",
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.25)",
  },
  suggestedListenText: {
    color: "#f9fafb",
    fontWeight: "900",
    fontSize: 12,
  },
  suggestedFollowBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  suggestedFollowText: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "800",
    fontSize: 12,
  },

  libraryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  libraryItem: {
    flexBasis: (width - 16 * 2 - 8) / 2,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 10,
  },
  libraryIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  libraryIconFavorites: {
    backgroundColor: "rgba(248,113,113,0.2)",
  },
  libraryIconPlaylists: {
    backgroundColor: "rgba(129,140,248,0.25)",
  },
  libraryIconHistory: {
    backgroundColor: "rgba(34,211,238,0.25)",
  },
  libraryIconIA: {
    backgroundColor: "rgba(147,51,234,0.25)",
  },
  libraryTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  librarySubtitle: {
    fontSize: 10,
    color: "#94a3b8",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.9)",
    backgroundColor: "rgba(15,23,42,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomNavItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bottomNavItemActive: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bottomNavIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNavIconActive: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.9)",
    backgroundColor: "rgba(129,140,248,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNavLabel: {
    fontSize: 10,
    color: "#94a3b8",
  },
  bottomNavLabelActive: {
    fontSize: 10,
    color: "#e5e7eb",
  },
});

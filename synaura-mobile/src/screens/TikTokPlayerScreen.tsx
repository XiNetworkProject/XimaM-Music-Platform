import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  FlatList,
  type ListRenderItemInfo,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ApiTrack } from "../services/api";
import { usePlayer } from "../contexts/PlayerContext";

type RouteParams = {
  tracks?: ApiTrack[];
  startIndex?: number;
  title?: string;
  source?: "queue" | "forYou";
  initialTrackId?: string;
};

const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

function TrackSlide({
  track,
  isActive,
  onTogglePlay,
  isPlaying,
  isLoading,
  bottomInset,
  progressPct,
}: {
  track: ApiTrack;
  isActive: boolean;
  onTogglePlay: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  bottomInset: number;
  progressPct: number;
}) {
  const artistName = track.artist?.name || track.artist?.artistName || track.artist?.username || "Artiste";
  return (
    <View style={styles.slide}>
      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        {track.coverUrl ? (
          <Image source={{ uri: track.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["#0b0630", "#07102a", "#05010b"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* overlays */}
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.7)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Center play/pause */}
      <Pressable
        onPress={onTogglePlay}
        style={({ pressed }) => [
          styles.centerButton,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause" : "Lecture"}
      >
        {isLoading ? (
          <ActivityIndicator color="#f9fafb" />
        ) : (
          <Ionicons name={isPlaying ? "pause" : "play"} size={34} color="#f9fafb" />
        )}
      </Pressable>

      {/* Bottom meta */}
      <View style={[styles.bottomMeta, { paddingBottom: 18 + Math.max(0, bottomInset) }]}>
        {/* Seekbar (VISUELLE) — pointerEvents none pour ne pas bloquer le swipe */}
        <View style={styles.seekWrap} pointerEvents="none">
          <View style={styles.seekTrack}>
            <View style={[styles.seekFill, { width: `${Math.round(progressPct * 100)}%` }]} />
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={2} style={styles.trackTitle}>
              {track.title || "Piste"}
            </Text>
            <Text numberOfLines={1} style={styles.trackArtist}>
              {artistName}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.65)" />
              <Text style={styles.metaText}>{formatDuration(track.duration || 0)}</Text>
              {typeof track.plays === "number" ? (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{track.plays.toLocaleString("fr-FR")} écoutes</Text>
                </>
              ) : null}
            </View>
          </View>

          {/* Right actions (v1: placeholders) */}
          <View style={styles.actionsCol} pointerEvents="box-none">
            <Pressable style={styles.actionBtn} accessibilityRole="button" accessibilityLabel="J’aime (bientôt)">
              <Ionicons name="heart-outline" size={22} color="#f9fafb" />
            </Pressable>
            <Pressable style={styles.actionBtn} accessibilityRole="button" accessibilityLabel="Commenter (bientôt)">
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#f9fafb" />
            </Pressable>
            <Pressable style={styles.actionBtn} accessibilityRole="button" accessibilityLabel="Partager (bientôt)">
              <Ionicons name="share-social-outline" size={22} color="#f9fafb" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function TikTokPlayerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const listRef = useRef<FlatList<ApiTrack> | null>(null);

  const { current, queue, currentIndex, isPlaying, isLoading, setQueueAndPlay, togglePlayPause } = usePlayer();

  const params: RouteParams = route?.params || {};
  const source = params.source || "queue";
  const title = params.title || (source === "forYou" ? "Swipe" : "Lecture");
  const initialTrackId = params.initialTrackId || params.initialTrackId === "" ? params.initialTrackId : undefined;

  const [tracks, setTracks] = useState<ApiTrack[]>(() => (Array.isArray(params.tracks) ? params.tracks : []));
  const [nextCursor, setNextCursor] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const startIndex = useMemo(() => {
    const base =
      Number.isFinite(Number(params.startIndex)) && tracks.length
        ? Number(params.startIndex)
        : source === "queue" && queue.length
        ? currentIndex
        : 0;
    return Math.max(0, Math.min((tracks.length || 1) - 1, Math.floor(base || 0)));
  }, [currentIndex, params.startIndex, queue.length, source, tracks.length]);

  const [activeIndex, setActiveIndex] = useState(startIndex);

  // init tracks selon source
  useEffect(() => {
    if (Array.isArray(params.tracks) && params.tracks.length) {
      setTracks(params.tracks);
      return;
    }
    if (source === "queue") {
      const q = queue?.length ? queue : current ? [current] : [];
      setTracks(q);
      return;
    }
  }, [current, params.tracks, queue, source]);

  // feed mode
  const loadMore = useCallback(async () => {
    if (source !== "forYou") return;
    if (loadingMore) return;
    if (!hasMore && tracks.length) return;
    setLoadingMore(true);
    const cursor = tracks.length ? nextCursor : 0;
    const r = await api.getForYouFeed(30, true, { cursor, strategy: "reco" });
    if (r.success) {
      const more = r.data.tracks || [];
      setTracks((prev) => (cursor === 0 ? more : [...prev, ...more]));
      setNextCursor(r.data.nextCursor || (cursor + more.length));
      setHasMore(Boolean(r.data.hasMore));
    }
    setLoadingMore(false);
  }, [hasMore, loadingMore, nextCursor, source, tracks.length]);

  useEffect(() => {
    if (source !== "forYou") return;
    // première charge
    loadMore().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Positionner l’index sur initialTrackId quand on a des tracks
  useEffect(() => {
    if (source !== "forYou") return;
    if (!tracks.length) return;
    if (!initialTrackId) return;

    const idx = tracks.findIndex((t) => t?._id === initialTrackId);
    if (idx >= 0 && idx !== activeIndex) {
      setActiveIndex(idx);
      requestAnimationFrame(() => {
        try {
          listRef.current?.scrollToIndex({ index: idx, animated: false });
        } catch {}
      });
    }
  }, [activeIndex, initialTrackId, source, tracks]);

  // Scroll initial
  useEffect(() => {
    if (!tracks.length) return;
    const id = requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({ index: startIndex, animated: false });
      } catch {
        // ignore
      }
    });
    return () => cancelAnimationFrame(id);
  }, [startIndex, tracks.length]);

  // Autoplay sur l’item actif via queue globale (évite double replace)
  useEffect(() => {
    if (!tracks.length) return;
    setQueueAndPlay(tracks, activeIndex).catch(() => {});
    // si on arrive sur un écran et que c’est pause → on joue
    if (current?._id === tracks[activeIndex]?._id && !isPlaying) {
      togglePlayPause().catch(() => {});
    }
  }, [activeIndex, current?._id, isPlaying, setQueueAndPlay, togglePlayPause, tracks]);

  // Détection de l’item actif (plus fiable que onMomentumScrollEnd)
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const v = Array.isArray(viewableItems) ? viewableItems[0] : null;
    const next = v?.index;
    if (typeof next === "number") {
      setActiveIndex((prev) => (prev === next ? prev : next));
    }
  }).current;

  useEffect(() => {
    if (source !== "forYou") return;
    if (!tracks.length) return;
    if (!hasMore) return;
    if (activeIndex >= Math.max(0, tracks.length - 4)) {
      loadMore().catch(() => {});
    }
  }, [activeIndex, hasMore, loadMore, source, tracks.length]);

  const activeProgressPct = useMemo(() => {
    // on s’appuie sur la durée de la track (API) car le status audio n’est pas toujours fiable/typé
    const dur = Math.max(0, Number(tracks[activeIndex]?.duration ?? 0) || 0);
    // on ne peut pas lire currentTime proprement partout sans exposer plus de state → fallback 0
    return dur > 0 ? 0 : 0;
  }, [activeIndex, tracks]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ApiTrack>) => {
      const isThis = current?._id === item._id;
      const isActive = index === activeIndex;
      return (
        <View style={{ height: screenH, width: "100%" }}>
          <TrackSlide
            track={item}
            isActive={isActive}
            isPlaying={isThis && isPlaying}
            isLoading={isThis && isLoading}
            bottomInset={insets.bottom}
            progressPct={isThis && isPlaying ? 0 : 0}
            onTogglePlay={() => {
              if (!isThis) {
                setQueueAndPlay(tracks, index).catch(() => {});
                return;
              }
              togglePlayPause().catch(() => {});
            }}
          />
        </View>
      );
    },
    [activeIndex, current?._id, insets.bottom, isLoading, isPlaying, screenH, setQueueAndPlay, togglePlayPause, tracks]
  );

  if (!tracks.length) {
    return (
      <View style={styles.fallback}>
        <LinearGradient
          colors={["#020017", "#05010b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>
          Rien à lire pour le moment.
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.fallbackBtn}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        ref={(r) => {
          listRef.current = r;
        }}
        data={tracks}
        keyExtractor={(t) => t._id}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={screenH}
        snapToAlignment="start"
        disableIntervalMomentum
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        initialScrollIndex={startIndex}
        getItemLayout={(_, index) => ({
          length: screenH,
          offset: screenH * index,
          index,
        })}
        windowSize={5}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        removeClippedSubviews
        ListFooterComponent={loadingMore ? <View style={{ height: 80, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#c7d2fe" /></View> : null}
      />

      {/* Header overlay */}
      <View style={[styles.headerOverlay, { paddingTop: Math.max(10, insets.top) }]}>
        <Pressable
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Fermer le lecteur"
        >
          <Ionicons name="chevron-down" size={22} color="#f9fafb" />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        <View style={{ width: 44 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  slide: { flex: 1, justifyContent: "center" },
  seekWrap: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  seekTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  seekFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  headerBtn: {
    height: 44,
    width: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  headerTitle: { flex: 1, textAlign: "center", color: "#f8fafc", fontWeight: "800" },
  centerButton: {
    alignSelf: "center",
    height: 78,
    width: 78,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  bottomMeta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 26,
    paddingTop: 14,
    flexDirection: "column",
    gap: 10,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },
  trackTitle: { color: "#f9fafb", fontWeight: "900", fontSize: 18 },
  trackArtist: { color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  metaText: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "700" },
  metaDot: { color: "rgba(255,255,255,0.35)", fontSize: 12 },
  actionsCol: { gap: 10, alignItems: "center", paddingBottom: 4 },
  actionBtn: {
    height: 46,
    width: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 16 },
  fallbackBtn: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.9)",
  },
});


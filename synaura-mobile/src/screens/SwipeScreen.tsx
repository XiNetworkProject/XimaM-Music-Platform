import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  PanResponder,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api, type ApiTrack } from "../services/api";
import { usePlayer } from "../contexts/PlayerContext";

const { width, height: screenHeight } = Dimensions.get("window");
const SWIPE_THRESHOLD = 80;

const SwipeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { current, isPlaying, isLoading, playTrack, togglePlayPause } = usePlayer();

  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const pan = useRef(new Animated.Value(0)).current;

  const loadTracks = useCallback(async () => {
    setLoading(true);
    const r = await api.getForYouFeed(30, true);
    if (r.success && r.data.tracks?.length) {
      setTracks(r.data.tracks);
      setIndex(0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const track = tracks[index] || null;

  useEffect(() => {
    if (track && (!current || current._id !== track._id)) {
      playTrack(track);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?._id]);

  const goNext = useCallback(() => {
    if (!tracks.length) return;
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= tracks.length) return 0;
      return next;
    });
  }, [tracks.length]);

  const handleLike = useCallback(() => {
    if (!track) return;
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(track._id)) next.delete(track._id);
      else next.add(track._id);
      return next;
    });
    api.likeTrack(track._id).catch(() => {});
  }, [track]);

  const handleSkip = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleSwipeLike = useCallback(() => {
    if (track && !liked.has(track._id)) {
      setLiked((prev) => new Set(prev).add(track._id));
      api.likeTrack(track._id).catch(() => {});
    }
    goNext();
  }, [track, liked, goNext]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => {
        pan.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_THRESHOLD) {
          Animated.timing(pan, { toValue: -screenHeight, duration: 200, useNativeDriver: true }).start(() => {
            handleSwipeLike();
            pan.setValue(0);
          });
        } else if (g.dy > SWIPE_THRESHOLD) {
          Animated.timing(pan, { toValue: screenHeight, duration: 200, useNativeDriver: true }).start(() => {
            handleSkip();
            pan.setValue(0);
          });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const isTrackPlaying = !!track && current?._id === track._id && isPlaying;
  const isTrackLoading = !!track && current?._id === track._id && isLoading;
  const isLiked = track ? liked.has(track._id) : false;
  const artistName = track?.artist?.name || track?.artist?.artistName || track?.artist?.username || "Artiste";
  const genreLabel = track?.genre?.slice(0, 2).map((g: any) => typeof g === 'string' ? g : (g?.name || '')).filter(Boolean).join(", ") || "";

  if (loading) {
    return (
      <View style={s.screen}>
        <LinearGradient
          colors={["#020017", "#05010b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#c7d2fe" size="large" />
          <Text style={s.loadingText}>Chargement des pistes...</Text>
        </View>
      </View>
    );
  }

  if (!track) {
    return (
      <View style={s.screen}>
        <LinearGradient
          colors={["#020017", "#05010b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.loadingWrap}>
          <Ionicons name="musical-notes-outline" size={56} color="rgba(255,255,255,0.2)" />
          <Text style={s.loadingText}>Aucune piste disponible</Text>
          <Pressable style={s.retryBtn} onPress={loadTracks}>
            <Text style={s.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={["#020017", "#0a0020", "#05010b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#f9fafb" />
        </Pressable>
        <Text style={s.topTitle}>Découverte</Text>
        <Text style={s.counterText}>{index + 1}/{tracks.length}</Text>
      </View>

      <Animated.View
        style={[s.cardContainer, { transform: [{ translateY: pan }] }]}
        {...panResponder.panHandlers}
      >
        <View style={s.card}>
          <View style={s.coverWrap}>
            {track.coverUrl ? (
              <Image source={{ uri: track.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={["rgba(139,92,246,0.7)", "rgba(56,189,248,0.7)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={s.cardInfo}>
            <Text numberOfLines={2} style={s.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={s.trackArtist}>{artistName}</Text>
            {genreLabel ? (
              <View style={s.genreRow}>
                <View style={s.genrePill}>
                  <Text style={s.genreText}>{genreLabel}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.swipeHints}>
          <Text style={s.hintText}>↑ Swipe haut = J'aime</Text>
          <Text style={s.hintText}>↓ Swipe bas = Passer</Text>
        </View>
      </Animated.View>

      <View style={s.bottomActions}>
        <Pressable style={s.actionBtn} onPress={handleSkip}>
          <Ionicons name="close" size={28} color="#f87171" />
        </Pressable>

        <Pressable
          style={s.playBtn}
          onPress={() => {
            if (current?._id === track._id) togglePlayPause();
            else playTrack(track);
          }}
        >
          {isTrackLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name={isTrackPlaying ? "pause" : "play"} size={30} color="#fff" />
          )}
        </Pressable>

        <Pressable style={[s.actionBtn, isLiked && s.actionBtnLiked]} onPress={handleLike}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? "#ec4899" : "#f9fafb"} />
        </Pressable>
      </View>
    </View>
  );
};

export default SwipeScreen;

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020017",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "600",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(139,92,246,0.85)",
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.25)",
    marginTop: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f9fafb",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9fafb",
  },
  counterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.15)",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  coverWrap: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cardInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f9fafb",
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "600",
  },
  genreRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 6,
  },
  genrePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(139,92,246,0.35)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.5)",
  },
  genreText: {
    fontSize: 11,
    color: "#e9d5ff",
    fontWeight: "600",
  },
  swipeHints: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingTop: 8,
  },
  hintText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "600",
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    paddingBottom: 40,
    paddingTop: 8,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  actionBtnLiked: {
    backgroundColor: "rgba(236,72,153,0.15)",
    borderColor: "rgba(236,72,153,0.35)",
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,0.9)",
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.25)",
  },
});

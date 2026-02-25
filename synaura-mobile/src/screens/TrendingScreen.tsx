import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { api, type ApiTrack } from "../services/api";
import { usePlayer } from "../contexts/PlayerContext";

const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

function TrackRow({ track, index, onPress }: { track: ApiTrack; index: number; onPress: () => void }) {
  const { current, isPlaying, isLoading, playTrack, togglePlayPause } = usePlayer();
  const isThis = current?._id === track._id;
  const artistName = track.artist?.name || track.artist?.artistName || track.artist?.username || "Artiste";

  return (
    <Pressable style={styles.rowCard} onPress={onPress}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.rowCover}>
        {track.coverUrl ? <Image source={{ uri: track.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <LinearGradient
          colors={["rgba(255,255,255,0.18)", "rgba(0,0,0,0.08)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.rowMeta}>
        <Text numberOfLines={1} style={styles.rowTitle}>{track.title || "Piste"}</Text>
        <View style={styles.rowSubRow}>
          <Text numberOfLines={1} style={styles.rowSubtitle}>{artistName}</Text>
          <Text style={styles.rowDot}>·</Text>
          <Text style={styles.rowSubtitle}>{formatDuration(track.duration || 0)}</Text>
          {typeof track.plays === "number" ? (
            <>
              <Text style={styles.rowDot}>·</Text>
              <Text style={styles.rowSubtitle}>{track.plays.toLocaleString("fr-FR")} écoutes</Text>
            </>
          ) : null}
        </View>
      </View>
      <Pressable
        style={styles.rowPlayBtn}
        onPress={(e) => {
          (e as any)?.stopPropagation?.();
          if (!isThis) playTrack(track);
          else togglePlayPause();
        }}
        hitSlop={10}
      >
        {isThis && isLoading ? (
          <ActivityIndicator color="#f9fafb" />
        ) : (
          <Ionicons name={isThis && isPlaying ? "pause" : "play"} size={16} color="#f9fafb" />
        )}
      </Pressable>
    </Pressable>
  );
}

export default function TrendingScreen() {
  const navigation = useNavigation<any>();
  const { setQueueAndPlay } = usePlayer();
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await api.getTrendingTracks(50);
    if (!r.success) {
      setError(r.error);
      setTracks([]);
      setLoading(false);
      return;
    }
    setTracks(r.data.tracks || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPlayer = useCallback(
    (index: number) => {
      const parent = navigation.getParent?.();
      setQueueAndPlay(tracks, index).catch(() => {});
      (parent || navigation).navigate("Player", { tracks, startIndex: index, title: "Top 50" });
    },
    [navigation, setQueueAndPlay, tracks]
  );

  const list = useMemo(() => tracks.slice(0, 50), [tracks]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#020017", "#05010b"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={20} color="#e5e7eb" />
          </Pressable>
          <Text style={styles.headerTitle}>Les plus écoutées</Text>
          <Pressable onPress={load} style={styles.headerBtn}>
            <Ionicons name="refresh" size={18} color="#e5e7eb" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 220 }}>
          {loading ? (
            <View style={{ paddingVertical: 18 }}>
              <ActivityIndicator color="#c7d2fe" />
            </View>
          ) : error ? (
            <Pressable style={styles.errorCard} onPress={load}>
              <Text style={styles.errorTitle}>Impossible de charger</Text>
              <Text style={styles.errorSubtitle}>Appuie pour réessayer</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              {list.map((t, idx) => (
                <TrackRow key={t._id} track={t} index={idx} onPress={() => openPlayer(idx)} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020017" },
  safeArea: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerBtn: {
    height: 40,
    width: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { color: "#f9fafb", fontWeight: "900", fontSize: 18 },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 10,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  rankText: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 11 },
  rowCover: { width: 44, height: 44, borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" },
  rowMeta: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#f9fafb", fontWeight: "800", fontSize: 13 },
  rowSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" as any },
  rowSubtitle: { color: "#94a3b8", fontSize: 11 },
  rowDot: { color: "rgba(255,255,255,0.25)", fontSize: 11 },
  rowPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.35)",
  },
  errorCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  errorTitle: { color: "rgba(255,255,255,0.85)", fontWeight: "800" },
  errorSubtitle: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },
});


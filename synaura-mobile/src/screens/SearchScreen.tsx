import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ApiTrack, type SearchArtist, type SearchPlaylist, type SearchResponse } from "../services/api";
import { usePlayer } from "../contexts/PlayerContext";

type SearchFilter = "all" | "tracks" | "artists" | "playlists";

const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {typeof count === "number" ? (
        <Text style={styles.sectionCount}>{count}</Text>
      ) : null}
    </View>
  );
}

function TrackRow({ track, onPress }: { track: ApiTrack; onPress?: () => void }) {
  const { current, isPlaying, isLoading, playTrack } = usePlayer();
  const isThis = current?._id === track._id;
  const artistName = track.artist?.name || track.artist?.artistName || track.artist?.username || "Artiste";

  return (
    <Pressable style={styles.rowCard} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowCover}>
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
          colors={["rgba(255,255,255,0.18)", "rgba(0,0,0,0.08)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.rowMeta}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {track.title || "Piste"}
        </Text>
        <View style={styles.rowSubRow}>
          <Text numberOfLines={1} style={styles.rowSubtitle}>
            {artistName}
          </Text>
          <Text style={styles.rowDot}>·</Text>
          <Text style={styles.rowSubtitle}>{formatDuration(track.duration || 0)}</Text>
        </View>
      </View>

      <Pressable
        style={styles.rowPlayBtn}
        onPress={(e) => {
          (e as any)?.stopPropagation?.();
          playTrack(track);
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={isThis && isPlaying ? "Pause" : "Lecture"}
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

function ArtistRow({ artist, onPress }: { artist: SearchArtist; onPress?: () => void }) {
  const displayName = artist.artistName || artist.name || artist.username || "Artiste";
  return (
    <Pressable style={styles.rowCard} onPress={onPress}>
      <View style={styles.artistAvatar}>
        {artist.avatar ? (
          <Image source={{ uri: artist.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={styles.artistAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.rowMeta}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {displayName}
        </Text>
        <View style={styles.rowSubRow}>
          <Text numberOfLines={1} style={styles.rowSubtitle}>
            @{artist.username}
          </Text>
          {typeof artist.totalPlays === "number" ? (
            <>
              <Text style={styles.rowDot}>·</Text>
              <Text style={styles.rowSubtitle}>{artist.totalPlays.toLocaleString("fr-FR")} écoutes</Text>
            </>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
    </Pressable>
  );
}

function PlaylistRow({ playlist }: { playlist: SearchPlaylist }) {
  const title = playlist.title || playlist.name || "Playlist";
  const creator = playlist.creator?.username || playlist.creator?.name || "Utilisateur";

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowCover}>
        {playlist.coverUrl ? (
          <Image source={{ uri: playlist.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["rgba(16,185,129,0.55)", "rgba(99,102,241,0.55)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={["rgba(255,255,255,0.14)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.rowMeta}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {title}
        </Text>
        <View style={styles.rowSubRow}>
          <Text numberOfLines={1} style={styles.rowSubtitle}>
            par {creator}
          </Text>
          {typeof playlist.trackCount === "number" ? (
            <>
              <Text style={styles.rowDot}>·</Text>
              <Text style={styles.rowSubtitle}>{playlist.trackCount} titres</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { current, setQueueAndPlay } = usePlayer();
  const initialQueryParam = (route?.params?.initialQuery as string | undefined) || "";
  const initialFilterParam = (route?.params?.filter as SearchFilter | undefined) || "all";
  const autoFocusParam = route?.params?.autoFocus === true;

  const [query, setQuery] = useState(initialQueryParam);
  const [filter, setFilter] = useState<SearchFilter>(initialFilterParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);

  const reqIdRef = useRef(0);
  const inputRef = useRef<TextInput | null>(null);

  // Quand on navigue depuis l'accueil (params), on synchronise.
  useEffect(() => {
    if (typeof initialQueryParam === "string") setQuery(initialQueryParam);
    if (initialFilterParam) setFilter(initialFilterParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.initialQuery, route?.params?.filter]);

  useEffect(() => {
    if (!autoFocusParam) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });
    return () => cancelAnimationFrame(id);
  }, [autoFocusParam]);

  const runSearch = useCallback(async (q: string, f: SearchFilter) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }

    const myId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    const r = await api.search(trimmed, { filter: f, limit: 20 });
    if (reqIdRef.current !== myId) return; // réponse obsolète

    if (!r.success) {
      setError(r.error);
      setData(null);
      setLoading(false);
      return;
    }
    setData(r.data);
    setLoading(false);
  }, []);

  const openPlayer = useCallback(
    (list: ApiTrack[], index: number) => {
      const parent = navigation.getParent?.();
      const cleanIndex = Math.max(0, Math.min(list.length - 1, index));
      const t = query.trim();
      setQueueAndPlay(list, cleanIndex).catch(() => {});
      (parent || navigation).navigate("Player", {
        tracks: list,
        startIndex: cleanIndex,
        title: t ? `Recherche: ${t}` : "Recherche",
      });
    },
    [navigation, query, setQueueAndPlay]
  );

  // Debounce (évitons de spam l’API)
  useEffect(() => {
    const t = setTimeout(() => {
      runSearch(query, filter).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [filter, query, runSearch]);

  const filters = useMemo(
    () =>
      [
        { id: "all" as const, label: "Tout" },
        { id: "tracks" as const, label: "Titres" },
        { id: "artists" as const, label: "Artistes" },
        { id: "playlists" as const, label: "Playlists" },
      ] as const,
    []
  );

  const hasAny =
    !!data && (data.tracks?.length || 0) + (data.artists?.length || 0) + (data.playlists?.length || 0) > 0;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#020017", "#05010b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <View style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Explorer</Text>
            <Text style={styles.headerTitle}>Recherche</Text>
          </View>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => {
              Keyboard.dismiss();
              setQuery("");
              setData(null);
              setError(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            ref={(r) => {
              inputRef.current = r;
            }}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un son, un créateur..."
            placeholderTextColor="rgba(148,163,184,0.7)"
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => runSearch(query, filter)}
          />
          {loading ? <ActivityIndicator color="#c7d2fe" /> : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersRow}
          contentContainerStyle={styles.filtersRowContent}
        >
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={[
            styles.resultsContent,
            { paddingBottom: 40 + insets.bottom + (current ? 220 : 90) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {!query.trim() ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={28} color="rgba(255,255,255,0.25)" />
              <Text style={styles.emptyTitle}>Tape ta recherche</Text>
              <Text style={styles.emptySubtitle}>Titres, artistes, playlists…</Text>
            </View>
          ) : error ? (
            <Pressable style={styles.errorCard} onPress={() => runSearch(query, filter)}>
              <Text style={styles.errorTitle}>Impossible de rechercher</Text>
              <Text style={styles.errorSubtitle}>Appuie pour réessayer</Text>
            </Pressable>
          ) : !loading && data && !hasAny ? (
            <View style={styles.emptyState}>
              <Ionicons name="sad-outline" size={28} color="rgba(255,255,255,0.25)" />
              <Text style={styles.emptyTitle}>Aucun résultat</Text>
              <Text style={styles.emptySubtitle}>Essaie un autre mot-clé.</Text>
            </View>
          ) : (
            <>
              {data?.tracks?.length ? (
                <>
                  <SectionTitle title="Titres" count={data.tracks.length} />
                  <View style={styles.sectionList}>
                    {data.tracks.map((t, idx) => (
                      <TrackRow key={t._id} track={t} onPress={() => openPlayer(data.tracks, idx)} />
                    ))}
                  </View>
                </>
              ) : null}

              {data?.artists?.length ? (
                <>
                  <SectionTitle title="Artistes" count={data.artists.length} />
                  <View style={styles.sectionList}>
                    {data.artists.map((a) => (
                      <ArtistRow key={a._id} artist={a} />
                    ))}
                  </View>
                </>
              ) : null}

              {data?.playlists?.length ? (
                <>
                  <SectionTitle title="Playlists" count={data.playlists.length} />
                  <View style={styles.sectionList}>
                    {data.playlists.map((p) => (
                      <PlaylistRow key={p._id} playlist={p} />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020017" },
  safeArea: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
  backgroundGlowTop: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "rgba(139,92,246,0.55)",
    opacity: 0.7,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -120,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.5)",
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#e5e7eb", marginTop: 2 },
  headerIconBtn: {
    height: 40,
    width: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  searchInput: { flex: 1, color: "#e5e7eb", fontSize: 13, padding: 0 },
  filtersRow: { marginTop: 10 },
  filtersRowContent: { paddingRight: 16, gap: 8 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  filterPillActive: {
    backgroundColor: "rgba(139,92,246,0.28)",
    borderColor: "rgba(139,92,246,0.55)",
  },
  filterText: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: "#f8fafc" },
  resultsScroll: { flex: 1, marginTop: 10 },
  resultsContent: { paddingBottom: 30 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: { color: "#e5e7eb", fontSize: 13, fontWeight: "700" },
  sectionCount: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700" },
  sectionList: { gap: 8 },
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
  rowCover: { width: 44, height: 44, borderRadius: 12, overflow: "hidden" },
  artistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,51,234,0.7)",
  },
  artistAvatarText: { color: "#f9fafb", fontWeight: "800", fontSize: 16 },
  rowMeta: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#f9fafb", fontWeight: "700", fontSize: 13 },
  rowSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
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
  emptyState: {
    paddingTop: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { color: "rgba(255,255,255,0.82)", fontWeight: "800" },
  emptySubtitle: { color: "rgba(255,255,255,0.45)" },
  errorCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginTop: 14,
  },
  errorTitle: { color: "rgba(255,255,255,0.85)", fontWeight: "800" },
  errorSubtitle: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 12 },
});


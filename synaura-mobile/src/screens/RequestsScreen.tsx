import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api, type FollowRequest } from "../services/api";

const { width } = Dimensions.get("window");

type Tab = "follow" | "messages";

type MessageRequest = {
  _id: string;
  from?: { _id: string; username: string; name?: string; avatar?: string | null };
  message?: string;
  content?: string;
  createdAt?: string;
};

const RequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>("follow");

  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [followLoading, setFollowLoading] = useState(true);

  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [messageLoading, setMessageLoading] = useState(true);

  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const loadFollowRequests = useCallback(async () => {
    setFollowLoading(true);
    const r = await api.getFollowRequests();
    if (r.success) setFollowRequests(r.data.requests || []);
    else setFollowRequests([]);
    setFollowLoading(false);
  }, []);

  const loadMessageRequests = useCallback(async () => {
    setMessageLoading(true);
    const r = await api.getMessageRequests();
    if (r.success) setMessageRequests((r.data.requests as MessageRequest[]) || []);
    else setMessageRequests([]);
    setMessageLoading(false);
  }, []);

  useEffect(() => {
    loadFollowRequests();
    loadMessageRequests();
  }, [loadFollowRequests, loadMessageRequests]);

  const handleFollow = useCallback(
    async (id: string, action: "accept" | "reject") => {
      setProcessing((p) => new Set(p).add(id));
      await api.handleFollowRequest(id, action);
      setFollowRequests((prev) => prev.filter((r) => r._id !== id));
      setProcessing((p) => {
        const next = new Set(p);
        next.delete(id);
        return next;
      });
    },
    []
  );

  const handleMessage = useCallback(
    (id: string, _action: "accept" | "reject") => {
      setMessageRequests((prev) => prev.filter((r) => r._id !== id));
    },
    []
  );

  const renderFollowItem = useCallback(
    ({ item }: { item: FollowRequest }) => {
      const name = item.from?.name || item.from?.username || "Utilisateur";
      const username = item.from?.username || "";
      const busy = processing.has(item._id);
      const date = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
        : "";

      return (
        <View style={s.requestRow}>
          <View style={s.avatarWrap}>
            {item.from?.avatar ? (
              <Image source={{ uri: item.from.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <Text style={s.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={s.requestInfo}>
            <Text numberOfLines={1} style={s.requestName}>{name}</Text>
            <Text numberOfLines={1} style={s.requestUsername}>@{username}</Text>
            {date ? <Text style={s.requestDate}>{date}</Text> : null}
          </View>
          <View style={s.actionBtns}>
            <Pressable
              style={[s.acceptBtn, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => handleFollow(item._id, "accept")}
            >
              {busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
            </Pressable>
            <Pressable
              style={[s.rejectBtn, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => handleFollow(item._id, "reject")}
            >
              <Ionicons name="close" size={16} color="#f87171" />
            </Pressable>
          </View>
        </View>
      );
    },
    [processing, handleFollow]
  );

  const renderMessageItem = useCallback(
    ({ item }: { item: MessageRequest }) => {
      const name = item.from?.name || item.from?.username || "Utilisateur";
      const preview = item.message || item.content || "";

      return (
        <View style={s.requestRow}>
          <View style={s.avatarWrap}>
            {item.from?.avatar ? (
              <Image source={{ uri: item.from.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <Text style={s.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={s.requestInfo}>
            <Text numberOfLines={1} style={s.requestName}>{name}</Text>
            {preview ? <Text numberOfLines={2} style={s.requestPreview}>{preview}</Text> : null}
          </View>
          <View style={s.actionBtns}>
            <Pressable style={s.acceptBtn} onPress={() => handleMessage(item._id, "accept")}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </Pressable>
            <Pressable style={s.rejectBtn} onPress={() => handleMessage(item._id, "reject")}>
              <Ionicons name="close" size={16} color="#f87171" />
            </Pressable>
          </View>
        </View>
      );
    },
    [handleMessage]
  );

  const emptyFollow = (
    <View style={s.emptyWrap}>
      <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.2)" />
      <Text style={s.emptyText}>Aucune demande de suivi</Text>
    </View>
  );

  const emptyMessage = (
    <View style={s.emptyWrap}>
      <Ionicons name="chatbubble-ellipses-outline" size={48} color="rgba(255,255,255,0.2)" />
      <Text style={s.emptyText}>Aucune demande de message</Text>
    </View>
  );

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={["#020017", "#05010b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#f9fafb" />
        </Pressable>
        <Text style={s.headerTitle}>Demandes</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={s.tabRow}>
        <Pressable
          style={[s.tabBtn, tab === "follow" && s.tabBtnActive]}
          onPress={() => setTab("follow")}
        >
          <Text style={[s.tabText, tab === "follow" && s.tabTextActive]}>Suivi</Text>
        </Pressable>
        <Pressable
          style={[s.tabBtn, tab === "messages" && s.tabBtnActive]}
          onPress={() => setTab("messages")}
        >
          <Text style={[s.tabText, tab === "messages" && s.tabTextActive]}>Messages</Text>
        </Pressable>
      </View>

      {tab === "follow" ? (
        followLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color="#c7d2fe" size="large" />
          </View>
        ) : (
          <FlatList
            data={followRequests}
            keyExtractor={(i) => i._id}
            renderItem={renderFollowItem}
            contentContainerStyle={s.listContent}
            ListEmptyComponent={emptyFollow}
          />
        )
      ) : messageLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#c7d2fe" size="large" />
        </View>
      ) : (
        <FlatList
          data={messageRequests}
          keyExtractor={(i) => i._id}
          renderItem={renderMessageItem}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={emptyMessage}
        />
      )}
    </View>
  );
};

export default RequestsScreen;

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020017",
    paddingTop: 44,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f9fafb",
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "rgba(139,92,246,0.65)",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  tabTextActive: {
    color: "#f9fafb",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,51,234,0.7)",
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f9fafb",
  },
  requestInfo: {
    flex: 1,
    minWidth: 0,
  },
  requestName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f9fafb",
  },
  requestUsername: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 1,
  },
  requestDate: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  requestPreview: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  actionBtns: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,0.85)",
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.25)",
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
});

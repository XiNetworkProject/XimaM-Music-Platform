import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ENV } from "../config/env";
import { SynauraSymbol } from "../components/SynauraLogo";

export default function StudioScreen() {
  const openWebStudio = async () => {
    const url = `${ENV.API_BASE_URL}/ai-generator`;
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#020017", "#05010b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Création</Text>
          <Text style={styles.headerTitle}>Studio IA</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <SynauraSymbol size={32} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cardTitle}>Génère des sons sur Synaura</Text>
              <Text style={styles.cardSubtitle}>
                Le Studio IA natif arrive. En attendant, tu peux utiliser la version web optimisée mobile.
              </Text>
            </View>
          </View>

          <Pressable style={styles.primaryBtn} onPress={openWebStudio}>
            <Ionicons name="sparkles" size={18} color="#f9fafb" />
            <Text style={styles.primaryBtnText}>Ouvrir le Studio IA (web)</Text>
          </Pressable>

          <View style={styles.tipBox}>
            <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.tipText}>
              Astuce: ajoute un raccourci écran d’accueil depuis ton navigateur si tu veux un accès instantané.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020017" },
  safeArea: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
  glowTop: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "rgba(139,92,246,0.55)",
    opacity: 0.7,
  },
  glowBottom: {
    position: "absolute",
    bottom: -120,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.5)",
    opacity: 0.7,
  },
  header: { marginBottom: 14 },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#e5e7eb", marginTop: 2 },
  card: {
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 14,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  cardTitle: { color: "#f9fafb", fontWeight: "800", fontSize: 16 },
  cardSubtitle: { color: "rgba(255,255,255,0.6)", marginTop: 4, fontSize: 12, lineHeight: 16 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.9)",
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.35)",
  },
  primaryBtnText: { color: "#f9fafb", fontWeight: "800" },
  tipBox: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tipText: { flex: 1, color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 16 },
});


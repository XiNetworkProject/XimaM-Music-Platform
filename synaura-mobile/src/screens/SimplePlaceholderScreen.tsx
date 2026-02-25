import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function SimplePlaceholderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const title = route?.params?.title || "Bientôt";
  const subtitle = route?.params?.subtitle || "Cette section arrive sur mobile.";

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#020017", "#05010b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.safeArea}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color="#e5e7eb" />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020017" },
  safeArea: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.75)", fontWeight: "700" },
  card: {
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 14,
  },
  title: { color: "#f9fafb", fontWeight: "900", fontSize: 18 },
  subtitle: { color: "rgba(255,255,255,0.65)", marginTop: 6, lineHeight: 18 },
});


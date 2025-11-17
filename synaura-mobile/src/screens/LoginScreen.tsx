// src/screens/LoginScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "https://synaura.fr"; // à adapter si besoin (dev/staging)

type LoginScreenProps = {
  navigation: any; // ou NativeStackNavigationProp<...>
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorText("Veuillez remplir tous les champs.");
      return;
    }

    setIsLoading(true);
    setErrorText(null);

    try {
      // Exemple d'appel API (à adapter à ton backend réel)
      const res = await fetch(`${API_BASE_URL}/api/auth/mobile-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Email ou mot de passe incorrect ou erreur serveur."
        );
      }

      // TODO : stocker le token / session (SecureStore, AsyncStorage, etc.)
      // puis rediriger vers l'app :
      navigation.replace("Home");
    } catch (err: any) {
      console.error("Erreur login mobile:", err);
      setErrorText(
        err?.message || "Impossible de se connecter pour le moment."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#020017", "#05010b"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      {/* Halos */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header "marketing" simple */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={["#22d3ee", "#e879f9", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerLabel}>Synaura</Text>
            <Text style={styles.headerTitle}>Connexion</Text>
            <Text style={styles.headerSubtitle}>
              Retrouve ton studio IA, ta bibliothèque et tes créateurs favoris.
            </Text>
          </View>
        </View>

        {/* Carte login */}
        <View style={styles.card}>
          {/* Retour & lien inscription */}
          <View style={styles.cardTopRow}>
            <Pressable
              onPress={() => {
                // à adapter si tu as un écran Welcome / Splash
                navigation.goBack();
              }}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={16} color="#cbd5f5" />
              <Text style={styles.backText}>Retour</Text>
            </Pressable>
            <Text style={styles.smallText}>
              Pas de compte ?{" "}
              <Text
                style={styles.linkText}
                onPress={() => navigation.navigate("SignUp")}
              >
                Créer un compte
              </Text>
            </Text>
          </View>

          {/* Erreur éventuelle */}
          {errorText && (
            <View style={styles.errorBox}>
              <Ionicons
                name="warning-outline"
                size={18}
                color="#fecaca"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color="#94a3b8"
                style={{ marginRight: 6 }}
              />
              <TextInput
                value={email}
                onChangeText={(t) => setEmail(t)}
                placeholder="vous@example.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInput}
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#94a3b8"
                style={{ marginRight: 6 }}
              />
              <TextInput
                value={password}
                onChangeText={(t) => setPassword(t)}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                style={styles.textInput}
              />
              <Pressable
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#cbd5f5"
                />
              </Pressable>
            </View>
            <Pressable
              style={styles.forgotBtn}
              onPress={() => {
                // Si tu fais une page "ForgotPassword" mobile plus tard
                Alert.alert(
                  "Mot de passe oublié",
                  "Pour le moment, la réinitialisation du mot de passe se fait via le site web Synaura."
                );
              }}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </Pressable>
          </View>

          {/* Bouton connexion */}
          <Pressable
            disabled={isLoading}
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && !isLoading && { transform: [{ scale: 0.97 }] },
              isLoading && { opacity: 0.7 },
            ]}
            onPress={handleLogin}
          >
            <LinearGradient
              colors={["#8b5cf6", "#ec4899", "#22d3ee"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              {isLoading ? (
                <View style={styles.submitInnerRow}>
                  <ActivityIndicator color="#f9fafb" size="small" />
                  <Text style={styles.submitText}>Connexion...</Text>
                </View>
              ) : (
                <View style={styles.submitInnerRow}>
                  <Ionicons name="log-in-outline" size={18} color="#f9fafb" />
                  <Text style={styles.submitText}>Se connecter</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>

          {/* Infos légales */}
          <Text style={styles.legalText}>
            En vous connectant, vous acceptez les{" "}
            <Text style={styles.linkText}>conditions d'utilisation</Text> et la{" "}
            <Text style={styles.linkText}>politique de confidentialité</Text> de
            Synaura.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
    justifyContent: "center",
  },
  glowTop: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(139,92,246,0.6)",
    opacity: 0.7,
  },
  glowBottom: {
    position: "absolute",
    bottom: -120,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.6)",
    opacity: 0.7,
  },
  header: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoWrapper: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoGradient: {
    width: 32,
    height: 32,
    borderRadius: 999,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 10,
    color: "#9ca3af",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e5e7eb",
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#cbd5f5",
    marginTop: 4,
  },
  card: {
    borderRadius: 24,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  smallText: {
    fontSize: 11,
    color: "#cbd5f5",
  },
  linkText: {
    color: "#a5b4fc",
    fontWeight: "600",
  },
  errorBox: {
    marginBottom: 10,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(239,68,68,0.16)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.7)",
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#fee2e2",
    flex: 1,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(15,23,42,0.95)",
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#e5e7eb",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  forgotText: {
    fontSize: 11,
    color: "#a5b4fc",
  },
  submitBtn: {
    marginTop: 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  submitGradient: {
    borderRadius: 16,
  },
  submitInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f9fafb",
  },
  legalText: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 10,
    textAlign: "center",
  },
});


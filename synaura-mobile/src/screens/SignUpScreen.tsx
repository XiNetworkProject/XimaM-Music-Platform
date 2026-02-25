// src/screens/SignUpScreen.tsx

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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { SynauraSymbol } from "../components/SynauraLogo";

type SignUpScreenProps = {
  navigation: any;
};

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    if (!name.trim()) {
      setErrorText("Le nom complet est requis.");
      return false;
    }
    if (!username.trim()) {
      setErrorText("Le nom d'utilisateur est requis.");
      return false;
    }
    if (username.trim().length < 3) {
      setErrorText(
        "Le nom d'utilisateur doit contenir au moins 3 caractères."
      );
      return false;
    }
    if (!email.trim()) {
      setErrorText("L'email est requis.");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setErrorText("Format d'email invalide.");
      return false;
    }
    if (password.length < 6) {
      setErrorText(
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return false;
    }
    if (password !== confirm) {
      setErrorText("Les mots de passe ne correspondent pas.");
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setErrorText(null);

    try {
      const r = await signUp({
        name,
        username,
        email,
        password,
      });
      if (!r.ok) throw new Error(r.error);
      // navigation gérée par App.tsx (switch automatique vers l'app quand user != null)
    } catch (err: any) {
      console.error("Erreur signup mobile:", err);
      setErrorText(err?.message || "Impossible de créer le compte.");
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
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={["#22d3ee", "#e879f9", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logoGradient, { alignItems: "center", justifyContent: "center" }]}
            >
              <SynauraSymbol size={26} />
            </LinearGradient>
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerLabel}>Synaura</Text>
            <Text style={styles.headerTitle}>Créer ton compte</Text>
            <Text style={styles.headerSubtitle}>
              Un profil unique pour ton lecteur, le studio IA et la communauté.
            </Text>
          </View>
        </View>

        {/* Carte signup */}
        <View style={styles.card}>
          {/* Haut de carte */}
          <View style={styles.cardTopRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={16} color="#cbd5f5" />
              <Text style={styles.backText}>Retour</Text>
            </Pressable>
            <Text style={styles.smallText}>
              Déjà un compte ?{" "}
              <Text
                style={styles.linkText}
                onPress={() => navigation.replace("Login")}
              >
                Se connecter
              </Text>
            </Text>
          </View>

          {/* Erreur */}
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

          {/* Nom */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Nom complet</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color="#94a3b8"
                style={{ marginRight: 6 }}
              />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Votre nom complet"
                placeholderTextColor="#64748b"
                style={styles.textInput}
              />
            </View>
          </View>

          {/* Username */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Nom d'utilisateur</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="at-outline"
                size={18}
                color="#94a3b8"
                style={{ marginRight: 6 }}
              />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="nom_utilisateur"
                autoCapitalize="none"
                placeholderTextColor="#64748b"
                style={styles.textInput}
              />
            </View>
          </View>

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
                onChangeText={setEmail}
                placeholder="vous@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#64748b"
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
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                placeholderTextColor="#64748b"
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
          </View>

          {/* Confirmation */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#94a3b8"
                style={{ marginRight: 6 }}
              />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                secureTextEntry={!showConfirm}
                placeholderTextColor="#64748b"
                style={styles.textInput}
              />
              <Pressable
                onPress={() => setShowConfirm((p) => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#cbd5f5"
                />
              </Pressable>
            </View>
          </View>

          {/* Bouton inscription */}
          <Pressable
            disabled={isLoading}
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && !isLoading && { transform: [{ scale: 0.97 }] },
              isLoading && { opacity: 0.7 },
            ]}
            onPress={handleSignUp}
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
                  <Text style={styles.submitText}>Création du compte...</Text>
                </View>
              ) : (
                <View style={styles.submitInnerRow}>
                  <Ionicons name="person-add-outline" size={18} color="#f9fafb" />
                  <Text style={styles.submitText}>Créer mon compte</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>

          {/* Légal */}
          <Text style={styles.legalText}>
            En créant un compte, tu acceptes les{" "}
            <Text style={styles.linkText}>conditions d'utilisation</Text> et la{" "}
            <Text style={styles.linkText}>politique de confidentialité</Text>{" "}
            de Synaura.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  // même style de base que LoginScreen
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
    marginBottom: 10,
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


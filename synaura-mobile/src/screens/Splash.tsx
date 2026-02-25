// app/(root)/SplashScreen.tsx ou src/screens/SplashScreen.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SynauraSymbol } from "../components/SynauraLogo";

const { width, height } = Dimensions.get("window");

interface SplashScreenProps {
  /**
   * Appelé quand l'animation est terminée.
   * Tu peux y faire un navigation.replace("Home") par exemple.
   */
  onFinish?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation de pulsation infinie pour l’anneau autour du logo
    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.3,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.4,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 900,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.05,
            duration: 900,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    ringLoop.start();

    // Animation d’entrée du logo + textes
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(150),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(800),
    ]).start(() => {
      // Petite pause avant de quitter le splash
      setTimeout(() => {
        onFinish?.();
      }, 300);
    });

    // Optionnel : arrêter la boucle si le composant est démonté
    return () => {
      ringLoop.stop();
    };
  }, [logoOpacity, logoScale, ringScale, ringOpacity, textOpacity, subtitleOpacity, onFinish]);

  return (
    <View style={styles.container}>
      {/* Background global Synaura */}
      <LinearGradient
        colors={["#020017", "#05010b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Halos de couleur (violet / cyan) */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["rgba(139,92,246,0.85)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 0.7 }}
          style={[
            styles.glow,
            { top: -height * 0.2, left: -width * 0.2, width: width * 0.8, height: width * 0.8 },
          ]}
        />
        <LinearGradient
          colors={["rgba(34,211,238,0.85)", "transparent"]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0.2, y: 0.2 }}
          style={[
            styles.glow,
            { bottom: -height * 0.2, right: -width * 0.2, width: width * 0.8, height: width * 0.8 },
          ]}
        />
      </View>

      {/* Contenu principal */}
      <View style={styles.inner}>
        {/* Logo + anneau animé */}
        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.logoCoreWrapper,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <LinearGradient
              colors={["#22d3ee", "#e879f9", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logoCore, { alignItems: "center", justifyContent: "center" }]}
            >
              <SynauraSymbol size={56} />
            </LinearGradient>
            <View style={styles.logoHighlight} />
          </Animated.View>
        </View>

        {/* Texte Synaura */}
        <Animated.View style={{ opacity: textOpacity, marginTop: 24, alignItems: "center" }}>
          <Text style={styles.brand}>Synaura</Text>
          <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
            Studio musical en cours de lancement…
          </Animated.Text>
        </Animated.View>

        {/* Baseline en bas */}
        <View style={styles.footer}>
          <Text style={styles.footerTop}>Préparation de votre univers sonore personnalisé</Text>
          <View style={styles.footerBottomRow}>
            <View style={styles.dot} />
            <Text style={styles.footerBottom}>Connexion sécurisée à votre session…</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.8,
  },
  logoWrapper: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(248,250,252,0.25)",
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  logoCoreWrapper: {
    width: 118,
    height: 118,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: "rgba(248,250,252,0.4)",
    backgroundColor: "#020013",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoCore: {
    width: 72,
    height: 72,
    borderRadius: 24,
    shadowColor: "#e5e7eb",
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  logoHighlight: {
    position: "absolute",
    width: 46,
    height: 46,
    top: 18,
    left: 18,
    borderRadius: 999,
    backgroundColor: "rgba(248,250,252,0.18)",
    opacity: 0.9,
  },
  brand: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "#e5e7eb",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(209,213,219,0.8)",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 24,
    right: 24,
  },
  footerTop: {
    fontSize: 11,
    color: "rgba(156,163,175,0.9)",
    textAlign: "center",
    marginBottom: 6,
  },
  footerBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#6ee7b7",
    marginRight: 6,
  },
  footerBottom: {
    fontSize: 11,
    color: "rgba(148,163,184,0.95)",
  },
});

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// ---------- MOCK DATA ----------

const heroSlides = [
  {
    id: "meteo",
    title: "Météo Alertemps sur Synaura",
    subtitle: "Bulletin météo professionnel par Alertemps",
    tag: "Bulletin météo",
  },
];

const forYou = Array.from({ length: 8 }).map((_, i) => ({
  id: `fy-${i}`,
  title: ["Neon Sisters", "Night Shift Bass", "EDM Skyline", "Dreamwave Pulse"][
    i % 4
  ],
  artist: ["XimaM", "EliAti", "Synaura AI", "Guest Creator"][i % 4],
  duration: "3:24",
}));

const trending = Array.from({ length: 6 }).map((_, i) => ({
  id: `top-${i}`,
  title: `Track #${i + 1}`,
  artist: ["XimaM", "EliAti", "Synaura AI"][i % 3],
  index: i,
}));

const newCreators = Array.from({ length: 6 }).map((_, i) => ({
  id: `creator-${i}`,
  name: ["NovaBeat", "LuneRose", "NightEcho", "PixelWave"][i % 4],
  username: ["novabeat", "lunerose", "nightecho", "pixelwave"][i % 4],
  plays: [3400, 9800, 12500, 22000][i % 4],
}));

// ---------- PETITS COMPOSANTS ----------

type SectionHeaderProps = {
  icon?: React.ReactNode;
  title: string;
  action?: string;
  onActionPress?: () => void;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  action,
  onActionPress,
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      {icon}
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
    {action && (
      <Pressable onPress={onActionPress}>
        <Text style={styles.sectionHeaderAction}>{action}</Text>
      </Pressable>
    )}
  </View>
);

const Pill: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.pill}>
    <Text style={styles.pillText}>{label}</Text>
  </View>
);

type TrackCardProps = {
  title: string;
  artist: string;
  duration: string;
  index?: number;
};

const TrackCard: React.FC<TrackCardProps> = ({
  title,
  artist,
  duration,
  index,
}) => (
  <View style={styles.trackCard}>
    <View style={styles.trackCardImageWrapper}>
      <LinearGradient
        colors={["rgba(139,92,246,0.7)", "rgba(56,189,248,0.7)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.trackCardImage}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.3)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trackCardGlow}
        />
      </LinearGradient>
      {typeof index === "number" && (
        <View style={styles.trackIndexBadge}>
          <Text style={styles.trackIndexText}>#{index + 1}</Text>
        </View>
      )}
      <Pressable style={styles.trackPlayButton}>
        <Ionicons name="play" size={14} color="#f9fafb" />
      </Pressable>
    </View>
    <Text numberOfLines={1} style={styles.trackTitle}>
      {title}
    </Text>
    <Text numberOfLines={1} style={styles.trackArtist}>
      {artist}
    </Text>
    <View style={styles.trackMetaRow}>
      <Ionicons name="time-outline" size={11} color="#94a3b8" />
      <Text style={styles.trackDuration}>{duration}</Text>
    </View>
  </View>
);

type CreatorCardProps = {
  name: string;
  username: string;
  plays: number;
};

const CreatorCard: React.FC<CreatorCardProps> = ({
  name,
  username,
  plays,
}) => (
  <View style={styles.creatorCard}>
    <View style={styles.creatorTopRow}>
      <View style={styles.creatorAvatar}>
        <Text style={styles.creatorAvatarText}>{name.charAt(0)}</Text>
      </View>
      <View style={styles.creatorInfo}>
        <Text numberOfLines={1} style={styles.creatorName}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.creatorUsername}>
          @{username}
        </Text>
        <Text style={styles.creatorPlays}>
          {plays.toLocaleString("fr-FR")} écoutes
        </Text>
      </View>
    </View>
    <View style={styles.creatorButtonsRow}>
      <Pressable style={styles.creatorListenButton}>
        <Ionicons name="play" size={12} color="#f9fafb" />
        <Text style={styles.creatorListenButtonText}>Écouter</Text>
      </Pressable>
      <Pressable style={styles.creatorFollowButton}>
        <Text style={styles.creatorFollowButtonText}>Suivre</Text>
      </Pressable>
    </View>
  </View>
);

const WeatherCard: React.FC = () => (
  <LinearGradient
    colors={[
      "rgba(59,130,246,0.25)",
      "rgba(56,189,248,0.25)",
      "rgba(37,99,235,0.25)",
    ]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.weatherCard}
  >
    <View style={styles.weatherLeft}>
      <View style={styles.weatherIconWrapper}>
        <Ionicons name="cloud-outline" size={18} color="#bae6fd" />
      </View>
      <View>
        <Text style={styles.weatherTitle}>Alertemps — Météo</Text>
        <Text style={styles.weatherSubtitle}>Ciel dégagé · Dunkerque</Text>
      </View>
    </View>
    <View style={styles.weatherRight}>
      <Text style={styles.weatherTemp}>18°C</Text>
      <Text style={styles.weatherUpdate}>Bulletin actualisé</Text>
    </View>
  </LinearGradient>
);

const RadioCard: React.FC = () => (
  <LinearGradient
    colors={[
      "rgba(79,70,229,0.4)",
      "rgba(192,38,211,0.35)",
      "rgba(14,165,233,0.3)",
    ]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.radioCard}
  >
    <View style={styles.radioLeft}>
      <View style={styles.radioIconWrapper}>
        <MaterialCommunityIcons
          name="radio-tower"
          size={20}
          color="#6ee7b7"
        />
      </View>
      <View style={styles.radioTexts}>
        <Text numberOfLines={1} style={styles.radioTitle}>
          Mixx Party — Radio en direct
        </Text>
        <Text numberOfLines={1} style={styles.radioSubtitle}>
          EDM, remixes et sets non-stop
        </Text>
      </View>
    </View>
    <Pressable style={styles.radioButton}>
      <Ionicons name="play" size={14} color="#f9fafb" />
      <Text style={styles.radioButtonText}>Écouter</Text>
    </Pressable>
  </LinearGradient>
);

const LibraryGrid: React.FC = () => (
  <View style={styles.libraryGrid}>
    <View style={styles.libraryItem}>
      <View style={[styles.libraryIconWrapper, styles.libraryIconFavorites]}>
        <Ionicons name="heart-outline" size={16} color="#fecaca" />
      </View>
      <Text style={styles.libraryTitle}>Favoris</Text>
      <Text style={styles.librarySubtitle}>128 tracks</Text>
    </View>
    <View style={styles.libraryItem}>
      <View style={[styles.libraryIconWrapper, styles.libraryIconPlaylists]}>
        <Ionicons name="disc-outline" size={16} color="#ddd6fe" />
      </View>
      <Text style={styles.libraryTitle}>Playlists</Text>
      <Text style={styles.librarySubtitle}>7 dossiers</Text>
    </View>
    <View style={styles.libraryItem}>
      <View style={[styles.libraryIconWrapper, styles.libraryIconHistory]}>
        <Ionicons name="time-outline" size={16} color="#a5f3fc" />
      </View>
      <Text style={styles.libraryTitle}>Historique</Text>
      <Text style={styles.librarySubtitle}>Récemment écoutés</Text>
    </View>
    <View style={styles.libraryItem}>
      <View style={[styles.libraryIconWrapper, styles.libraryIconIA]}>
        <Ionicons name="sparkles-outline" size={16} color="#e0e7ff" />
      </View>
      <Text style={styles.libraryTitle}>Générations IA</Text>
      <Text style={styles.librarySubtitle}>34 créations</Text>
    </View>
  </View>
);

// ---------- HOME SCREEN PRINCIPAL ----------

const HomeScreen: React.FC = () => {
  return (
    <View style={styles.screen}>
      {/* Fond global */}
      <LinearGradient
        colors={["#020017", "#05010b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backgroundGrid} />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <View style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Accueil</Text>
            <Text style={styles.headerTitle}>Synaura</Text>
          </View>
          <Pressable style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Studio IA</Text>
          </Pressable>
        </View>

        {/* Barre de recherche + filtres */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={14} color="#94a3b8" />
            <Text style={styles.searchPlaceholder}>
              Rechercher un son, un créateur...
            </Text>
          </View>
          <Pressable style={styles.iconSmallButton}>
            <Ionicons name="headset-outline" size={16} color="#e5e7eb" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillsRow}
            contentContainerStyle={styles.pillsRowContent}
          >
            <Pill label="Pour toi" />
            <Pill label="Tendances" />
            <Pill label="Nouveaux" />
            <Pill label="Radio" />
            <Pill label="Météo" />
          </ScrollView>

          {/* Hero Alertemps */}
          <View style={styles.heroSection}>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={[
                  "rgba(15,23,42,0.9)",
                  "rgba(30,64,175,0.8)",
                  "rgba(59,130,246,0.7)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroBackground}
              />
              <View style={styles.heroContent}>
                <View style={styles.heroTagsRow}>
                  <View style={styles.heroTag}>
                    <Text style={styles.heroTagText}>
                      {heroSlides[0].tag}
                    </Text>
                  </View>
                  <View style={styles.heroTagSecondary}>
                    <Text style={styles.heroTagSecondaryText}>
                      Nouveau sur Synaura
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.heroTitle}>{heroSlides[0].title}</Text>
                  <Text style={styles.heroSubtitle}>
                    {heroSlides[0].subtitle}
                  </Text>
                  <View style={styles.heroButtonsRow}>
                    <Pressable style={styles.heroPrimaryButton}>
                      <Ionicons
                        name="cloud-outline"
                        size={14}
                        color="#e5f4ff"
                      />
                      <Text style={styles.heroPrimaryButtonText}>
                        Voir la météo
                      </Text>
                    </Pressable>
                    <Pressable style={styles.heroSecondaryButton}>
                      <Text style={styles.heroSecondaryButtonText}>
                        Plus tard
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Radio + Météo widgets */}
          <View style={styles.widgetsGrid}>
            <RadioCard />
            <WeatherCard />
          </View>

          {/* Pour toi */}
          <View style={styles.section}>
            <SectionHeader
              icon={
                <Ionicons name="sparkles-outline" size={16} color="#e9d5ff" />
              }
              title="Pour toi"
              action="Tout voir"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {forYou.map((t) => (
                <TrackCard
                  key={t.id}
                  title={t.title}
                  artist={t.artist}
                  duration={t.duration}
                />
              ))}
            </ScrollView>
          </View>

          {/* Les plus écoutées */}
          <View style={styles.section}>
            <SectionHeader
              icon={
                <Ionicons name="trending-up-outline" size={16} color="#bfdbfe" />
              }
              title="Les plus écoutées"
              action="Top 50"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {trending.map((t) => (
                <TrackCard
                  key={t.id}
                  title={t.title}
                  artist={t.artist}
                  duration="3:45"
                  index={t.index}
                />
              ))}
            </ScrollView>
          </View>

          {/* Nouveaux créateurs */}
          <View style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="people-outline" size={16} color="#c4b5fd" />}
              title="Nouveaux créateurs"
              action="Explorer"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {newCreators.map((c) => (
                <CreatorCard
                  key={c.id}
                  name={c.name}
                  username={c.username}
                  plays={c.plays}
                />
              ))}
            </ScrollView>
          </View>

          {/* Ta bibliothèque */}
          <View style={styles.section}>
            <SectionHeader
              icon={<Ionicons name="library-outline" size={16} color="#a5b4fc" />}
              title="Ta bibliothèque"
              action="Gérer"
            />
            <LibraryGrid />
          </View>

          {/* Nouvelles musiques */}
          <View style={[styles.section, { paddingBottom: 16 }]}>
            <SectionHeader
              icon={<Ionicons name="musical-notes-outline" size={16} color="#bfdbfe" />}
              title="Nouvelles musiques"
              action="Tout voir"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {forYou
                .slice()
                .reverse()
                .map((t, i) => (
                  <TrackCard
                    key={`new-${i}`}
                    title={t.title}
                    artist={t.artist}
                    duration={t.duration}
                  />
                ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Bottom nav simple (fake) */}
        <View style={styles.bottomNav}>
          <View style={styles.bottomNavItemActive}>
            <View style={styles.bottomNavIconActive}>
              <Ionicons name="home-outline" size={16} color="#ede9fe" />
            </View>
            <Text style={styles.bottomNavLabelActive}>Accueil</Text>
          </View>
          <View style={styles.bottomNavItem}>
            <View style={styles.bottomNavIcon}>
              <Ionicons name="options-outline" size={16} color="#94a3b8" />
            </View>
            <Text style={styles.bottomNavLabel}>Studio</Text>
          </View>
          <View style={styles.bottomNavItem}>
            <View style={styles.bottomNavIcon}>
              <Ionicons name="radio-outline" size={16} color="#94a3b8" />
            </View>
            <Text style={styles.bottomNavLabel}>Radio</Text>
          </View>
          <View style={styles.bottomNavItem}>
            <View style={styles.bottomNavIcon}>
              <Ionicons name="person-outline" size={16} color="#94a3b8" />
            </View>
            <Text style={styles.bottomNavLabel}>Profil</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default HomeScreen;

// ---------- STYLES ----------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020017",
  },
  safeArea: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  backgroundGrid: {
    position: "absolute",
    inset: 0,
    opacity: 0.14,
    backgroundColor: "transparent",
    backgroundRepeat: "repeat",
  } as any, // RN ne gère pas les backgroundImage, mais on garde l'idée visuelle
  backgroundGlowTop: {
    position: "absolute",
    top: -120,
    left: -80,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 999,
    backgroundColor: "rgba(139,92,246,0.55)",
    opacity: 0.7,
    filter: "blur(60px)" as any,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -120,
    right: -80,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.5)",
    opacity: 0.7,
    filter: "blur(60px)" as any,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.2)",
    backgroundColor: "rgba(15,23,42,0.8)",
  },
  headerButtonText: {
    fontSize: 11,
    color: "#f9fafb",
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 6,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  searchPlaceholder: {
    fontSize: 12,
    color: "#94a3b8",
  },
  iconSmallButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    backgroundColor: "rgba(15,23,42,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainScroll: {
    flex: 1,
    marginTop: 4,
  },
  mainScrollContent: {
    paddingBottom: 80,
  },
  pillsRow: {
    marginBottom: 8,
  },
  pillsRowContent: {
    gap: 6,
    paddingRight: 16,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.8)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  pillText: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  heroSection: {
    marginBottom: 10,
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.15)",
  },
  heroBackground: {
    width: "100%",
    height: 190,
    padding: 0,
  },
  heroContent: {
    position: "absolute",
    inset: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: "space-between",
  },
  heroTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
  },
  heroTagText: {
    fontSize: 10,
    color: "#f9fafb",
  },
  heroTagSecondary: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(15,23,42,0.65)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.2)",
  },
  heroTagSecondaryText: {
    fontSize: 10,
    color: "#e5e7eb",
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 11,
    color: "#e0f2fe",
  },
  heroButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  heroPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.35)",
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  heroPrimaryButtonText: {
    fontSize: 11,
    color: "#e5f4ff",
  },
  heroSecondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  heroSecondaryButtonText: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  widgetsGrid: {
    gap: 8,
    marginBottom: 10,
  },
  radioCard: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  radioLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  radioIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioTexts: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9fafb",
  },
  radioSubtitle: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.35)",
    backgroundColor: "rgba(15,23,42,0.75)",
  },
  radioButtonText: {
    fontSize: 11,
    color: "#f9fafb",
  },
  weatherCard: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.2)",
  },
  weatherLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weatherIconWrapper: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.7)",
  },
  weatherTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9fafb",
  },
  weatherSubtitle: {
    fontSize: 11,
    color: "#e0f2fe",
  },
  weatherRight: {
    alignItems: "flex-end",
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f9fafb",
  },
  weatherUpdate: {
    fontSize: 10,
    color: "#e0f2fe",
  },
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  sectionHeaderAction: {
    fontSize: 11,
    color: "#94a3b8",
  },
  horizontalList: {
    paddingRight: 16,
    gap: 8,
  },
  trackCard: {
    width: 130,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 8,
  },
  trackCardImageWrapper: {
    position: "relative",
    marginBottom: 6,
  },
  trackCardImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  trackCardGlow: {
    flex: 1,
    borderRadius: 12,
  },
  trackIndexBadge: {
    position: "absolute",
    top: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.7)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.3)",
  },
  trackIndexText: {
    fontSize: 10,
    color: "#f9fafb",
  },
  trackPlayButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  trackTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9fafb",
  },
  trackArtist: {
    fontSize: 11,
    color: "#94a3b8",
  },
  trackMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  trackDuration: {
    fontSize: 10,
    color: "#94a3b8",
  },
  creatorCard: {
    width: 180,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 10,
  },
  creatorTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,51,234,0.7)",
  },
  creatorAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9fafb",
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f9fafb",
  },
  creatorUsername: {
    fontSize: 11,
    color: "#94a3b8",
  },
  creatorPlays: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  creatorButtonsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  creatorListenButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.35)",
    backgroundColor: "rgba(147,51,234,0.7)",
  },
  creatorListenButtonText: {
    fontSize: 11,
    color: "#f9fafb",
  },
  creatorFollowButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.25)",
    backgroundColor: "rgba(15,23,42,0.8)",
  },
  creatorFollowButtonText: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  libraryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  libraryItem: {
    flexBasis: (width - 16 * 2 - 8) / 2,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 10,
  },
  libraryIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  libraryIconFavorites: {
    backgroundColor: "rgba(248,113,113,0.2)",
  },
  libraryIconPlaylists: {
    backgroundColor: "rgba(129,140,248,0.25)",
  },
  libraryIconHistory: {
    backgroundColor: "rgba(34,211,238,0.25)",
  },
  libraryIconIA: {
    backgroundColor: "rgba(147,51,234,0.25)",
  },
  libraryTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  librarySubtitle: {
    fontSize: 10,
    color: "#94a3b8",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.9)",
    backgroundColor: "rgba(15,23,42,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomNavItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bottomNavItemActive: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bottomNavIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNavIconActive: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.9)",
    backgroundColor: "rgba(129,140,248,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNavLabel: {
    fontSize: 10,
    color: "#94a3b8",
  },
  bottomNavLabelActive: {
    fontSize: 10,
    color: "#e5e7eb",
  },
});

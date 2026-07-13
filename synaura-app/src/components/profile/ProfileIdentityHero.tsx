import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { MobileProfile, MobileProfileTrack } from '@/api/client';
import { MobileSocialLinks } from '@/components/mobile/MobileSocialLinks';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, radius, shadows } from '@/theme/tokens';

type HeroAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
};

type IconAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function ProfileIdentityHero({
  profile,
  spotlightTrack,
  own = false,
  primaryAction,
  secondaryAction,
  onShare,
}: {
  profile: MobileProfile;
  spotlightTrack?: MobileProfileTrack | null;
  own?: boolean;
  primaryAction: HeroAction;
  secondaryAction?: IconAction;
  onShare: () => void;
}) {
  const responsive = useResponsiveLayout();
  const backdropUri = profile.banner || spotlightTrack?.coverUrl || null;
  const backdropIsCover = !profile.banner && Boolean(spotlightTrack?.coverUrl);
  const hasSocialLinks = Object.values(profile.socialLinks || {}).some(Boolean);
  const stats = own
    ? [
        { label: 'Abonnés', value: compact(profile.followerCount) },
        { label: 'Abonnements', value: compact(profile.followingCount) },
        { label: 'Sons', value: compact(profile.tracks.length || profile.tracksCount) },
        { label: 'Écoutes', value: compact(profile.totalPlays) },
      ]
    : [
        { label: 'Abonnés', value: compact(profile.followerCount) },
        { label: 'Sons', value: compact(profile.tracks.length || profile.tracksCount) },
        { label: 'Écoutes', value: compact(profile.totalPlays) },
        { label: "J'aime", value: compact(profile.totalLikes || profile.tracks.reduce((sum, track) => sum + Number(track.likesCount || 0), 0)) },
      ];

  return (
    <Reveal distance={8} scaleFrom={0.99} style={styles.hero}>
      <View style={[styles.visual, responsive.isTablet && styles.visualTablet]}>
        {backdropUri ? (
          <Image
            source={{ uri: backdropUri }}
            resizeMode="cover"
            blurRadius={backdropIsCover ? 12 : 0}
            style={[StyleSheet.absoluteFillObject, backdropIsCover && styles.coverBackdrop]}
          />
        ) : (
          <LinearGradient
            colors={['#111111', '#483A5E', '#396E75']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <LinearGradient
          colors={['rgba(17,17,17,0.08)', 'rgba(17,17,17,0.78)']}
          locations={[0.2, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.visualTop}>
          <View style={styles.identityLabel}>
            <Ionicons name={profile.isArtist ? 'musical-notes' : 'headset'} size={12} color="#FFFFFF" />
            <Text style={styles.identityLabelText}>{profile.isArtist ? 'Artiste Synaura' : 'Profil Synaura'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={StyleSheet.absoluteFillObject} />
            ) : (
              <Text style={styles.avatarText}>{profile.name.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.name}>{profile.name}</Text>
              {profile.isVerified ? <Ionicons name="checkmark-circle" size={20} color={colors.violet} /> : null}
            </View>
            <Text numberOfLines={1} style={styles.handle}>@{profile.username}</Text>
          </View>
        </View>

        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : own ? (
          <MotionPressable onPress={primaryAction.onPress} style={styles.completeProfile} scaleTo={0.985}>
            <Ionicons name="sparkles-outline" size={16} color={colors.violet} />
            <Text style={styles.completeProfileText}>Ajoute une bio et une bannière à ton univers.</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.violet} />
          </MotionPressable>
        ) : null}

        {(profile.genre.length || profile.location || profile.badges.length) ? (
          <View style={styles.pills}>
            {profile.genre.slice(0, 3).map((genre) => <Text key={genre} style={styles.genrePill}>{genre}</Text>)}
            {profile.location ? (
              <View style={styles.locationPill}>
                <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
                <Text numberOfLines={1} style={styles.locationText}>{profile.location}</Text>
              </View>
            ) : null}
            {profile.badges.slice(0, 2).map((badge) => <Text key={badge} style={styles.badgePill}>{badge}</Text>)}
          </View>
        ) : null}

        {hasSocialLinks ? <View style={styles.socialLinks}><MobileSocialLinks links={profile.socialLinks} /></View> : null}

        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>{stat.value}</Text>
              <Text numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <MotionPressable
            disabled={primaryAction.loading}
            onPress={primaryAction.onPress}
            style={[styles.primaryAction, primaryAction.active && styles.primaryActionActive]}
            scaleTo={0.97}
          >
            <Ionicons name={primaryAction.loading ? 'ellipsis-horizontal' : primaryAction.icon} size={17} color="#FFFFFF" />
            <Text numberOfLines={1} style={styles.primaryActionText}>{primaryAction.label}</Text>
          </MotionPressable>
          <MotionPressable accessibilityLabel="Partager le profil" onPress={onShare} style={styles.iconAction} scaleTo={0.92}>
            <Ionicons name="share-outline" size={18} color={colors.text} />
          </MotionPressable>
          {secondaryAction ? (
            <MotionPressable accessibilityLabel={secondaryAction.label} onPress={secondaryAction.onPress} style={styles.iconAction} scaleTo={0.92}>
              <Ionicons name={secondaryAction.icon} size={19} color={colors.text} />
            </MotionPressable>
          ) : null}
        </View>
      </View>
    </Reveal>
  );
}

export function ProfileIdentityHeroSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonVisual} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonLineWide} />
        <View style={styles.skeletonLine} />
      </View>
    </View>
  );
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value || 0);
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadows.soft },
  visual: { height: 190, overflow: 'hidden', backgroundColor: colors.black },
  visualTablet: { height: 230 },
  coverBackdrop: { transform: [{ scale: 1.08 }], opacity: 0.82 },
  visualTop: { padding: 14, flexDirection: 'row', alignItems: 'flex-start' },
  identityLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(17,17,17,0.44)' },
  identityLabelText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
  identityRow: { minHeight: 54, flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 88, height: 88, marginTop: -44, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 3, borderColor: colors.surface, backgroundColor: '#E7DED2', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontSize: 32, fontWeight: '900' },
  nameBlock: { flex: 1, minWidth: 0, paddingLeft: 12, paddingTop: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, color: colors.text, fontSize: 20, fontWeight: '900' },
  handle: { marginTop: 2, color: colors.textTertiary, fontSize: 11, fontWeight: '800' },
  bio: { marginTop: 10, color: colors.textSecondary, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  completeProfile: { marginTop: 10, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, paddingHorizontal: 11, backgroundColor: colors.violetSoft },
  completeProfileText: { flex: 1, color: colors.violet, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  pills: { marginTop: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  genrePill: { overflow: 'hidden', borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6, color: colors.violet, backgroundColor: colors.violetSoft, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  badgePill: { overflow: 'hidden', borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6, color: '#A2453E', backgroundColor: colors.coralSoft, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  locationPill: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(17,17,17,0.055)' },
  locationText: { flexShrink: 1, color: colors.textSecondary, fontSize: 9, fontWeight: '900' },
  socialLinks: { marginTop: 11 },
  stats: { marginTop: 13, flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 3, paddingVertical: 11 },
  statValue: { maxWidth: '100%', color: colors.text, fontSize: 17, fontWeight: '900' },
  statLabel: { maxWidth: '100%', marginTop: 3, color: colors.textTertiary, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  actions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  primaryAction: { flex: 1, minWidth: 0, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.md, backgroundColor: colors.black, paddingHorizontal: 12 },
  primaryActionActive: { backgroundColor: colors.violet },
  primaryActionText: { flexShrink: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  iconAction: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  skeleton: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  skeletonVisual: { height: 190, backgroundColor: '#DEDAD4' },
  skeletonBody: { minHeight: 122, padding: 14 },
  skeletonAvatar: { width: 88, height: 88, marginTop: -58, borderRadius: radius.lg, borderWidth: 3, borderColor: colors.surface, backgroundColor: '#CAC5BE' },
  skeletonLineWide: { width: '56%', height: 14, marginTop: 12, borderRadius: radius.sm, backgroundColor: '#DEDAD4' },
  skeletonLine: { width: '34%', height: 9, marginTop: 8, borderRadius: radius.sm, backgroundColor: '#E8E4DE' },
});

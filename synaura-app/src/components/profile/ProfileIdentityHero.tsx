import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MobileProfile, MobileProfileTrack } from '@/api/client';
import { MobileSocialLinks } from '@/components/mobile/MobileSocialLinks';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { TrackCover } from '@/components/TrackCover';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, radius } from '@/theme/tokens';

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
  onPlaySpotlight,
}: {
  profile: MobileProfile;
  spotlightTrack?: MobileProfileTrack | null;
  own?: boolean;
  primaryAction: HeroAction;
  secondaryAction?: IconAction;
  onShare: () => void;
  onPlaySpotlight?: () => void;
}) {
  const responsive = useResponsiveLayout();
  const backdropUri = profile.banner || spotlightTrack?.coverUrl || null;
  const backdropIsCover = !profile.banner && Boolean(spotlightTrack?.coverUrl);
  const hasSocialLinks = Object.values(profile.socialLinks || {}).some(Boolean);
  const compactStats = responsive.isTiny || responsive.hasVeryLargeText;
  const visualHeight = responsive.isTablet ? 286 : responsive.isNarrow ? 214 : 238;
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
        { label: "J’aime", value: compact(profile.totalLikes || profile.tracks.reduce((sum, track) => sum + Number(track.likesCount || 0), 0)) },
      ];

  return (
    <Reveal distance={8} scaleFrom={0.995} style={styles.hero}>
      <View style={[styles.visual, { height: visualHeight }]}>
        {backdropUri ? (
          <Image
            source={{ uri: backdropUri }}
            resizeMode="cover"
            blurRadius={backdropIsCover ? 14 : 0}
            style={[StyleSheet.absoluteFillObject, backdropIsCover && styles.coverBackdrop]}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.fallback]}>
            <View style={styles.fallbackRailViolet} />
            <View style={styles.fallbackRailCyan} />
            <View style={styles.fallbackRailCoral} />
          </View>
        )}
        <View style={styles.visualShade} />
        <View style={styles.visualBottomShade} />
        <View style={styles.visualTop}>
          <View style={styles.identityLabel}>
            <Ionicons name={profile.isArtist ? 'musical-notes' : 'headset'} size={12} color="#FFFFFF" />
            <Text style={styles.identityLabelText}>{profile.isArtist ? 'Artiste Synaura' : 'Profil Synaura'}</Text>
          </View>
          {profile.isVerified ? (
            <View style={styles.verifiedLabel}>
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.verifiedLabelText}>Vérifié</Text>
            </View>
          ) : null}
        </View>

        {spotlightTrack ? (
          <MotionPressable onPress={onPlaySpotlight || (() => {})} style={[styles.spotlight, responsive.isNarrow && styles.spotlightNarrow, responsive.isTablet && styles.spotlightTablet]} scaleTo={0.98}>
            <TrackCover track={spotlightTrack} style={[styles.spotlightCover, responsive.isNarrow && styles.spotlightCoverNarrow]} />
            <View style={styles.spotlightCopy}>
              <Text style={styles.spotlightLabel}>À écouter</Text>
              <Text numberOfLines={1} style={styles.spotlightTitle}>{spotlightTrack.title}</Text>
              <Text numberOfLines={1} style={styles.spotlightMeta}>{compact(spotlightTrack.plays || 0)} écoute{Number(spotlightTrack.plays || 0) > 1 ? 's' : ''}</Text>
            </View>
            <View style={[styles.spotlightPlay, responsive.isNarrow && styles.spotlightPlayNarrow]}>
              <Ionicons name="play" size={16} color={colors.text} />
            </View>
          </MotionPressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.identityRow}>
          <View style={[styles.avatar, responsive.isNarrow && styles.avatarNarrow]}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={StyleSheet.absoluteFillObject} />
            ) : (
              <Text style={styles.avatarText}>{profile.name.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <Text maxFontSizeMultiplier={1.16} numberOfLines={2} style={[styles.name, responsive.isNarrow && styles.nameNarrow]}>{profile.name}</Text>
              {profile.isVerified ? <Ionicons name="checkmark-circle" size={20} color={colors.violet} /> : null}
            </View>
            <Text numberOfLines={1} style={styles.handle}>@{profile.username}</Text>
          </View>
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
                <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                <Text numberOfLines={1} style={styles.locationText}>{profile.location}</Text>
              </View>
            ) : null}
            {profile.badges.slice(0, 2).map((badge) => <Text key={badge} style={styles.badgePill}>{badge}</Text>)}
          </View>
        ) : null}

        {hasSocialLinks ? <View style={styles.socialLinks}><MobileSocialLinks links={profile.socialLinks} /></View> : null}

        <View style={[styles.stats, compactStats && styles.statsCompact]}>
          {stats.map((stat) => (
            <View key={stat.label} style={[styles.stat, compactStats && styles.statCompact]}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>{stat.value}</Text>
              <Text numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
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
  hero: { overflow: 'visible' },
  visual: { overflow: 'hidden', borderRadius: radius.sm, backgroundColor: colors.black },
  coverBackdrop: { transform: [{ scale: 1.08 }], opacity: 0.88 },
  fallback: { overflow: 'hidden', backgroundColor: '#171313' },
  fallbackRailViolet: { position: 'absolute', left: '9%', top: '-12%', width: '26%', height: '130%', backgroundColor: '#7357C6', opacity: 0.46, transform: [{ rotate: '14deg' }] },
  fallbackRailCyan: { position: 'absolute', left: '44%', top: '-18%', width: '20%', height: '145%', backgroundColor: '#4A9EAA', opacity: 0.38, transform: [{ rotate: '-9deg' }] },
  fallbackRailCoral: { position: 'absolute', right: '2%', top: '18%', width: '18%', height: '96%', backgroundColor: '#D96D63', opacity: 0.4, transform: [{ rotate: '18deg' }] },
  visualShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.24)' },
  visualBottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '52%', backgroundColor: 'rgba(17,17,17,0.42)' },
  visualTop: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  identityLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(17,17,17,0.58)' },
  identityLabelText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  verifiedLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(17,17,17,0.48)' },
  verifiedLabelText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  spotlight: { position: 'absolute', left: 122, right: 14, bottom: 14, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radius.sm, padding: 7, backgroundColor: 'rgba(247,246,243,0.94)' },
  spotlightNarrow: { left: 104, minHeight: 56, gap: 7, padding: 6 },
  spotlightTablet: { left: undefined, width: 440 },
  spotlightCover: { width: 48, height: 48, borderRadius: radius.sm },
  spotlightCoverNarrow: { width: 42, height: 42 },
  spotlightCopy: { flex: 1, minWidth: 0 },
  spotlightLabel: { color: colors.violet, fontSize: 8, fontWeight: '900' },
  spotlightTitle: { marginTop: 3, color: colors.text, fontSize: 12, fontWeight: '900' },
  spotlightMeta: { marginTop: 2, color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  spotlightPlay: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  spotlightPlayNarrow: { width: 32, height: 32 },
  body: { paddingHorizontal: 4, paddingBottom: 2 },
  identityRow: { minHeight: 66, flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 96, height: 96, marginTop: -48, marginLeft: 10, overflow: 'hidden', borderRadius: 18, borderWidth: 4, borderColor: colors.background, backgroundColor: '#E7DED2', alignItems: 'center', justifyContent: 'center' },
  avatarNarrow: { width: 84, height: 84, marginTop: -42, borderRadius: 16 },
  avatarText: { color: colors.text, fontSize: 32, fontWeight: '900' },
  nameBlock: { flex: 1, minWidth: 0, paddingLeft: 12, paddingTop: 9, paddingRight: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, color: colors.text, fontSize: 25, lineHeight: 29, fontWeight: '900' },
  nameNarrow: { fontSize: 21, lineHeight: 25 },
  handle: { marginTop: 3, color: colors.textTertiary, fontSize: 11, fontWeight: '800' },
  actions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  primaryAction: { flex: 1, minWidth: 0, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.sm, backgroundColor: colors.black, paddingHorizontal: 12 },
  primaryActionActive: { backgroundColor: colors.violet },
  primaryActionText: { flexShrink: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  iconAction: { width: 46, height: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  bio: { marginTop: 14, maxWidth: 680, color: colors.textSecondary, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  completeProfile: { marginTop: 13, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, paddingHorizontal: 11, backgroundColor: colors.violetSoft },
  completeProfileText: { flex: 1, color: colors.violet, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  pills: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  genrePill: { overflow: 'hidden', borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6, color: colors.violet, backgroundColor: colors.violetSoft, fontSize: 9, fontWeight: '900' },
  badgePill: { overflow: 'hidden', borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6, color: '#A2453E', backgroundColor: colors.coralSoft, fontSize: 9, fontWeight: '900' },
  locationPill: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.surfaceMuted },
  locationText: { flexShrink: 1, color: colors.textSecondary, fontSize: 9, fontWeight: '900' },
  socialLinks: { marginTop: 12 },
  stats: { marginTop: 15, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  statsCompact: { flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 3, paddingVertical: 12 },
  statCompact: { flex: 0, width: '50%', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  statValue: { maxWidth: '100%', color: colors.text, fontSize: 18, fontWeight: '900' },
  statLabel: { maxWidth: '100%', marginTop: 3, color: colors.textTertiary, fontSize: 8, fontWeight: '800' },
  skeleton: { overflow: 'hidden', borderRadius: radius.sm },
  skeletonVisual: { height: 220, backgroundColor: '#DEDAD4' },
  skeletonBody: { minHeight: 132, paddingHorizontal: 10 },
  skeletonAvatar: { width: 96, height: 96, marginTop: -48, borderRadius: 18, borderWidth: 4, borderColor: colors.background, backgroundColor: '#CAC5BE' },
  skeletonLineWide: { width: '56%', height: 14, marginTop: 12, borderRadius: radius.sm, backgroundColor: '#DEDAD4' },
  skeletonLine: { width: '34%', height: 9, marginTop: 8, borderRadius: radius.sm, backgroundColor: '#E8E4DE' },
});

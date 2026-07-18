import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { getCreatorStatsDashboard } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { AppHeader } from '@/components/ui/AppHeader';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { SynauraBackground } from '@/components/SynauraBackground';
import { useNativeNotifications } from '@/notifications/NativeNotificationsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, radius, shadows } from '@/theme/tokens';
import { navigatePrimaryTab } from '@/navigation/navigatePrimaryTab';
import type {
  CreatorAudienceStats,
  CreatorPostStat,
  CreatorStatsDashboard,
  CreatorStatsMetric,
  CreatorStatsRange,
  CreatorStatsView,
  CreatorTrackDetail,
  CreatorTrackPoint,
  CreatorTrackStat,
} from '@/stats/types';

const RANGES: Array<{ key: CreatorStatsRange; label: string }> = [
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
  { key: 'all', label: 'Global' },
];

const VIEWS: Array<{ key: CreatorStatsView; label: string }> = [
  { key: 'global', label: 'Vue globale' },
  { key: 'tracks', label: 'Sons' },
  { key: 'posts', label: 'Posts' },
];

const METRICS: Array<{ key: CreatorStatsMetric; label: string }> = [
  { key: 'plays', label: 'Écoutes' },
  { key: 'likes', label: 'Likes' },
  { key: 'uniques', label: 'Uniques' },
  { key: 'retention', label: 'Rétention' },
  { key: 'posts', label: 'Posts' },
  { key: 'comments', label: 'Commentaires' },
];

const EMPTY_HEATMAP = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

function compact(value: number | null | undefined) {
  const number = Number(value || 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return `${Math.round(number * 10) / 10}`;
}

function percent(value: number | null | undefined) {
  const number = Number(value || 0);
  return `${number > 0 ? '+' : ''}${Math.round(number * 10) / 10}%`;
}

function metricLabel(metric: CreatorStatsMetric, value: number | null | undefined) {
  if (metric === 'retention') return value == null ? 'Donnée insuffisante' : `${compact(value)}%`;
  return compact(value);
}

function shortDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function metricValue(
  metric: CreatorStatsMetric,
  trackPoint?: CreatorTrackPoint,
  postPoint?: CreatorStatsDashboard['posts']['series'][number],
) {
  if (metric === 'likes') return Number(trackPoint?.likes || 0) + Number(postPoint?.likes || 0);
  if (metric === 'uniques') return Number(trackPoint?.uniques || 0);
  if (metric === 'retention') return trackPoint?.retention ?? 0;
  if (metric === 'posts') return Number(postPoint?.posts || 0);
  if (metric === 'comments') return Number(postPoint?.comments || 0);
  return Number(trackPoint?.plays || 0);
}

function linePath(values: number[], width: number, height: number) {
  if (!values.length) return '';
  const max = Math.max(1, ...values);
  const step = width / Math.max(1, values.length - 1);
  return values.map((value, index) => {
    const x = index * step;
    const y = height - 18 - (Math.max(0, value) / max) * (height - 36);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

export function StatsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const auth = useAuth();
  const notifications = useNativeNotifications();
  const responsive = useResponsiveLayout();
  const requestId = useRef(0);
  const [range, setRange] = useState<CreatorStatsRange>('30d');
  const [view, setView] = useState<CreatorStatsView>('global');
  const [metric, setMetric] = useState<CreatorStatsMetric>('plays');
  const [selectedTrack, setSelectedTrack] = useState<string>(String(route.params?.trackId || 'all'));
  const [compareTrack, setCompareTrack] = useState('');
  const [dashboard, setDashboard] = useState<CreatorStatsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const linkedTrack = String(route.params?.trackId || 'all');
    setSelectedTrack(linkedTrack);
    setCompareTrack((current) => current === linkedTrack ? '' : current);
  }, [route.params?.trackId]);

  const load = useCallback(async (refresh = false) => {
    if (!auth.user) {
      setLoading(false);
      return;
    }
    const currentRequest = ++requestId.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await getCreatorStatsDashboard(range, selectedTrack, compareTrack);
      if (requestId.current === currentRequest) setDashboard(next);
    } catch (loadError) {
      if (requestId.current === currentRequest) {
        setError(loadError instanceof Error ? loadError.message : 'Statistiques indisponibles.');
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [auth.user, compareTrack, range, selectedTrack]);

  useFocusEffect(useCallback(() => {
    void load(false);
    return () => { requestId.current += 1; };
  }, [load]));

  const overview = dashboard?.overview;
  const posts = dashboard?.posts;
  const tracks = dashboard?.tracks || [];
  const trackSeries = dashboard?.trackSeries || [];
  const realRetention = overview?.avgRetentionEstimated ? 0 : Number(overview?.avgRetention || 0);
  const interactions = Number(overview?.likes || 0) + Number(posts?.likes || 0) + Number(posts?.comments || 0);
  const creatorScore = Math.min(100, Math.round(
    Math.log10(Number(overview?.plays || 0) + 1) * 24
      + Math.log10(interactions + 1) * 18
      + Math.min(28, realRetention / 3)
      + Math.min(20, Number(posts?.engagement || 0) * 2),
  ));
  const countryCount = Object.keys(dashboard?.audience.countries || {}).length;
  const selectedTrackStat = tracks.find((track) => track.id === selectedTrack) || null;
  const sortedTracks = useMemo(() => [...tracks].sort((left, right) => right.plays - left.plays), [tracks]);
  const aiTracks = useMemo(() => sortedTracks.filter((track) => track.isAI).slice(0, 4), [sortedTracks]);
  const postByDate = useMemo(() => new Map((posts?.series || []).map((point) => [point.date, point])), [posts?.series]);
  const chartPoints = view === 'posts'
    ? (posts?.series || []).map((point) => ({ date: point.date, value: metricValue(metric, undefined, point) }))
    : trackSeries.map((point) => ({ date: point.date, value: metricValue(metric, point, view === 'global' ? postByDate.get(point.date) : undefined) }));
  const chartValues = chartPoints.map((point) => point.value);
  const compareValues = (dashboard?.compareSeries || []).map((point) => metricValue(metric, point));
  const realDays = trackSeries.filter((point) => point.dataQuality === 'real').length;
  const uniqueListeners = trackSeries.reduce((total, point) => total + Number(point.uniques || 0), 0);
  const metricWidth: StyleProp<ViewStyle> = {
    width: responsive.isTablet ? '23.5%' : responsive.isTiny || responsive.hasVeryLargeText ? '100%' : '48.5%',
  };

  if (!auth.user) {
    return (
      <SynauraBackground variant="warm">
        <View style={[styles.authGate, responsive.pageContent]}>
          <View style={styles.authIcon}><Ionicons name="analytics-outline" size={28} color={colors.violet} /></View>
          <Text style={styles.authTitle}>Tes statistiques créateur</Text>
          <Text style={styles.authText}>Connecte-toi pour retrouver tes écoutes, tes posts, ton audience et ta rétention.</Text>
          <MotionPressable onPress={() => navigation.navigate('Login')} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Se connecter</Text>
          </MotionPressable>
        </View>
      </SynauraBackground>
    );
  }

  return (
    <SynauraBackground variant="warm">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.violet} colors={[colors.violet]} />}
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          { paddingTop: 0, paddingBottom: responsive.miniPlayerClearance + 20 },
        ]}
      >
        <AppHeader
          flush
          eyebrow="Tableau de bord"
          title="Stats Synaura"
          subtitle="Sons, posts, audience et engagement"
          onBack={() => navigation.goBack()}
          actions={[
            { icon: notifications.unreadCount ? 'notifications' : 'notifications-outline', label: 'Activité', badge: notifications.unreadCount, onPress: () => navigation.navigate('Notifications') },
            { icon: 'refresh-outline', label: 'Actualiser', onPress: () => void load(true) },
          ]}
        />

        <HorizontalChoices
          value={range}
          options={RANGES}
          onChange={(next) => setRange(next as CreatorStatsRange)}
          accessibilityLabel="Période des statistiques"
        />

        {error ? (
          <Pressable onPress={() => void load(false)} style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.coral} />
            <Text numberOfLines={2} style={styles.errorText}>{error}</Text>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}

        {loading && !dashboard ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.violet} />
            <Text style={styles.loadingText}>Lecture de tes signaux réels...</Text>
          </View>
        ) : null}

        {dashboard ? (
          <>
            <Reveal distance={8}>
              <LinearGradient colors={['#111111', '#282321', '#30302B']} style={styles.scoreHero}>
                <View style={styles.scoreTop}>
                  <View style={styles.scoreBadge}><Ionicons name="sparkles" size={14} color="#F3C7A8" /><Text style={styles.scoreBadgeText}>Score créateur</Text></View>
                  <Text style={styles.periodLabel}>{RANGES.find((item) => item.key === range)?.label}</Text>
                </View>
                <View style={[styles.scoreBody, responsive.isTiny && styles.scoreBodyTiny]}>
                  <Text style={styles.scoreValue}>{creatorScore}</Text>
                  <View style={styles.scoreCopy}>
                    <Text style={styles.scoreTitle}>Performance générale</Text>
                    <Text style={styles.scoreText}>Calculée uniquement avec tes écoutes, interactions, rétention mesurée et activité sociale.</Text>
                  </View>
                </View>
                <View style={styles.scoreFooter}>
                  <HeroStat value={compact(overview?.followers)} label="Abonnés" />
                  <HeroStat value={compact(countryCount)} label="Pays détectés" />
                  <HeroStat value={compact(overview?.totalTracks)} label="Sons" />
                </View>
              </LinearGradient>
            </Reveal>

            <View style={styles.metricGrid}>
              <MetricCard style={metricWidth} tone="dark" icon="headset-outline" label="Écoutes" value={compact(overview?.plays)} hint={percent(overview?.playsVariation)} />
              <MetricCard style={metricWidth} tone="coral" icon="heart" label="Likes sons" value={compact(overview?.likes)} hint={percent(overview?.likesVariation)} />
              <MetricCard style={metricWidth} tone="violet" icon="document-text-outline" label="Posts publiés" value={compact(posts?.postsInRange)} hint={`${compact(posts?.totalPosts)} au total`} />
              <MetricCard style={metricWidth} tone="cyan" icon="chatbubbles-outline" label="Interactions posts" value={compact(Number(posts?.likes || 0) + Number(posts?.comments || 0))} hint={`${compact(posts?.engagement)} / post`} />
            </View>

            <DataQualityPanel realDays={realDays} overview={overview} />

            <Panel eyebrow="Lecture" title="Choisir ce que tu analyses">
              <HorizontalChoices value={view} options={VIEWS} onChange={(next) => setView(next as CreatorStatsView)} accessibilityLabel="Vue statistique" />
              <HorizontalChoices value={metric} options={METRICS} onChange={(next) => setMetric(next as CreatorStatsMetric)} accessibilityLabel="Métrique" compact />
            </Panel>

            <TrackChoicePanel
              tracks={tracks}
              selectedTrack={selectedTrack}
              compareTrack={compareTrack}
              onSelect={(id) => {
                setSelectedTrack(id);
                if (compareTrack === id) setCompareTrack('');
              }}
              onCompare={setCompareTrack}
            />

            <TrendPanel
              metric={metric}
              points={chartPoints}
              values={chartValues}
              compareValues={metric === 'posts' || metric === 'comments' ? [] : compareValues}
              width={Math.max(240, responsive.availableContentWidth - 30)}
              selectedTitle={selectedTrackStat?.title || 'Tous les sons'}
              compareTitle={tracks.find((track) => track.id === compareTrack)?.title || ''}
            />

            <InsightPanel dashboard={dashboard} />

            <BestContentPanel
              track={overview?.bestTrack || sortedTracks[0] || null}
              post={posts?.bestPost || null}
              onTrack={(id) => navigation.navigate('TrackDetail', { trackId: id })}
              onPost={(id) => navigation.navigate('PostDetail', { postId: id })}
            />

            <HeatmapPanel matrix={dashboard.heatmap.length ? dashboard.heatmap : EMPTY_HEATMAP} />

            {selectedTrack !== 'all' ? (
              <FunnelPanel detail={dashboard.trackDetail} trackTitle={selectedTrackStat?.title || 'Ce morceau'} />
            ) : null}

            <AudiencePanel audience={dashboard.audience} />

            <TrackRankingPanel
              tracks={sortedTracks.slice(0, 8)}
              onOpen={(track) => navigation.navigate('TrackDetail', { trackId: track.id })}
            />

            <PostRankingPanel
              posts={posts?.posts.slice(0, 8) || []}
              onOpen={(post) => navigation.navigate('PostDetail', { postId: post.id })}
            />

            <TypeBreakdownPanel byType={posts?.byType || {}} />
            <AITracksPanel tracks={aiTracks} onOpen={(track) => navigation.navigate('TrackDetail', { trackId: track.id })} />

            <View style={styles.metricGrid}>
              <SmallSummary style={metricWidth} icon="time-outline" value={`${compact(overview?.listenHours)} h`} label={`Temps d'écoute${overview?.listenHoursEstimated ? ' estimé' : ''}`} />
              <SmallSummary style={metricWidth} icon="people-outline" value={compact(uniqueListeners)} label="Uniques mesurés" />
              <SmallSummary style={metricWidth} icon="analytics-outline" value={overview?.avgRetentionEstimated ? '—' : `${compact(overview?.avgRetention)}%`} label={overview?.avgRetentionEstimated ? 'Rétention insuffisante' : 'Rétention moyenne'} />
              <SmallSummary style={metricWidth} icon="musical-notes-outline" value={compact(overview?.totalTracks)} label="Sons publiés" />
            </View>

            <Panel eyebrow="Continuer" title="Agir depuis tes chiffres">
              <View style={styles.actionsRow}>
                <ActionButton icon="sparkles-outline" label="Créer un son" primary onPress={() => navigation.navigate('AIStudio')} />
                <ActionButton icon="person-outline" label="Mon profil" onPress={() => navigatePrimaryTab(navigation, 'Profile')} />
                <ActionButton icon="flash-outline" label="Events" onPress={() => navigation.navigate('City')} />
              </View>
            </Panel>
          </>
        ) : null}
      </ScrollView>
    </SynauraBackground>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text numberOfLines={1} style={styles.heroStatValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function MetricCard({ style, tone, icon, label, value, hint }: {
  style?: StyleProp<ViewStyle>;
  tone: 'dark' | 'coral' | 'violet' | 'cyan';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  hint: string;
}) {
  const palette = {
    dark: { background: colors.text, foreground: '#FFFFFF' },
    coral: { background: colors.coral, foreground: '#FFFFFF' },
    violet: { background: colors.violet, foreground: '#FFFFFF' },
    cyan: { background: '#327E78', foreground: '#FFFFFF' },
  }[tone];
  return (
    <View style={[styles.metricCard, style, { backgroundColor: palette.background }]}>
      <View style={styles.metricIcon}><Ionicons name={icon} size={18} color={palette.foreground} /></View>
      <Text style={[styles.metricLabel, { color: palette.foreground }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: palette.foreground }]}>{value}</Text>
      <Text numberOfLines={1} style={[styles.metricHint, { color: palette.foreground }]}>{hint}</Text>
    </View>
  );
}

function SmallSummary({ style, icon, value, label }: {
  style?: StyleProp<ViewStyle>;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
}) {
  return (
    <View style={[styles.summaryCard, style]}>
      <Ionicons name={icon} size={18} color={colors.textTertiary} />
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>{value}</Text>
      <Text numberOfLines={2} style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>{eyebrow}</Text>
      <Text style={styles.panelTitle}>{title}</Text>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function HorizontalChoices({ value, options, onChange, accessibilityLabel, compact: compactMode = false }: {
  value: string;
  options: Array<{ key: string; label: string }>;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  compact?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow} accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const active = value === option.key;
        return (
          <MotionPressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.choice, compactMode && styles.choiceCompact, active && styles.choiceActive]}
            scaleTo={0.96}
          >
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{option.label}</Text>
          </MotionPressable>
        );
      })}
    </ScrollView>
  );
}

function DataQualityPanel({ realDays, overview }: { realDays: number; overview?: CreatorStatsDashboard['overview'] }) {
  const measured = realDays > 0;
  return (
    <View style={[styles.qualityPanel, measured ? styles.qualityPanelGood : styles.qualityPanelWarning]}>
      <Ionicons name={measured ? 'checkmark-circle' : 'alert-circle-outline'} size={21} color={measured ? colors.success : '#A56B2A'} />
      <View style={styles.qualityCopy}>
        <Text style={styles.qualityTitle}>{measured ? 'Données de lecture mesurées' : 'Mesure encore incomplète'}</Text>
        <Text style={styles.qualityText}>
          {measured
            ? `${realDays} jour${realDays > 1 ? 's' : ''} avec des démarrages et fins de lecture réels.`
            : overview?.plays
              ? "Les écoutes existent, mais pas encore assez d'événements pour calculer une rétention fiable."
              : 'Les statistiques se rempliront avec les premières écoutes de tes sons.'}
        </Text>
      </View>
    </View>
  );
}

function TrackChoicePanel({ tracks, selectedTrack, compareTrack, onSelect, onCompare }: {
  tracks: CreatorTrackStat[];
  selectedTrack: string;
  compareTrack: string;
  onSelect: (id: string) => void;
  onCompare: (id: string) => void;
}) {
  return (
    <Panel eyebrow="Comparaison" title="Sons analysés">
      <Text style={styles.fieldLabel}>Analyser</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackChoiceRow}>
        <TrackChip active={selectedTrack === 'all'} label="Tous les sons" onPress={() => onSelect('all')} />
        {tracks.map((track) => <TrackChip key={track.id} active={selectedTrack === track.id} label={track.title} onPress={() => onSelect(track.id)} />)}
      </ScrollView>
      {tracks.length > 1 ? (
        <>
          <Text style={styles.fieldLabel}>Comparer avec</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackChoiceRow}>
            <TrackChip active={!compareTrack} label="Aucune comparaison" onPress={() => onCompare('')} />
            {tracks.filter((track) => track.id !== selectedTrack).map((track) => (
              <TrackChip key={`compare-${track.id}`} active={compareTrack === track.id} label={track.title} onPress={() => onCompare(track.id)} />
            ))}
          </ScrollView>
        </>
      ) : null}
    </Panel>
  );
}

function TrackChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={[styles.trackChip, active && styles.trackChipActive]} scaleTo={0.97}>
      <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={15} color={active ? colors.violet : colors.textTertiary} />
      <Text numberOfLines={1} style={[styles.trackChipText, active && styles.trackChipTextActive]}>{label}</Text>
    </MotionPressable>
  );
}

function TrendPanel({ metric, points, values, compareValues, width, selectedTitle, compareTitle }: {
  metric: CreatorStatsMetric;
  points: Array<{ date: string; value: number }>;
  values: number[];
  compareValues: number[];
  width: number;
  selectedTitle: string;
  compareTitle: string;
}) {
  const height = 176;
  const path = linePath(values, width, height);
  const comparePath = linePath(compareValues, width, height);
  const area = path ? `${path} L ${width} ${height} L 0 ${height} Z` : '';
  const last = values.at(-1) || 0;
  const previous = values.at(-2) || 0;
  return (
    <Panel eyebrow="Tendance" title="Activité sur la période">
      <View style={styles.chartMeta}>
        <View style={styles.chartLegend}><View style={styles.legendDotPrimary} /><Text numberOfLines={1} style={styles.chartLegendText}>{selectedTitle}</Text></View>
        {compareTitle ? <View style={styles.chartLegend}><View style={styles.legendDotCompare} /><Text numberOfLines={1} style={styles.chartLegendText}>{compareTitle}</Text></View> : null}
      </View>
      <View style={styles.chartValueRow}>
        <Text style={styles.chartValue}>{metricLabel(metric, last)}</Text>
        <Text style={styles.chartDirection}>{last >= previous ? 'En hausse sur le dernier point' : 'Plus calme sur le dernier point'}</Text>
      </View>
      {values.length ? (
        <View style={styles.chartFrame}>
          <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <Defs>
              <SvgLinearGradient id="statsArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.violet} stopOpacity="0.28" />
                <Stop offset="1" stopColor={colors.violet} stopOpacity="0.01" />
              </SvgLinearGradient>
            </Defs>
            {area ? <Path d={area} fill="url(#statsArea)" /> : null}
            {path ? <Path d={path} fill="none" stroke={colors.violet} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
            {comparePath ? <Path d={comparePath} fill="none" stroke={colors.coral} strokeWidth={2} strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" /> : null}
          </Svg>
        </View>
      ) : <EmptyLine text="Aucun point mesuré sur cette période." />}
      <View style={styles.chartDates}>
        <Text style={styles.chartDate}>{shortDate(points[0]?.date)}</Text>
        <Text style={styles.chartDate}>{shortDate(points.at(-1)?.date)}</Text>
      </View>
    </Panel>
  );
}

function InsightPanel({ dashboard }: { dashboard: CreatorStatsDashboard }) {
  const bestDay = [...dashboard.trackSeries].sort((left, right) => right.plays - left.plays)[0];
  const topCountry = Object.entries(dashboard.audience.countries).sort((left, right) => right[1] - left[1])[0];
  const topDevice = Object.entries(dashboard.audience.devices).sort((left, right) => right[1] - left[1])[0];
  const insights = [
    bestDay?.plays ? `${shortDate(bestDay.date)} est ton meilleur jour avec ${compact(bestDay.plays)} écoute${bestDay.plays > 1 ? 's' : ''}.` : null,
    topCountry ? `${topCountry[0]} représente ${compact(topCountry[1])}% de ton audience détectée.` : null,
    topDevice ? `${topDevice[0]} est utilisé pour ${compact(topDevice[1])}% des écoutes identifiées.` : null,
  ].filter((value): value is string => Boolean(value));
  return (
    <Panel eyebrow="Lecture utile" title="Ce que les données racontent">
      {insights.length ? insights.map((insight, index) => (
        <View key={insight} style={[styles.insightRow, index > 0 && styles.rowDivider]}>
          <View style={styles.insightIndex}><Text style={styles.insightIndexText}>{index + 1}</Text></View>
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      )) : <EmptyLine text="Pas encore assez de signaux pour dégager une tendance." />}
    </Panel>
  );
}

function BestContentPanel({ track, post, onTrack, onPost }: {
  track: { id: string; title: string; plays: number } | CreatorTrackStat | null;
  post: CreatorPostStat | null;
  onTrack: (id: string) => void;
  onPost: (id: string) => void;
}) {
  return (
    <Panel eyebrow="Meilleur contenu" title="Ce qui attire le plus">
      <View style={styles.bestRows}>
        <Pressable disabled={!track} onPress={() => track && onTrack(track.id)} style={styles.bestRow}>
          <View style={styles.bestIcon}><Ionicons name="musical-notes" size={18} color={colors.violet} /></View>
          <View style={styles.bestCopy}><Text style={styles.bestKind}>Son</Text><Text numberOfLines={1} style={styles.bestTitle}>{track?.title || 'Aucun son mesuré'}</Text></View>
          <Text style={styles.bestMeta}>{compact(track?.plays)} écoutes</Text>
        </Pressable>
        <Pressable disabled={!post} onPress={() => post && onPost(post.id)} style={[styles.bestRow, styles.rowDivider]}>
          <View style={styles.bestIcon}><Ionicons name="document-text" size={18} color={colors.coral} /></View>
          <View style={styles.bestCopy}><Text style={styles.bestKind}>Post</Text><Text numberOfLines={1} style={styles.bestTitle}>{post?.trackTitle || post?.content || 'Aucun post mesuré'}</Text></View>
          <Text style={styles.bestMeta}>{compact(Number(post?.likes || 0) + Number(post?.comments || 0))} interactions</Text>
        </Pressable>
      </View>
    </Panel>
  );
}

function HeatmapPanel({ matrix }: { matrix: number[][] }) {
  const max = Math.max(1, ...matrix.flat());
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return (
    <Panel eyebrow="Moments d'écoute" title="Quand ton audience écoute">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatmapScroll}>
        <View style={styles.heatmapLabels}>
          {days.map((day) => <Text key={day} style={styles.heatmapDay}>{day}</Text>)}
        </View>
        <View>
          {matrix.slice(0, 7).map((row, dayIndex) => (
            <View key={`day-${dayIndex}`} style={styles.heatmapRow}>
              {Array.from({ length: 24 }, (_, hour) => {
                const value = Number(row?.[hour] || 0);
                const opacity = value ? 0.16 + (value / max) * 0.84 : 0.05;
                return <View key={`${dayIndex}-${hour}`} accessibilityLabel={`${days[dayIndex]} ${hour} h, ${value} écoute${value > 1 ? 's' : ''}`} style={[styles.heatmapCell, { backgroundColor: `rgba(115,87,198,${opacity})` }]} />;
              })}
            </View>
          ))}
          <View style={styles.heatmapHours}><Text style={styles.heatmapHour}>0 h</Text><Text style={styles.heatmapHour}>6 h</Text><Text style={styles.heatmapHour}>12 h</Text><Text style={styles.heatmapHour}>18 h</Text><Text style={styles.heatmapHour}>23 h</Text></View>
        </View>
      </ScrollView>
    </Panel>
  );
}

function FunnelPanel({ detail, trackTitle }: { detail: CreatorTrackDetail | null; trackTitle: string }) {
  const funnel = detail?.funnel;
  const stages = [
    { label: 'Lecture lancée', value: funnel?.starts ? 100 : 0, suffix: `${compact(funnel?.starts)} départs` },
    { label: '25 %', value: Number(funnel?.p25Rate || 0), suffix: `${compact(funnel?.p25Rate)}%` },
    { label: '50 %', value: Number(funnel?.p50Rate || 0), suffix: `${compact(funnel?.p50Rate)}%` },
    { label: '75 %', value: Number(funnel?.p75Rate || 0), suffix: `${compact(funnel?.p75Rate)}%` },
    { label: 'Écoute complète', value: Number(funnel?.completeRate || 0), suffix: `${compact(funnel?.completeRate)}%` },
  ];
  return (
    <Panel eyebrow="Rétention" title={trackTitle}>
      {funnel?.starts ? stages.map((stage) => (
        <View key={stage.label} style={styles.progressRow}>
          <View style={styles.progressLabels}><Text style={styles.progressLabel}>{stage.label}</Text><Text style={styles.progressValue}>{stage.suffix}</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, stage.value))}%` }]} /></View>
        </View>
      )) : <EmptyLine text="Pas encore assez de lectures suivies pour afficher le parcours." />}
      {detail?.sources?.length ? (
        <View style={styles.sourceList}>
          <Text style={styles.fieldLabel}>Sources de lecture</Text>
          {detail.sources.slice(0, 5).map((source) => (
            <View key={source.source} style={styles.sourceRow}><Text style={styles.sourceName}>{source.source || 'direct'}</Text><Text style={styles.sourceValue}>{compact(source.plays)} lectures · {compact(source.completes)} complètes</Text></View>
          ))}
        </View>
      ) : null}
    </Panel>
  );
}

function AudiencePanel({ audience }: { audience: CreatorAudienceStats }) {
  return (
    <Panel eyebrow="Audience" title="Qui écoute et depuis où">
      <AudienceGroup title="Pays" icon="globe-outline" values={audience.countries} />
      <AudienceGroup title="Appareils" icon="phone-portrait-outline" values={audience.devices} />
      <AudienceGroup title="Systèmes" icon="hardware-chip-outline" values={audience.os} />
    </Panel>
  );
}

function AudienceGroup({ title, icon, values }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((left, right) => right[1] - left[1]).slice(0, 5);
  return (
    <View style={styles.audienceGroup}>
      <View style={styles.audienceTitleRow}><Ionicons name={icon} size={16} color={colors.textTertiary} /><Text style={styles.fieldLabel}>{title}</Text></View>
      {entries.length ? entries.map(([label, value]) => (
        <View key={label} style={styles.audienceRow}>
          <Text numberOfLines={1} style={styles.audienceName}>{label}</Text>
          <View style={styles.audienceTrack}><View style={[styles.audienceFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} /></View>
          <Text style={styles.audienceValue}>{compact(value)}%</Text>
        </View>
      )) : <EmptyLine text="Aucune donnée détectée pour cette catégorie." />}
    </View>
  );
}

function TrackRankingPanel({ tracks, onOpen }: { tracks: CreatorTrackStat[]; onOpen: (track: CreatorTrackStat) => void }) {
  const max = Math.max(1, ...tracks.map((track) => track.plays));
  return (
    <Panel eyebrow="Classement sons" title="Titres qui performent">
      {tracks.length ? tracks.map((track, index) => (
        <Pressable key={track.id} onPress={() => onOpen(track)} style={[styles.rankingRow, index > 0 && styles.rowDivider]}>
          <Text style={styles.rank}>{index + 1}</Text>
          <View style={styles.rankingCover}>{track.coverUrl ? <Image source={{ uri: track.coverUrl }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="musical-note" size={17} color={colors.textTertiary} />}</View>
          <View style={styles.rankingCopy}>
            <View style={styles.rankingTitleLine}><Text numberOfLines={1} style={styles.rankingTitle}>{track.title}</Text>{track.isAI ? <Text style={styles.aiBadge}>IA</Text> : null}</View>
            <View style={styles.rankingBar}><View style={[styles.rankingFill, { width: `${(track.plays / max) * 100}%` }]} /></View>
            <Text style={styles.rankingMeta}>{compact(track.plays)} écoutes · {compact(track.likes)} likes · {compact(track.retention)}% rétention</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>
      )) : <EmptyLine text="Aucun son publié pour le moment." />}
    </Panel>
  );
}

function PostRankingPanel({ posts, onOpen }: { posts: CreatorPostStat[]; onOpen: (post: CreatorPostStat) => void }) {
  return (
    <Panel eyebrow="Classement posts" title="Posts qui font réagir">
      {posts.length ? posts.map((post, index) => (
        <Pressable key={post.id} onPress={() => onOpen(post)} style={[styles.postRow, index > 0 && styles.rowDivider]}>
          <View style={styles.postIndex}><Text style={styles.postIndexText}>{index + 1}</Text></View>
          <View style={styles.postCopy}>
            <Text style={styles.postType}>{post.typeLabel}</Text>
            <Text numberOfLines={2} style={styles.postTitle}>{post.trackTitle || post.content || 'Post sans texte'}</Text>
            <Text style={styles.postMeta}>{compact(post.likes)} likes · {compact(post.comments)} commentaires</Text>
          </View>
          {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} /> : <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
        </Pressable>
      )) : <EmptyLine text="Aucun post publié pour le moment." />}
    </Panel>
  );
}

function TypeBreakdownPanel({ byType }: { byType: Record<string, number> }) {
  const entries = Object.entries(byType).sort((left, right) => right[1] - left[1]);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <Panel eyebrow="Formats" title="Types de posts publiés">
      {entries.length ? entries.map(([label, value]) => (
        <View key={label} style={styles.progressRow}>
          <View style={styles.progressLabels}><Text style={styles.progressLabel}>{label}</Text><Text style={styles.progressValue}>{compact(value)}</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFillCoral, { width: `${(value / max) * 100}%` }]} /></View>
        </View>
      )) : <EmptyLine text="Les formats apparaîtront après ton premier post." />}
    </Panel>
  );
}

function AITracksPanel({ tracks, onOpen }: { tracks: CreatorTrackStat[]; onOpen: (track: CreatorTrackStat) => void }) {
  return (
    <Panel eyebrow="IA Studio" title="Meilleurs sons IA">
      {tracks.length ? tracks.map((track, index) => (
        <Pressable key={track.id} onPress={() => onOpen(track)} style={[styles.simpleRow, index > 0 && styles.rowDivider]}>
          <View style={styles.bestIcon}><Ionicons name="sparkles" size={17} color={colors.violet} /></View>
          <Text numberOfLines={1} style={styles.simpleTitle}>{track.title}</Text>
          <Text style={styles.simpleValue}>{compact(track.plays)} écoutes</Text>
        </Pressable>
      )) : <EmptyLine text="Aucun son IA mesuré." />}
    </Panel>
  );
}

function ActionButton({ icon, label, primary = false, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; primary?: boolean; onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={[styles.actionButton, primary && styles.actionButtonPrimary]} scaleTo={0.97}>
      <Ionicons name={icon} size={17} color={primary ? '#FFFFFF' : colors.text} />
      <Text style={[styles.actionButtonText, primary && styles.actionButtonTextPrimary]}>{label}</Text>
    </MotionPressable>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <Text style={styles.emptyLine}>{text}</Text>;
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 42 },
  authIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  authTitle: { marginTop: 16, color: colors.text, fontSize: 23, lineHeight: 28, fontWeight: '900', textAlign: 'center' },
  authText: { maxWidth: 280, marginTop: 7, color: colors.textSecondary, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  primaryAction: { minWidth: 160, height: 46, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.violet },
  primaryActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  errorBanner: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(217,109,99,0.2)', backgroundColor: colors.coralSoft, paddingHorizontal: 12 },
  errorText: { flex: 1, minWidth: 0, color: colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  loadingState: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  choiceRow: { gap: 7, paddingRight: 8 },
  choice: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14 },
  choiceCompact: { minHeight: 38, paddingHorizontal: 12 },
  choiceActive: { borderColor: colors.violet, backgroundColor: colors.violet },
  choiceText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  choiceTextActive: { color: '#FFFFFF' },
  scoreHero: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)', padding: 16, ...shadows.floating },
  scoreTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderLeftWidth: 3, borderLeftColor: colors.coral, paddingLeft: 8, paddingVertical: 4 },
  scoreBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  periodLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '800' },
  scoreBody: { marginTop: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  scoreBodyTiny: { alignItems: 'flex-start', flexDirection: 'column', gap: 5 },
  scoreValue: { color: '#FFFFFF', fontSize: 58, lineHeight: 62, fontWeight: '900' },
  scoreCopy: { flex: 1, minWidth: 0, paddingBottom: 5 },
  scoreTitle: { color: '#FFFFFF', fontSize: 18, lineHeight: 22, fontWeight: '900' },
  scoreText: { marginTop: 4, color: 'rgba(255,255,255,0.58)', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  scoreFooter: { marginTop: 18, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.16)', paddingTop: 13 },
  heroStat: { flex: 1, minWidth: 0 },
  heroStatValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  heroStatLabel: { marginTop: 2, color: 'rgba(255,255,255,0.48)', fontSize: 8, fontWeight: '800' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metricCard: { minHeight: 132, overflow: 'hidden', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.13)', padding: 13, ...shadows.soft },
  metricIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)' },
  metricLabel: { marginTop: 12, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', opacity: 0.68 },
  metricValue: { marginTop: 2, fontSize: 25, lineHeight: 30, fontWeight: '900' },
  metricHint: { marginTop: 2, fontSize: 9, fontWeight: '700', opacity: 0.7 },
  summaryCard: { minHeight: 112, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderTopWidth: 2, borderTopColor: colors.cyan, backgroundColor: colors.surface, padding: 13 },
  summaryValue: { marginTop: 11, color: colors.text, fontSize: 20, fontWeight: '900' },
  summaryLabel: { marginTop: 3, color: colors.textSecondary, fontSize: 9, lineHeight: 13, fontWeight: '700' },
  qualityPanel: { minHeight: 76, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: 3, padding: 13 },
  qualityPanelGood: { borderColor: 'rgba(46,157,104,0.2)', backgroundColor: 'rgba(46,157,104,0.08)' },
  qualityPanelWarning: { borderColor: 'rgba(201,155,72,0.22)', backgroundColor: 'rgba(201,155,72,0.09)' },
  qualityCopy: { flex: 1, minWidth: 0 },
  qualityTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  qualityText: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  panel: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, padding: 15 },
  panelEyebrow: { color: colors.textTertiary, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  panelTitle: { marginTop: 3, color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  panelBody: { marginTop: 13, gap: 12 },
  fieldLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  trackChoiceRow: { gap: 7, paddingRight: 8 },
  trackChip: { maxWidth: 210, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, paddingHorizontal: 11 },
  trackChipActive: { borderColor: colors.violet, backgroundColor: colors.violetSoft },
  trackChipText: { maxWidth: 160, color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  trackChipTextActive: { color: colors.text },
  chartMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chartLegend: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDotPrimary: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.violet },
  legendDotCompare: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral },
  chartLegendText: { maxWidth: 210, color: colors.textSecondary, fontSize: 9, fontWeight: '800' },
  chartValueRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  chartValue: { color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: '900' },
  chartDirection: { flex: 1, color: colors.textTertiary, fontSize: 9, lineHeight: 13, fontWeight: '700', textAlign: 'right' },
  chartFrame: { overflow: 'hidden', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: '#111116' },
  chartDates: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartDate: { color: colors.textTertiary, fontSize: 8, fontWeight: '800' },
  insightRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  insightIndex: { width: 28, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  insightIndexText: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  insightText: { flex: 1, minWidth: 0, color: colors.textSecondary, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  bestRows: { gap: 0 },
  bestRow: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  bestIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  bestCopy: { flex: 1, minWidth: 0 },
  bestKind: { color: colors.textTertiary, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  bestTitle: { marginTop: 2, color: colors.text, fontSize: 12, fontWeight: '900' },
  bestMeta: { maxWidth: 94, color: colors.textSecondary, fontSize: 8, lineHeight: 12, fontWeight: '800', textAlign: 'right' },
  heatmapScroll: { paddingRight: 8 },
  heatmapLabels: { gap: 3, marginRight: 6 },
  heatmapDay: { width: 25, height: 9, color: colors.textTertiary, fontSize: 7, fontWeight: '800' },
  heatmapRow: { flexDirection: 'row', gap: 2, marginBottom: 3 },
  heatmapCell: { width: 9, height: 9, borderRadius: 2 },
  heatmapHours: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
  heatmapHour: { color: colors.textTertiary, fontSize: 7, fontWeight: '700' },
  progressRow: { gap: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  progressLabel: { flex: 1, color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  progressValue: { color: colors.text, fontSize: 10, fontWeight: '900' },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: colors.surfaceMuted },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.violet },
  progressFillCoral: { height: '100%', borderRadius: 3, backgroundColor: colors.coral },
  sourceList: { marginTop: 5, gap: 7 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sourceName: { flex: 1, color: colors.text, fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  sourceValue: { color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  audienceGroup: { gap: 7 },
  audienceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  audienceRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 7 },
  audienceName: { width: 72, color: colors.textSecondary, fontSize: 9, fontWeight: '800' },
  audienceTrack: { flex: 1, height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: colors.surfaceMuted },
  audienceFill: { height: '100%', borderRadius: 3, backgroundColor: colors.cyan },
  audienceValue: { width: 38, color: colors.text, fontSize: 9, fontWeight: '900', textAlign: 'right' },
  rankingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  rank: { width: 16, color: colors.textTertiary, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  rankingCover: { width: 45, height: 45, overflow: 'hidden', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  rankingCopy: { flex: 1, minWidth: 0 },
  rankingTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankingTitle: { flex: 1, minWidth: 0, color: colors.text, fontSize: 11, fontWeight: '900' },
  aiBadge: { overflow: 'hidden', borderRadius: radius.sm, backgroundColor: colors.violetSoft, paddingHorizontal: 5, paddingVertical: 2, color: colors.violet, fontSize: 7, fontWeight: '900' },
  rankingBar: { height: 4, marginTop: 5, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.surfaceMuted },
  rankingFill: { height: '100%', borderRadius: 2, backgroundColor: colors.coral },
  rankingMeta: { marginTop: 4, color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  postRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9 },
  postIndex: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coralSoft },
  postIndexText: { color: colors.coral, fontSize: 9, fontWeight: '900' },
  postCopy: { flex: 1, minWidth: 0 },
  postType: { color: colors.textTertiary, fontSize: 7, fontWeight: '900', textTransform: 'uppercase' },
  postTitle: { marginTop: 2, color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '900' },
  postMeta: { marginTop: 3, color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  postImage: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  simpleRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  simpleTitle: { flex: 1, minWidth: 0, color: colors.text, fontSize: 11, fontWeight: '900' },
  simpleValue: { color: colors.textSecondary, fontSize: 9, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { minHeight: 44, flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, paddingHorizontal: 12 },
  actionButtonPrimary: { backgroundColor: colors.violet },
  actionButtonText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  actionButtonTextPrimary: { color: '#FFFFFF' },
  emptyLine: { borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 12, color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '700' },
});

export default StatsScreen;

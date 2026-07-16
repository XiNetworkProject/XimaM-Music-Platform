export type CreatorStatsRange = '7d' | '30d' | '90d' | 'all';
export type CreatorStatsView = 'global' | 'tracks' | 'posts';
export type CreatorStatsMetric = 'plays' | 'likes' | 'uniques' | 'retention' | 'posts' | 'comments';

export type CreatorStatsOverview = {
  plays: number;
  playsVariation: number;
  likes: number;
  likesVariation: number;
  followers: number;
  totalTracks: number;
  normalTracks: number;
  aiTracks: number;
  listenHours: number;
  listenHoursEstimated?: boolean;
  avgRetention: number;
  avgRetentionEstimated?: boolean;
  bestTrack: { id: string; title: string; plays: number } | null;
};

export type CreatorTrackStat = {
  id: string;
  title: string;
  coverUrl: string;
  duration: number;
  createdAt: string;
  plays: number;
  likes: number;
  isAI: boolean;
  isRemix: boolean;
  retention: number;
  trend7d: number;
};

export type CreatorTrackPoint = {
  date: string;
  plays: number;
  uniques: number;
  likes: number;
  starts: number;
  completes: number;
  retention: number | null;
  listenMs: number;
  dataQuality: 'real' | 'insufficient';
};

export type CreatorPostPoint = {
  date: string;
  posts: number;
  likes: number;
  comments: number;
};

export type CreatorPostStat = {
  id: string;
  type: string;
  typeLabel: string;
  content: string;
  imageUrl: string | null;
  trackTitle: string | null;
  createdAt: string;
  likes: number;
  comments: number;
  score: number;
};

export type CreatorPostStats = {
  totalPosts: number;
  postsInRange: number;
  likes: number;
  comments: number;
  engagement: number;
  byType: Record<string, number>;
  series: CreatorPostPoint[];
  bestPost: CreatorPostStat | null;
  posts: CreatorPostStat[];
};

export type CreatorAudienceStats = {
  countries: Record<string, number>;
  devices: Record<string, number>;
  os: Record<string, number>;
  browsers: Record<string, number>;
};

export type CreatorTrackDetail = {
  daily: Array<{
    day: string;
    views: number;
    plays: number;
    completes: number;
    likes: number;
    total_listen_ms: number;
    retention_complete_rate: number;
  }>;
  sources: Array<{ source: string; plays: number; completes: number }>;
  funnel: { starts: number; p25Rate: number; p50Rate: number; p75Rate: number; completeRate: number };
};

export type CreatorStatsDashboard = {
  overview: CreatorStatsOverview;
  tracks: CreatorTrackStat[];
  trackSeries: CreatorTrackPoint[];
  compareSeries: CreatorTrackPoint[];
  posts: CreatorPostStats;
  audience: CreatorAudienceStats;
  heatmap: number[][];
  trackDetail: CreatorTrackDetail | null;
};

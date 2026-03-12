'use client';

import { Music, Play, Clock, Eye, Tag, Globe, Heart, Users, Calendar, FileText, Shield } from 'lucide-react';
import type { TrackMeta } from './TrackListEditor';
import type { FeaturingArtist } from './FeaturingSearch';
import type { Credits } from './CreditsEditor';
import type { ReleaseType } from './ReleaseTypeSelector';
import { MOODS, LANGUAGES, CREDIT_ROLES, type MoodKey } from '@/lib/genres';

interface Props {
  releaseType: ReleaseType;
  title: string;
  artist: string;
  description: string;
  genres: string[];
  mood: MoodKey | null;
  language: string;
  tags: string[];
  isPublic: boolean;
  isExplicit: boolean;
  visibility: 'public' | 'private' | 'unlisted';
  coverFile: File | null;
  audioFile: File | null;
  tracks: TrackMeta[];
  featuring: FeaturingArtist[];
  credits: Credits;
  scheduleMode: 'now' | 'scheduled';
  scheduledAt: string;
  duration: number;
  copyrightOwner: string;
  copyrightYear: number;
}

function CoverThumb({ file }: { file: File | null }) {
  if (!file) return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
      <Music className="w-8 h-8 text-white/30" />
    </div>
  );
  return <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />;
}

export default function UploadPreview(props: Props) {
  const {
    releaseType, title, artist, description, genres, mood, language, tags,
    isPublic, isExplicit, visibility, coverFile, audioFile, tracks,
    featuring, credits, scheduleMode, scheduledAt, duration, copyrightOwner, copyrightYear,
  } = props;

  const moodLabel = mood ? MOODS.find((m) => m.key === mood)?.label : null;
  const langLabel = language ? LANGUAGES.find((l) => l.key === language)?.label : null;
  const totalDuration = releaseType === 'single' ? duration : tracks.reduce((s, t) => s + t.duration, 0);
  const totalSize = releaseType === 'single'
    ? (audioFile?.size || 0) / 1024 / 1024
    : tracks.reduce((s, t) => s + t.file.size, 0) / 1024 / 1024;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const activeCredits = CREDIT_ROLES.filter((r) => credits[r.key]?.trim());

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/[0.08] flex-shrink-0">
            <CoverThumb file={coverFile} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium uppercase">
                {releaseType}
              </span>
              {isExplicit && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">E</span>}
            </div>
            <h3 className="text-lg font-bold text-white truncate">{title || 'Sans titre'}</h3>
            <p className="text-sm text-white/50">{artist}</p>
            {featuring.length > 0 && (
              <p className="text-xs text-white/30 mt-0.5">
                feat. {featuring.map((f) => f.name).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Track list for EP/Album */}
        {releaseType !== 'single' && tracks.length > 0 && (
          <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
            {tracks.map((t, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2">
                <span className="w-5 text-center text-[10px] text-white/30 font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white/80 truncate block">{t.title}</span>
                </div>
                <span className="text-[10px] text-white/30">{fmt(t.duration)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <InfoRow icon={Clock} label="Duree" value={fmt(totalDuration)} />
        <InfoRow icon={FileText} label="Taille" value={`${totalSize.toFixed(1)} MB`} />
        <InfoRow icon={Eye} label="Visibilite" value={visibility === 'public' ? 'Public' : visibility === 'unlisted' ? 'Non-liste' : 'Prive'} />
        <InfoRow icon={Calendar} label="Publication" value={scheduleMode === 'now' ? 'Immediate' : scheduledAt ? new Date(scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Programmee'} />
        {moodLabel && <InfoRow icon={Heart} label="Mood" value={moodLabel} />}
        {langLabel && <InfoRow icon={Globe} label="Langue" value={langLabel} />}
        <InfoRow icon={Shield} label="Copyright" value={`${copyrightOwner} ${copyrightYear}`} />
        {releaseType !== 'single' && <InfoRow icon={Music} label="Pistes" value={`${tracks.length}`} />}
      </div>

      {/* Genres */}
      {genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <span key={g} className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/50">{g}</span>
          ))}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300">#{t}</span>
          ))}
        </div>
      )}

      {/* Credits */}
      {activeCredits.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
          <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1">Credits</div>
          {activeCredits.map((r) => (
            <div key={r.key} className="flex justify-between text-xs">
              <span className="text-white/40">{r.label}</span>
              <span className="text-white/60">{credits[r.key]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1">Description</div>
          <p className="text-xs text-white/50 whitespace-pre-wrap line-clamp-4">{description}</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <Icon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
      <span className="text-white/40">{label}</span>
      <span className="text-white/70 ml-auto truncate">{value}</span>
    </div>
  );
}

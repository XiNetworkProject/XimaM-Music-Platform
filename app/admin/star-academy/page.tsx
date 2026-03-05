'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, RefreshCw, ExternalLink, Play, Pause, Square, X, Check, Eye, Music } from 'lucide-react';

interface Application {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  age: number;
  email: string;
  phone: string | null;
  location: string;
  tiktok_handle: string;
  category: string;
  level: string | null;
  link: string | null;
  bio: string;
  availability: string | null;
  audio_url: string | null;
  audio_filename: string | null;
  synaura_username: string | null;
  user_id: string | null;
  status: 'pending' | 'reviewing' | 'accepted' | 'winner' | 'rejected';
  admin_notes: string | null;
  tracking_token: string;
  notification_sent_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente',        color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30' },
  reviewing: { label: "En cours d'écoute", color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/30' },
  accepted:  { label: 'Retenu(e)',          color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  winner:    { label: 'Gagnant(e)',         color: 'text-yellow-400',  bg: 'bg-yellow-500/15 border-yellow-500/30' },
  rejected:  { label: 'Non retenu(e)',      color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/30' },
};

const STATUSES = ['all', 'pending', 'reviewing', 'accepted', 'winner', 'rejected'] as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: 'text-white/50', bg: 'bg-white/5' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

function InlineAudioPlayer({ appId, filename, compact }: { appId: string; filename?: string | null; compact?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  const [autoPlay, setAutoPlay] = useState(false);

  const loadAudio = useCallback(async () => {
    if (url) return url;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/star-academy/${appId}?audio=1`);
      if (res.ok) {
        const json = await res.json();
        const signedUrl = json.signedUrl ?? null;
        setUrl(signedUrl);
        return signedUrl;
      } else {
        setError(true);
        return null;
      }
    } catch {
      setError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, [appId, url]);

  // Auto-play after URL is set
  useEffect(() => {
    if (autoPlay && url && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setError(true));
      setAutoPlay(false);
    }
  }, [autoPlay, url]);

  const toggle = async () => {
    if (!url) {
      setAutoPlay(true);
      await loadAudio();
      return;
    }
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().catch(() => setError(true));
      setPlaying(true);
    }
  };

  const stop = () => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setPlaying(false);
    setProgress(0);
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setProgress(el.currentTime);
      setDuration(el.duration || 0);
    };
    const onEnd = () => { setPlaying(false); setProgress(0); };
    const onErr = () => { setError(true); setPlaying(false); };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    el.addEventListener('error', onErr);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('error', onErr);
    };
  }, [url]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggle}
          disabled={loading}
          className="rounded-lg p-1.5 text-foreground-tertiary hover:text-violet-400 hover:bg-violet-500/10 transition"
          title={playing ? 'Pause' : 'Écouter le CV vocal'}
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        {url && <audio ref={audioRef} src={url} preload="metadata" />}
        {error && <span className="text-[10px] text-red-400">Erreur</span>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-secondary bg-white/5 p-4">
      <div className="flex items-center gap-2 text-xs text-foreground-tertiary mb-3">
        <Music size={13} />
        CV Vocal — {filename ?? 'audio'}
      </div>

      {error && <p className="text-xs text-red-400 mb-2">Impossible de charger l&apos;audio.</p>}

      {!url && !loading && !error && (
        <button
          onClick={loadAudio}
          className="flex items-center gap-2 rounded-xl bg-violet-600/20 border border-violet-500/30 px-4 py-2.5 text-sm font-semibold text-violet-300 hover:bg-violet-600/30 transition w-full justify-center"
        >
          <Play size={14} />
          Charger et écouter
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-foreground-tertiary py-2">
          <RefreshCw size={13} className="animate-spin" />
          Chargement…
        </div>
      )}

      {url && (
        <>
          <audio ref={audioRef} src={url} preload="metadata" />
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="rounded-full w-9 h-9 flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white transition shrink-0"
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0">
              {/* Progress bar */}
              <div
                className="h-1.5 rounded-full bg-white/10 cursor-pointer overflow-hidden"
                onClick={(e) => {
                  const el = audioRef.current;
                  if (!el || !duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  el.currentTime = pct * duration;
                }}
              >
                <div
                  className="h-full rounded-full bg-violet-500 transition-[width] duration-150"
                  style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-foreground-tertiary">
                <span>{fmtTime(progress)}</span>
                <span>{duration ? fmtTime(duration) : '--:--'}</span>
              </div>
            </div>

            <button
              onClick={stop}
              className="rounded-lg p-1.5 text-foreground-tertiary hover:text-foreground-primary hover:bg-white/5 transition"
              title="Arrêter"
            >
              <Square size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminStarAcademyPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected]         = useState<Application | null>(null);
  const [updating, setUpdating]         = useState(false);
  const [notes, setNotes]               = useState('');
  const [newStatus, setNewStatus]       = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (search) params.set('search', search);
      const res  = await fetch(`/api/admin/star-academy?${params}`);
      const data = await res.json();
      setApplications(data.applications ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = (app: Application) => {
    setSelected(app);
    setNotes(app.admin_notes ?? '');
    setNewStatus(app.status);
  };

  const closeDetail = () => { setSelected(null); setNotes(''); setNewStatus(''); };

  const handleUpdate = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/star-academy/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_notes: notes }),
      });
      if (res.ok) {
        await fetchData();
        closeDetail();
      }
    } finally {
      setUpdating(false);
    }
  };

  const counts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-foreground-primary">Star Academy TikTok</h1>
          <p className="text-xs text-foreground-tertiary mt-0.5">
            {total} candidature{total !== 1 ? 's' : ''} enregistrée{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/star-academy-tiktok"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-xs text-foreground-secondary hover:text-foreground-primary transition"
          >
            <ExternalLink size={12} />
            Voir la page
          </a>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-xs text-foreground-secondary hover:text-foreground-primary transition"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['pending', 'reviewing', 'accepted', 'winner', 'rejected'] as const).map((s) => {
          const cfg = STATUS_LABELS[s];
          const cnt = counts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s === filterStatus ? 'all' : s)}
              className={`rounded-2xl border p-4 text-left transition ${filterStatus === s ? cfg.bg : 'border-border-secondary bg-white/3 hover:bg-white/5'}`}
            >
              <div className={`text-2xl font-black ${cfg.color}`}>{cnt}</div>
              <div className="text-xs text-foreground-tertiary mt-0.5">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            placeholder="Nom, email, pseudo TikTok…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-border-secondary bg-background-fog-thin pl-9 pr-4 py-2 text-sm text-foreground-primary placeholder-foreground-tertiary outline-none focus:border-violet-500/50 transition"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm text-foreground-primary outline-none"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'Tous les statuts' : STATUS_LABELS[s]?.label}</option>)}
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border-secondary overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-border-secondary text-xs font-semibold text-foreground-tertiary">
          <span>Candidat</span>
          <span>TikTok</span>
          <span>Catégorie</span>
          <span>Date</span>
          <span>Statut</span>
          <span />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-foreground-tertiary text-sm">Chargement…</div>
        )}

        {!loading && applications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-foreground-tertiary">
            <span className="text-3xl mb-2">🎤</span>
            <span className="text-sm">Aucune candidature trouvée</span>
          </div>
        )}

        {!loading && applications.map((app, idx) => (
          <div key={app.id} className={`border-b border-border-secondary/50 last:border-b-0 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'}`}>
            {/* Row */}
            <div className="grid md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground-primary truncate">{app.full_name}</div>
                <div className="text-xs text-foreground-tertiary truncate">{app.email}</div>
              </div>
              <div className="text-sm text-foreground-secondary truncate">{app.tiktok_handle}</div>
              <div className="text-xs text-foreground-secondary">{app.category}</div>
              <div className="text-xs text-foreground-tertiary">{fmt(app.created_at)}</div>
              <StatusBadge status={app.status} />
              <div className="flex items-center gap-2">
                <InlineAudioPlayer appId={app.id} compact />
                <button
                  onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  className="rounded-lg p-1.5 text-foreground-tertiary hover:text-foreground-primary hover:bg-white/5 transition"
                  title="Voir détails"
                >
                  {expandedId === app.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                  onClick={() => openDetail(app)}
                  className="rounded-xl border border-border-secondary bg-background-fog-thin px-3 py-1.5 text-xs font-semibold text-foreground-secondary hover:text-foreground-primary transition"
                >
                  Gérer
                </button>
              </div>
            </div>

            {/* Expanded row */}
            {expandedId === app.id && (
              <div className="border-t border-border-secondary/30 bg-white/[0.02] px-4 py-4 space-y-4 text-xs">
                {/* Audio player */}
                <InlineAudioPlayer appId={app.id} filename={app.audio_filename} />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div><span className="text-foreground-tertiary">Âge :</span> <span className="text-foreground-secondary">{app.age} ans</span></div>
                    <div><span className="text-foreground-tertiary">Ville :</span> <span className="text-foreground-secondary">{app.location}</span></div>
                    {app.phone && <div><span className="text-foreground-tertiary">Tél :</span> <span className="text-foreground-secondary">{app.phone}</span></div>}
                    <div><span className="text-foreground-tertiary">Niveau :</span> <span className="text-foreground-secondary">{app.level ?? '—'}</span></div>
                    {app.link && <div><span className="text-foreground-tertiary">Lien :</span> <a href={app.link} target="_blank" className="text-violet-400 underline">{app.link}</a></div>}
                    {app.synaura_username && <div><span className="text-foreground-tertiary">Synaura :</span> <span className="text-foreground-secondary">@{app.synaura_username}</span></div>}
                    {app.availability && <div><span className="text-foreground-tertiary">Dispos :</span> <span className="text-foreground-secondary">{app.availability}</span></div>}
                    {app.notification_sent_at && <div><span className="text-foreground-tertiary">Email envoyé :</span> <span className="text-foreground-secondary">{fmt(app.notification_sent_at)}</span></div>}
                  </div>
                  <div>
                    <div className="text-foreground-tertiary mb-1">Présentation :</div>
                    <p className="text-foreground-secondary leading-relaxed whitespace-pre-wrap">{app.bio}</p>
                    {app.admin_notes && (
                      <div className="mt-3 rounded-xl border border-border-secondary bg-white/5 p-3">
                        <div className="text-foreground-tertiary mb-1">Notes admin :</div>
                        <p className="text-foreground-secondary">{app.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {total > 30 && (
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-border-secondary bg-background-fog-thin px-4 py-2 text-sm disabled:opacity-40"
          >
            ← Précédent
          </button>
          <span className="flex items-center text-sm text-foreground-tertiary">
            Page {page} / {Math.ceil(total / 30)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 30)}
            className="rounded-xl border border-border-secondary bg-background-fog-thin px-4 py-2 text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* ── Modal de gestion ────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-lg rounded-3xl border border-border-secondary bg-background-primary p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground-primary">{selected.full_name}</h2>
                <p className="text-xs text-foreground-tertiary mt-0.5">{selected.email} · {selected.tiktok_handle}</p>
              </div>
              <button onClick={closeDetail} className="rounded-xl p-1.5 text-foreground-tertiary hover:text-foreground-primary hover:bg-white/5 transition">
                <X size={16} />
              </button>
            </div>

            {/* Audio player */}
            <InlineAudioPlayer appId={selected.id} filename={selected.audio_filename} />

            {/* Bio */}
            <div className="rounded-2xl border border-border-secondary bg-white/3 p-4">
              <div className="text-xs text-foreground-tertiary mb-2">Présentation</div>
              <p className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-wrap">{selected.bio}</p>
            </div>

            {/* Changer le statut */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-foreground-tertiary block">Statut</label>
              <div className="grid grid-cols-2 gap-2">
                {(['pending', 'reviewing', 'accepted', 'winner', 'rejected'] as const).map((s) => {
                  const cfg = STATUS_LABELS[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${newStatus === s ? cfg.bg + ' ' + cfg.color : 'border-border-secondary bg-white/3 text-foreground-tertiary hover:bg-white/6'}`}
                    >
                      {newStatus === s && <span className="mr-1.5">✓</span>}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              {newStatus === 'accepted' && selected.user_id && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                  1 mois Premium Synaura sera automatiquement active sur son compte.
                </div>
              )}
              {newStatus === 'winner' && selected.user_id && (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                  3 mois Premium Synaura seront automatiquement actives sur son compte (recompense gagnant).
                </div>
              )}
            </div>

            {/* Notes admin */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-tertiary block">Notes internes (non visibles du candidat)</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-border-secondary bg-white/5 px-4 py-2.5 text-sm text-foreground-primary placeholder-foreground-tertiary outline-none focus:border-violet-500/50 resize-none transition"
                placeholder="Commentaires, décision, raison…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-60 transition"
              >
                <Check size={14} />
                {updating ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                onClick={closeDetail}
                className="rounded-xl border border-border-secondary bg-white/5 px-4 py-2.5 text-sm text-foreground-secondary hover:text-foreground-primary transition"
              >
                Annuler
              </button>
            </div>

            <p className="text-xs text-foreground-tertiary text-center">
              Un email de notification sera envoyé automatiquement si le statut change.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

type ChallengeContentType = 'clip' | 'variation' | 'track' | 'open';
type ChallengeStatus = 'upcoming' | 'active' | 'ended';
type ChallengeClubSlug = 'feedback' | 'collab' | 'remix' | 'ai';

type MusicChallengeSummary = {
  id: string;
  title: string;
  prompt: string;
  contentType: ChallengeContentType;
  startsAt: string;
  endsAt: string;
  status: ChallengeStatus;
  accentColor: string | null;
  coverUrl: string | null;
  sourceTrackId: string | null;
  sourceTrackType: 'track' | 'ai_track' | null;
  clubSlug: ChallengeClubSlug | null;
  entryCount: number;
};

type ChallengeEntryDisplay = {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
  contentType: string;
  contentId: string;
  title: string;
  coverUrl: string | null;
  href: string;
  createdAt: string;
};

const CONTENT_TYPE_LABELS: Record<ChallengeContentType, string> = {
  clip: 'Clip',
  variation: 'Variation IA',
  track: 'Morceau',
  open: 'Libre',
};

const STATUS_LABELS: Record<ChallengeStatus, string> = {
  upcoming: 'À venir',
  active: 'Actif',
  ended: 'Terminé',
};

const STATUS_STYLES: Record<ChallengeStatus, string> = {
  upcoming: 'bg-[#C99B48]/14 text-[#8a6a2f]',
  active: 'bg-[#2E9D68]/14 text-[#1f6e48]',
  ended: 'bg-black/[0.06] text-black/45',
};

const CLUB_LABELS: Record<ChallengeClubSlug, string> = {
  feedback: 'Feedback Lab',
  collab: 'Open Feat',
  remix: 'Remix Lab',
  ai: 'IA Lab',
};

function toDatetimeLocal(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

type FormState = {
  title: string;
  prompt: string;
  contentType: ChallengeContentType;
  startsAt: string;
  endsAt: string;
  sourceTrackId: string;
  sourceTrackType: '' | 'track' | 'ai_track';
  clubSlug: '' | ChallengeClubSlug;
  accentColor: string;
  coverUrl: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  prompt: '',
  contentType: 'open',
  startsAt: '',
  endsAt: '',
  sourceTrackId: '',
  sourceTrackType: '',
  clubSlug: '',
  accentColor: '',
  coverUrl: '',
};

function AppearanceBadges({ challenge }: { challenge: MusicChallengeSummary }) {
  const active = challenge.status === 'active';
  const badges: string[] = [];
  if (active) badges.push('Scroll');
  if (active && challenge.contentType === 'clip') badges.push('Remix Lab');
  if (active && challenge.contentType === 'variation') badges.push('IA Lab');
  if (challenge.contentType === 'open') badges.push('Créer');

  if (!badges.length) {
    return <span className="text-xs font-semibold text-black/32">Nulle part pour l'instant</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span key={badge} className="rounded-full bg-[#7357C6]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#7357C6]">
          {badge}
        </span>
      ))}
    </div>
  );
}

export default function ChallengesAdminClient() {
  const [challenges, setChallenges] = useState<MusicChallengeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [entriesFor, setEntriesFor] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChallengeEntryDisplay[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/challenges', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json) => setChallenges(Array.isArray(json?.challenges) ? json.challenges : []))
      .catch(() => notify.error('Défis', 'Impossible de charger les défis.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (challenge: MusicChallengeSummary) => {
    setEditingId(challenge.id);
    setForm({
      title: challenge.title,
      prompt: challenge.prompt,
      contentType: challenge.contentType,
      startsAt: toDatetimeLocal(challenge.startsAt),
      endsAt: toDatetimeLocal(challenge.endsAt),
      sourceTrackId: challenge.sourceTrackId || '',
      sourceTrackType: challenge.sourceTrackType || '',
      clubSlug: challenge.clubSlug || '',
      accentColor: challenge.accentColor || '',
      coverUrl: challenge.coverUrl || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = async () => {
    setSaving(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      prompt: form.prompt.trim(),
      contentType: form.contentType,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : '',
      sourceTrackId: form.sourceTrackId.trim() || null,
      sourceTrackType: form.sourceTrackType || null,
      clubSlug: form.clubSlug || null,
      accentColor: form.accentColor.trim() || null,
      coverUrl: form.coverUrl.trim() || null,
    };
    try {
      const res = await fetch(editingId ? `/api/admin/challenges/${encodeURIComponent(editingId)}` : '/api/admin/challenges', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Action impossible.');
      notify.success(editingId ? 'Défi modifié' : 'Défi créé', editingId ? undefined : `Identifiant : ${json.id}`);
      setFormOpen(false);
      load();
    } catch (error: any) {
      setFormError(error?.message || 'Action impossible.');
    } finally {
      setSaving(false);
    }
  };

  const quickAction = async (id: string, action: 'activate_now' | 'end_now') => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/challenges/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickAction: action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Action impossible.');
      notify.success(action === 'activate_now' ? 'Défi activé' : 'Défi terminé');
      load();
    } catch (error: any) {
      notify.error('Erreur', error?.message || 'Action impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/challenges/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Suppression impossible.');
      notify.success('Défi supprimé');
      setConfirmDeleteId(null);
      load();
    } catch (error: any) {
      notify.error('Erreur', error?.message || 'Suppression impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleEntries = (id: string) => {
    if (entriesFor === id) {
      setEntriesFor(null);
      return;
    }
    setEntriesFor(id);
    setEntriesLoading(true);
    fetch(`/api/admin/challenges/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json) => setEntries(Array.isArray(json?.challenge?.entries) ? json.challenge.entries : []))
      .catch(() => {
        notify.error('Participations', 'Impossible de charger les participations.');
        setEntries([]);
      })
      .finally(() => setEntriesLoading(false));
  };

  return (
    <div className="bg-[#F7F6F3] p-5 sm:p-6" style={{ color: '#111111' }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7357C6]">Console admin</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Défis musicaux</h1>
          <p className="mt-1 text-sm font-semibold text-black/48">Créer, ajuster les dates et suivre les participations réelles.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> Nouveau défi
        </button>
      </div>

      {loading ? (
        <div className="grid min-h-[200px] place-items-center rounded-[1.5rem] border border-black/[0.08] bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-[#7357C6]" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-black/[0.14] bg-white p-10 text-center">
          <Trophy className="mx-auto h-9 w-9 text-black/18" />
          <p className="mt-3 text-sm font-semibold text-black/48">Aucun défi pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="rounded-[1.5rem] border border-black/[0.08] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${STATUS_STYLES[challenge.status]}`}>
                      {STATUS_LABELS[challenge.status]}
                    </span>
                    <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black/50">
                      {CONTENT_TYPE_LABELS[challenge.contentType]}
                    </span>
                    {challenge.clubSlug ? (
                      <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black/50">
                        {CLUB_LABELS[challenge.clubSlug]}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 text-base font-black">{challenge.title}</h2>
                  <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-black/48">{challenge.prompt}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-black/40">
                    <Calendar className="h-3.5 w-3.5" />
                    Du {formatDate(challenge.startsAt)} au {formatDate(challenge.endsAt)}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-black/40">
                    {challenge.entryCount} participation{challenge.entryCount > 1 ? 's' : ''} réelle{challenge.entryCount > 1 ? 's' : ''}
                    {challenge.sourceTrackId ? ` · source ${challenge.sourceTrackId}` : ''}
                  </p>
                  <div className="mt-2">
                    <AppearanceBadges challenge={challenge} />
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Link
                    href={`/challenges/${challenge.id}`}
                    target="_blank"
                    className="inline-flex h-9 items-center rounded-full border border-black/[0.1] px-3 text-xs font-black text-black/60 transition hover:border-black hover:text-black"
                  >
                    Prévisualiser
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(challenge)}
                    className="inline-flex h-9 items-center rounded-full border border-black/[0.1] px-3 text-xs font-black text-black/60 transition hover:border-black hover:text-black"
                  >
                    Modifier
                  </button>
                  {challenge.status !== 'active' ? (
                    <button
                      type="button"
                      disabled={busyId === challenge.id}
                      onClick={() => quickAction(challenge.id, 'activate_now')}
                      className="inline-flex h-9 items-center rounded-full bg-[#7357C6] px-3 text-xs font-black text-white transition hover:bg-[#5f46a8] disabled:opacity-60"
                    >
                      Activer maintenant
                    </button>
                  ) : null}
                  {challenge.status !== 'ended' ? (
                    <button
                      type="button"
                      disabled={busyId === challenge.id}
                      onClick={() => quickAction(challenge.id, 'end_now')}
                      className="inline-flex h-9 items-center rounded-full border border-black/[0.1] px-3 text-xs font-black text-black/60 transition hover:border-black hover:text-black disabled:opacity-60"
                    >
                      Terminer maintenant
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleEntries(challenge.id)}
                    className="inline-flex h-9 items-center rounded-full border border-black/[0.1] px-3 text-xs font-black text-black/60 transition hover:border-black hover:text-black"
                  >
                    Participations
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(challenge.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D96D63]/30 text-[#D96D63] transition hover:bg-[#D96D63]/10"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {entriesFor === challenge.id ? (
                <div className="mt-4 rounded-[1.1rem] border border-black/[0.06] bg-black/[0.02] p-3">
                  {entriesLoading ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-black/40">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des participations…
                    </div>
                  ) : entries.length ? (
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <Link
                          key={entry.id}
                          href={entry.href}
                          target="_blank"
                          className="flex items-center gap-2.5 rounded-[0.9rem] bg-white p-2.5 transition hover:bg-black/[0.03]"
                        >
                          {entry.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.coverUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                          ) : (
                            <span className="h-9 w-9 rounded-lg bg-black/[0.06]" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-black">{entry.title}</span>
                            <span className="block truncate text-[11px] font-semibold text-black/44">@{entry.username || entry.name}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-black/40">Aucune participation publiée pour l'instant.</p>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setFormOpen(false)}>
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[1.6rem] bg-white p-5 shadow-[0_30px_80px_rgba(0,0,0,0.3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">{editingId ? 'Modifier le défi' : 'Nouveau défi'}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.05]">
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError ? (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#D96D63]/10 p-3 text-xs font-bold text-[#9b352e]">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {formError}
              </div>
            ) : null}

            <div className="space-y-3">
              <Field label="Titre">
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="Consigne">
                <textarea
                  value={form.prompt}
                  onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                  rows={3}
                  className={`${inputClass} h-auto py-2`}
                />
              </Field>
              <Field label="Type">
                <select
                  value={form.contentType}
                  onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value as ChallengeContentType }))}
                  className={inputClass}
                >
                  <option value="open">Libre (open)</option>
                  <option value="clip">Clip</option>
                  <option value="variation">Variation IA</option>
                  <option value="track">Morceau</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Début">
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Fin">
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="sourceTrackId (optionnel)">
                  <input value={form.sourceTrackId} onChange={(e) => setForm((f) => ({ ...f, sourceTrackId: e.target.value }))} className={inputClass} />
                </Field>
                <Field label="sourceTrackType">
                  <select
                    value={form.sourceTrackType}
                    onChange={(e) => setForm((f) => ({ ...f, sourceTrackType: e.target.value as FormState['sourceTrackType'] }))}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    <option value="track">track</option>
                    <option value="ai_track">ai_track</option>
                  </select>
                </Field>
              </div>
              <Field label="Club associé (optionnel)">
                <select
                  value={form.clubSlug}
                  onChange={(e) => setForm((f) => ({ ...f, clubSlug: e.target.value as FormState['clubSlug'] }))}
                  className={inputClass}
                >
                  <option value="">Aucun</option>
                  <option value="remix">Remix Lab</option>
                  <option value="ai">IA Lab</option>
                  <option value="feedback">Feedback Lab</option>
                  <option value="collab">Open Feat</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Couleur d'accent (optionnel)">
                  <input value={form.accentColor} onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))} placeholder="#7357C6" className={inputClass} />
                </Field>
                <Field label="Cover URL (optionnel)">
                  <input value={form.coverUrl} onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))} className={inputClass} />
                </Field>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={submitForm}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#171313] text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Enregistrer' : 'Créer le défi'}
            </button>
          </div>
        </div>
      ) : null}

      {confirmDeleteId ? (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="w-full max-w-sm rounded-[1.4rem] bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <p className="flex items-center gap-2 text-sm font-black text-[#9b352e]">
              <AlertTriangle className="h-4 w-4" /> Supprimer ce défi ?
            </p>
            <p className="mt-2 text-xs font-semibold text-black/52">
              Le défi et ses participations enregistrées seront définitivement supprimés. Les Clips, Variations ou morceaux publiés ne sont pas touchés.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="h-10 flex-1 rounded-full bg-black/[0.06] text-xs font-black text-black/60"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busyId === confirmDeleteId}
                onClick={() => confirmDelete(confirmDeleteId)}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#D96D63] text-xs font-black text-white disabled:opacity-60"
              >
                {busyId === confirmDeleteId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  'h-10 w-full rounded-xl border border-black/[0.1] bg-[#F7F6F3] px-3 text-sm font-semibold text-[#111111] outline-none transition focus:border-[#7357C6] focus:ring-2 focus:ring-[#7357C6]/15';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.08em] text-black/44">{label}</span>
      {children}
    </label>
  );
}

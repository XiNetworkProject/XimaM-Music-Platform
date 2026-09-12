'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAudioPlayer, useAudioTime } from '@/app/providers';
import { getBrowserAudioCore } from '@/lib/audio/AudioCore';
import { useTrackWaveform } from '@/hooks/useTrackWaveform';
import { useProfilePeek } from '@/components/profile/useProfilePeek';
import { SynauraOverlayDescription, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';
import type { ContextSurfaceRendererProps } from '@/components/context-surfaces/ContextSurfaceController';
import { commentRequest, useComments, useCommentsViewer, useSharedMoments, useSharedReactions, useCommentCount } from '@/lib/commentsClient';
import { clusterMusicalMoments, mergeComments, momentTime, supportsMoments, type CommentEntity, type CommentEntityType, type SocialComment, type MusicalCluster } from '@/lib/commentsModel';
import { MOMENT_REACTION_META, MOMENT_REACTION_TYPES } from '@/lib/momentReactions';
import { getCdnUrl } from '@/lib/cdn';
import MusicalWaveform from './MusicalWaveform';
import { Heart, MessageCircle, Send, Clock3, X, ArrowRight, Loader2 } from 'lucide-react';

type Draft = { text: string; timestamp: number | null; mode: 'conversation' | 'moments'; replyId: string | null; editId: string | null; selectedCommentId: string | null; clusterId: string | null; scrollTop: number };
const EMPTY_DRAFT: Draft = { text: '', timestamp: null, mode: 'conversation', replyId: null, editId: null, selectedCommentId: null, clusterId: null, scrollTop: 0 };
const actionClass = 'syn-interactive min-h-11 min-w-11 rounded-lg px-2 text-xs font-semibold hover:bg-[var(--syn-soft)] disabled:opacity-40';

function CaptureMoment({ trackId, capture }: { trackId: string; capture: (time: number) => void }) {
  const time = useAudioTime();
  const active = getBrowserAudioCore()?.getSnapshot().currentTrack?._id === trackId;
  return <button type="button" disabled={!active} className={`${actionClass} flex items-center gap-1.5 text-[var(--syn-accent)]`} onClick={() => {
    const core = getBrowserAudioCore();
    if (core?.getSnapshot().currentTrack?._id === trackId) capture(core.getTimeSnapshot().currentTime);
  }}><Clock3 className="h-4 w-4" />Commenter à {momentTime(active ? time.currentTime : 0)}</button>;
}

export default function CommentsSurface({ entry, closeSurface }: ContextSurfaceRendererProps) {
  const client = useQueryClient();
  const viewer = useCommentsViewer();
  const type = (['track', 'post', 'clip'].includes(entry.entityType) ? entry.entityType : 'track') as CommentEntityType;
  const id = entry.entityId || '';
  const { data: entity = { type, id } } = useQuery<CommentEntity>({ queryKey: ['comment-entity', type, id, viewer], enabled: type === 'track' && Boolean(id), staleTime: Infinity, gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => { const b = await commentRequest(`/api/tracks/${encodeURIComponent(id)}`, { signal }); const t = b.track || b; return { type, id, title: t.title, audioUrl: t.audioUrl || t.audio_url, duration: Number(t.duration) || 0, artist: t.artist?.name, coverUrl: t.coverUrl || t.cover_url, creatorId: t.creator_id || t.artist?._id }; } });
  return <CommentsContent key={`${type}:${id}:${viewer}`} entity={entity} entry={entry} closeSurface={closeSurface} />;
}

function CommentsContent({ entity, entry, closeSurface }: { entity: CommentEntity; entry: ContextSurfaceRendererProps['entry']; closeSurface: () => void }) {
  const viewer = useCommentsViewer();
  const client = useQueryClient();
  const router = useRouter();
  const draftKey = useMemo(() => ['comment-draft', entity.type, entity.id, viewer], [entity.type, entity.id, viewer]);
  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY_DRAFT, ...client.getQueryData<Partial<Draft>>(draftKey) }));
  const [creatorView, setCreatorView] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const header = useRef<HTMLElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = { ...draft, scrollTop: scroller.current?.scrollTop ?? draftRef.current.scrollTop };
  const comments = useComments(entity, creatorView);
  const musical = supportsMoments(entity.type, entity.id);
  const canComment = entity.type !== 'track' || musical;
  const moments = useSharedMoments(musical ? entity.id : null);
  const reactions = useSharedReactions(musical ? entity.id : null);
  const waveform = useTrackWaveform(musical ? entity.id : null, entity.audioUrl, entity.duration);
  const { audioState, seek } = useAudioPlayer();
  const active = audioState.tracks[audioState.currentTrackIndex]?._id === entity.id;
  const duration = active && audioState.duration > 0 ? audioState.duration : waveform.duration || entity.duration || 0;
  const count = useCommentCount(entity.type, entity.id, entity.count ?? comments.comments.length);
  const peek = useProfilePeek(entry.origin);
  const all = useMemo(() => mergeComments(moments.markers, comments.comments), [moments.markers, comments.comments]);
  const clusters = useMemo(() => clusterMusicalMoments(all, reactions.reactions, duration), [all, reactions.reactions, duration]);
  const selectedCluster = clusters.find(c => c.id === draft.clusterId);
  const shown = draft.mode === 'moments' ? all.filter(c => c.timestampSeconds != null && !c.isDeleted && !c.customFiltered).sort((a, b) => a.timestampSeconds! - b.timestampSeconds!) : comments.comments;

  useEffect(() => { client.setQueryData(draftKey, draft); }, [client, draft, draftKey]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: draftRef.current.scrollTop });
    header.current?.focus({ preventScroll: true });
    return () => { client.setQueryData(draftKey, draftRef.current); };
  }, [client, draftKey]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const keyboard = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      surface.current?.style.setProperty('--comments-keyboard', `${keyboard}px`);
    };
    update(); viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update);
    return () => { viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); };
  }, []);
  const explicitSeek = useCallback((time: number) => {
    if (getBrowserAudioCore()?.getSnapshot().currentTrack?._id !== entity.id) { setError('Lance ce morceau pour naviguer dans ses moments.'); return; }
    seek(Math.max(0, Math.min(duration || time, time)));
  }, [duration, entity.id, seek]);
  const selectCluster = (cluster: MusicalCluster) => {
    explicitSeek(cluster.timestampSeconds);
    setDraft(d => ({ ...d, mode: 'moments', clusterId: cluster.id, selectedCommentId: cluster.comments[0]?.id || null }));
  };
  useEffect(() => {
    if (!draft.selectedCommentId) return;
    const target = scroller.current?.querySelector<HTMLElement>(draft.clusterId ? '[data-moment-cluster-detail]' : `[data-comment-id="${CSS.escape(draft.selectedCommentId)}"]`);
    if (target && scroller.current) scroller.current.scrollTop += target.getBoundingClientRect().top - scroller.current.getBoundingClientRect().top - 8;
  }, [draft.selectedCommentId, draft.clusterId, draft.mode, comments.data, moments.data]);
  const run = async (work: () => Promise<unknown>) => { if (busy) return; setBusy(true); setError(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Action impossible'); } finally { setBusy(false); } };
  const submit = () => run(async () => {
    await comments.mutate(draft.editId ? 'edit' : draft.replyId ? 'reply' : 'create', { id: draft.editId || draft.replyId || undefined, content: draft.text.trim(), timestampSeconds: draft.replyId || draft.editId ? null : draft.timestamp });
    setDraft(d => ({ ...d, text: '', timestamp: null, replyId: null, editId: null }));
  });
  const canonical = () => {
    const href = entity.type === 'track' ? `/track/${encodeURIComponent(entity.id)}` : entity.type === 'post' ? `/posts/${encodeURIComponent(entity.id)}` : entity.sourceTrackId ? `/track/${encodeURIComponent(entity.sourceTrackId)}` : null;
    if (!href) return;
    let done = false;
    const navigate = () => { if (done) return; done = true; window.removeEventListener('popstate', navigate); router.push(href, { scroll: false }); };
    window.addEventListener('popstate', navigate, { once: true }); closeSurface(); window.setTimeout(navigate, 350);
  };
  const renderComment = (comment: SocialComment, nested = false) => <article key={comment.id} data-comment-id={comment.id} className={`rounded-xl p-3 ${draft.selectedCommentId === comment.id ? 'bg-[var(--syn-soft-strong)] ring-1 ring-[var(--syn-accent)]' : ''} ${nested ? 'ml-5 border-l border-[var(--syn-border)]' : 'border-b border-[var(--syn-border)]'}`}>
    <div className="flex gap-2.5">
      <button type="button" data-context-surface-trigger-key={`comment-avatar-${entity.type}-${comment.id}`} onClick={e => peek(comment.user.username, e.currentTarget)} aria-label={`Aperçu de ${comment.user.name}`} className="syn-interactive h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[var(--syn-soft)] text-sm font-bold">
        {comment.user.avatar ? <img src={getCdnUrl(comment.user.avatar) || comment.user.avatar} alt="" className="h-full w-full object-cover" /> : comment.user.name.slice(0, 1)}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2"><button type="button" data-context-surface-trigger-key={`comment-author-${entity.type}-${comment.id}`} className={`${actionClass} max-w-full truncate px-0 text-left`} onClick={e => peek(comment.user.username, e.currentTarget)}>{comment.user.name}</button>{comment.isCreatorFavorite && <span className="text-[10px] text-[var(--syn-accent)]">♥ Créateur</span>}</div>
        <time className="block text-[10px] text-[var(--syn-text-tertiary)]" dateTime={comment.createdAt}>{Number.isFinite(Date.parse(comment.createdAt)) ? new Date(comment.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</time>
        {comment.timestampSeconds != null && <button type="button" className={`${actionClass} mt-1 bg-[var(--syn-soft)] text-[var(--syn-accent)] tabular-nums`} aria-label={`Aller à ${momentTime(comment.timestampSeconds)}`} onClick={() => { explicitSeek(comment.timestampSeconds!); setDraft(d => ({ ...d, selectedCommentId: comment.id })); }}>↗ {momentTime(comment.timestampSeconds)}</button>}
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--syn-text-secondary)]">{comment.content}</p>
        {comment.customFiltered && <span className="text-xs">Masqué par la modération</span>}
        <div className="mt-1 flex flex-wrap gap-1">
          {musical && !comment.isDeleted && <><button type="button" aria-label={`Aimer le commentaire de ${comment.user.name}`} aria-pressed={comment.isLiked} disabled={busy || viewer === 'public'} className={`${actionClass} inline-flex items-center gap-1 ${comment.isLiked ? 'text-[var(--syn-accent)]' : ''}`} onClick={() => void run(() => comments.mutate('like', { id: comment.id }))}><Heart className={`h-3.5 w-3.5 ${comment.isLiked ? 'fill-current' : ''}`} />{comment.likesCount || ''}</button>{!nested && <button type="button" disabled={viewer === 'public'} className={actionClass} onClick={() => { setDraft(d => ({ ...d, replyId: comment.id, editId: null, timestamp: null })); composer.current?.focus(); }}>Répondre</button>}</>}
          {viewer === comment.user.id && !comment.isDeleted && <>{musical && !nested && <button type="button" className={actionClass} onClick={() => { setDraft(d => ({ ...d, editId: comment.id, replyId: null, text: comment.content })); composer.current?.focus(); }}>Modifier</button>}<button type="button" disabled={busy} className={actionClass} onClick={() => void run(() => comments.mutate('delete', { id: comment.id }))}>Supprimer</button></>}
          {comments.canModerate && <details className="relative"><summary className={`${actionClass} flex cursor-pointer items-center`}>Modérer</summary><div className="flex flex-wrap gap-1 rounded-lg bg-[var(--syn-soft)] p-1">{['favorite', comment.customFiltered ? 'unfilter' : 'filter', 'delete'].map(action => <button type="button" key={action} disabled={busy} className={actionClass} onClick={() => void run(() => comments.mutate('moderate', { id: comment.id, action }))}>{action === 'favorite' ? 'Favori créateur' : action === 'filter' ? 'Masquer' : action === 'unfilter' ? 'Afficher' : 'Supprimer'}</button>)}</div></details>}
        </div>
      </div>
    </div>
    {!nested && comment.replies.map(reply => renderComment(reply, true))}
  </article>;
  return <div ref={surface} className="comments-surface flex flex-col" data-comments-state={comments.isPending ? 'loading' : comments.isError ? 'error' : 'loaded'} data-comments-entity={`${entity.type}:${entity.id}`}>
    <header ref={header} tabIndex={-1} data-context-surface-initial-focus className="shrink-0 px-5 pb-2 pt-6 outline-none">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--syn-text-secondary)]">{entity.type === 'track' ? 'Autour du son' : entity.type === 'clip' ? 'Autour du clip' : 'Autour du post'}</p>
      <SynauraOverlayTitle>{entity.title || 'Commentaires'}</SynauraOverlayTitle>
      <SynauraOverlayDescription className="mt-1 truncate">{entity.artist ? `${entity.artist} · ` : ''}{count} commentaire{count !== 1 ? 's' : ''}</SynauraOverlayDescription>
      {musical && <MusicalWaveform trackId={entity.id} peaks={waveform.peaks} duration={duration} loading={waveform.loading} clusters={clusters} selected={draft.clusterId} onSelect={selectCluster} onSeek={explicitSeek} />}
      <div role="tablist" aria-label="Vue des commentaires" className="mt-1 flex border-b border-[var(--syn-border)]">{(['conversation', ...(musical ? ['moments'] : [])] as Draft['mode'][]).map(mode => <button key={mode} type="button" role="tab" id={`comments-tab-${mode}`} aria-controls="comments-panel" aria-selected={draft.mode === mode} tabIndex={draft.mode === mode ? 0 : -1} onClick={() => setDraft(d => ({ ...d, mode }))} onKeyDown={e => { if (musical && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 'conversation' : e.key === 'End' ? 'moments' : draft.mode === 'conversation' ? 'moments' : 'conversation'; setDraft(d => ({ ...d, mode: next })); document.getElementById(`comments-tab-${next}`)?.focus(); } }} className={`syn-interactive min-h-11 flex-1 border-b-2 text-sm font-bold ${draft.mode === mode ? 'border-[var(--syn-accent)] text-[var(--syn-text-primary)]' : 'border-transparent text-[var(--syn-text-secondary)]'}`}>{mode === 'conversation' ? 'Conversation' : 'Moments'}</button>)}</div>
    </header>
    <div ref={scroller} id="comments-panel" role="tabpanel" aria-labelledby={`comments-tab-${draft.mode}`} tabIndex={0} onScroll={e => { draftRef.current = { ...draftRef.current, scrollTop: e.currentTarget.scrollTop }; }} className="syn-interactive min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
      {comments.canModerate && <label className="flex min-h-11 items-center gap-2 px-3 text-xs"><input type="checkbox" checked={creatorView} onChange={e => setCreatorView(e.target.checked)} />Afficher les commentaires modérés</label>}
      {comments.isPending && <p role="status" className="p-5 text-sm">Chargement de la conversation…</p>}
      {comments.isError && <div role="alert" className="p-5 text-sm"><p>{comments.error.message}</p><button className={actionClass} onClick={() => void comments.refetch()}>Réessayer</button></div>}
      {draft.mode === 'moments' && selectedCluster && <section data-moment-cluster-detail className="m-3 rounded-xl bg-[var(--syn-soft)] p-3"><h3 className="text-sm font-bold">À {momentTime(selectedCluster.timestampSeconds)}</h3><p className="mt-1 text-xs text-[var(--syn-text-secondary)]">{selectedCluster.comments.length} commentaire(s) · {selectedCluster.reactions.length} réaction(s)</p><div className="mt-2 flex flex-wrap gap-1">{MOMENT_REACTION_TYPES.map(type => { const n = selectedCluster.reactions.filter(r => r.reactionType === type).length; return n ? <span key={type} className="rounded-full px-2 py-1 text-xs" aria-label={`${n} ${MOMENT_REACTION_META[type].label}`}>{MOMENT_REACTION_META[type].emoji} {n}</span> : null; })}</div></section>}
      {draft.mode === 'moments' && reactions.reactions.length > 0 && <div className="mx-3 mb-2 flex flex-wrap gap-2">{clusters.filter(c => c.reactions.length).map(c => <button type="button" key={c.id} onClick={() => selectCluster(c)} className={`${actionClass} bg-[var(--syn-soft)]`}>{momentTime(c.timestampSeconds)} · {c.reactions.length} réactions</button>)}</div>}
      {!comments.isPending && !comments.isError && !shown.length && <div className="px-6 py-8 text-center"><MessageCircle className="mx-auto mb-3 h-6 w-6 text-[var(--syn-accent)]" /><p className="text-sm font-bold">{draft.mode === 'moments' ? 'Quel passage te touche ?' : 'La conversation commence ici.'}</p><p className="mt-2 text-xs leading-5 text-[var(--syn-text-secondary)]">{draft.mode === 'moments' ? 'Ancre ton commentaire à un instant du morceau.' : 'Partage ce que tu ressens, pose une question ou réponds à un autre membre.'}</p></div>}
      {shown.map(c => renderComment(c))}
      {comments.hasNextPage && <button type="button" className={`${actionClass} w-full`} disabled={comments.isFetchingNextPage} onClick={() => void comments.fetchNextPage()}>Charger plus de commentaires</button>}
    </div>
    <footer className="shrink-0 border-t border-[var(--syn-border)] bg-[var(--syn-elevated-surface)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
      {musical && viewer !== 'public' && <div className="flex items-center justify-between"><CaptureMoment trackId={entity.id} capture={timestamp => { setDraft(d => ({ ...d, timestamp, replyId: null, editId: null })); composer.current?.focus(); }} />{draft.mode === 'moments' && <details><summary className={`${actionClass} flex cursor-pointer items-center`}>Réagir</summary><div className="flex flex-wrap gap-1">{MOMENT_REACTION_TYPES.map(type => <button type="button" key={type} title={MOMENT_REACTION_META[type].label} aria-label={MOMENT_REACTION_META[type].label} disabled={!active || busy} className={actionClass} onClick={() => void run(() => reactions.submit(type, getBrowserAudioCore()?.getTimeSnapshot().currentTime || 0))}>{MOMENT_REACTION_META[type].emoji}</button>)}</div></details>}</div>}
      {draft.timestamp != null || draft.replyId || draft.editId ? <div className="flex min-h-11 items-center justify-between rounded-lg bg-[var(--syn-soft)] pl-3 text-xs"><span>{draft.editId ? 'Modifier le commentaire' : draft.replyId ? 'Répondre au commentaire' : `Commentaire à ${momentTime(draft.timestamp!)}`}</span><button type="button" className={actionClass} aria-label="Revenir à un commentaire général" onClick={() => setDraft(d => ({ ...d, timestamp: null, replyId: null, editId: null }))}><X className="h-4 w-4" /></button></div> : <p className="py-2 text-[10px] text-[var(--syn-text-secondary)]">Commentaire général</p>}
      <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); if (draft.text.trim() && !busy) void submit(); }}>
        <textarea ref={composer} aria-label="Votre commentaire" value={draft.text} maxLength={1000} rows={2} disabled={!canComment || viewer === 'public' || comments.isError || comments.isPending} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} placeholder={!canComment ? 'Commentaires indisponibles pour cette source' : viewer === 'public' ? 'Connecte-toi pour commenter' : 'Partage ce que tu ressens…'} className="syn-interactive max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-[var(--syn-border)] bg-[var(--syn-soft)] px-3 py-2 text-base leading-5 placeholder:text-[var(--syn-text-tertiary)]" />
        <button type="submit" aria-label="Envoyer le commentaire" disabled={!draft.text.trim() || busy || !canComment || viewer === 'public' || comments.isError || comments.isPending} className="syn-interactive grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--syn-accent)] text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
      {(entity.type !== 'clip' || entity.sourceTrackId) && <button type="button" data-live-route-intent className={`${actionClass} mt-1 flex w-full items-center justify-center gap-2 text-[var(--syn-text-secondary)]`} onClick={canonical}>{entity.type === 'post' ? 'Ouvrir le post' : entity.type === 'clip' ? 'Ouvrir le morceau source' : 'Ouvrir le morceau'}<ArrowRight className="h-3.5 w-3.5" /></button>}
    </footer>
  </div>;
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useHandoffRouter } from '@/hooks/useHandoffRouter';
import { useSession } from 'next-auth/react';
import Link from '@/components/navigation/HandoffLink';
import { ArrowLeft, Heart, MessageCircle, Share2, Send, ThumbsUp, Pencil, Trash2, Pause, Play, Lock, Check, X, Loader2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import TrackCover from '@/components/TrackCover';
import { SynauraAppShell } from '@/components/synaura/SynauraShell';
import { DraftRecovery } from '@/components/recovery/DraftRecovery';
import { notify } from '@/components/NotificationCenter';
import { useAudioPlayer } from '@/app/providers';
import { communityCategoryLabel, communityDate, communityPostHref, type CommunityAuthor } from '@/lib/communityFeed';
import { COMMUNITY_CATEGORIES, COMMUNITY_REPLY_LIMIT } from '@/lib/communityValidation';
import { useCommunityThread } from '@/components/community/useCommunityThread';
import '@/components/community/community-hub.css';
import '@/components/community/community-thread.css';

function Author({ author }: { author?: CommunityAuthor | null }) {
  const content = <><Avatar src={author?.avatar} name={author?.name || 'Membre'} username={author?.username} size="sm" /><span><strong>{author?.name || author?.username || 'Membre Synaura'}</strong>{author?.username && <small>@{author.username}</small>}</span></>;
  return author?.username ? <Link className="community-author" href={`/profile/${encodeURIComponent(author.username)}`}>{content}</Link> : <div className="community-author">{content}</div>;
}

function DeleteConfirmation({ post, pending, cancel, confirm }: { post: boolean; pending: boolean; cancel: () => void; confirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.isConnected && previous.focus(); };
  }, []);
  return <dialog ref={dialog} className="community-confirm" aria-labelledby="community-delete-title" onCancel={event => { event.preventDefault(); if (!pending) cancel(); }}>
    <h2 id="community-delete-title">Supprimer {post ? 'cette discussion' : 'cette réponse'} ?</h2>
    <p>{post ? 'La discussion et ses réponses seront supprimées.' : 'Ta réponse et ses votes seront supprimés.'} Cette action est définitive.</p>
    <div><button autoFocus type="button" disabled={pending} onClick={cancel}>Annuler</button><button className="community-danger" type="button" disabled={pending} onClick={confirm}>{pending ? 'Suppression…' : 'Supprimer'}</button></div>
  </dialog>;
}

function Thread({ id, viewerId }: { id: string; viewerId: string }) {
  const router = useHandoffRouter();
  const thread = useCommunityThread(id, viewerId);
  const { post, replies } = thread;
  const { audioState, setQueueAndPlay, play, pause } = useAudioPlayer();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<string>('');
  const busyRef = useRef(false);
  const alive = useRef(true);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [deleting, setDeleting] = useState<{ id: string; post: boolean } | null>(null);
  const [editing, setEditing] = useState<{ id: string; post: boolean; title: string; content: string; category: string } | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 2500); return () => clearTimeout(timer); }, [copied]);

  const mutate = async (key: string, url: string, method: string, body: unknown, done: (data: any) => void) => {
    if (busyRef.current) return;
    if (!viewerId) { notify.info('Connexion requise', 'Connecte-toi pour participer.'); return; }
    busyRef.current = true; setBusy(key);
    try {
      const response = await fetch(url, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action impossible. Réessaie.');
      if (alive.current) done(data);
    } catch (error) { if (alive.current) notify.error('Communauté', (error as Error).message); }
    finally { busyRef.current = false; if (alive.current) setBusy(''); }
  };
  const submitReply = () => {
    if (!reply.trim() || post?.is_locked) return;
    void mutate('reply', '/api/community/posts/replies', 'POST', { post_id: id, content: reply.trim() }, data => {
      thread.update({ replies: [...replies.filter(item => item.id !== data.id), data] });
      setReply(''); notify.success('Réponse publiée', 'Ton message a été ajouté.');
    });
  };
  const share = async () => {
    try {
      const url = communityPostHref(id, true);
      if (navigator.share) await navigator.share({ title: post?.title, url });
      else { await navigator.clipboard.writeText(url); if (alive.current) setCopied(true); }
    } catch (error) { if ((error as Error).name !== 'AbortError') notify.error('Partage', 'Impossible de partager ce lien.'); }
  };
  const track = post?.track;
  const playing = Boolean(track && audioState.tracks[audioState.currentTrackIndex]?._id === track.id && audioState.isPlaying);
  const playTrack = () => {
    if (!track || !(track.audioUrl || track.audio_url)) return;
    if (audioState.tracks[audioState.currentTrackIndex]?._id === track.id) { playing ? pause() : play(); return; }
    setQueueAndPlay([{ _id: track.id, title: track.title || 'Son partagé', artist: { _id: track.artist_id || '', name: track.artist_name || 'Artiste', username: track.artist_username || '' }, audioUrl: track.audioUrl || track.audio_url || '', coverUrl: track.coverUrl || track.cover_url || '/default-cover.svg', coverVideoUrl: track.coverVideoUrl, coverVideoPosterUrl: track.coverVideoPosterUrl, duration: track.duration || 0, genre: track.genre || [], likes: [], comments: [], plays: track.plays || 0 }], 0);
  };
  return <SynauraAppShell contentClassName="max-w-[1050px]">
    <div className="community-hub community-thread">
      <nav className="thread-breadcrumb" aria-label="Fil de discussion"><Link href="/community/forum"><ArrowLeft size={16} /> Toutes les discussions</Link></nav>
      {thread.loading && <div className="thread-loading" role="status"><Loader2 className="community-spin" size={22} /> Chargement de la discussion…</div>}
      {thread.error && <section className="thread-panel" role="alert"><h1>{thread.missing ? 'Cette discussion n’existe plus.' : 'La discussion n’a pas pu charger.'}</h1><p>{thread.error}</p>{!thread.missing && <button className="community-primary" onClick={thread.reload}>Réessayer</button>}</section>}
      {!thread.loading && post && <>
        <article className="thread-panel thread-original">
          <header><span className="community-topic" data-topic={post.category}>{communityCategoryLabel(post.category)}</span>{post.is_locked && <span className="thread-muted"><Lock size={13} /> Discussion fermée</span>}<h1>{post.title}</h1><div className="thread-byline"><Author author={post.author} /><time dateTime={post.created_at}>{communityDate(post.created_at)}</time></div></header>
          <p className="thread-message">{post.content}</p>
          {!!post.tags?.length && <ul className="community-post-tags" aria-label="Mots-clés">{post.tags.map(tag => <li key={tag}>#{tag}</li>)}</ul>}
          {track && <div className="community-shared-track" data-playing={playing}><div className="community-track-cover"><TrackCover src={track.coverUrl || track.cover_url} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} title={track.title} autoPlayVideo={playing} /></div><Link className="community-track-info" href={`/track/${encodeURIComponent(track.id)}`}><small>Son partagé</small><strong>{track.title}</strong><span>{track.artist_name}</span></Link><button className="community-track-play" type="button" onClick={playTrack} disabled={!(track.audioUrl || track.audio_url)} aria-label={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title}`}>{playing ? <Pause size={20} /> : <Play size={20} />}</button></div>}
          <footer className="community-discussion-actions">
            {track && post.category === 'remix' && <Link className="community-primary" href={`/ai-generator?mode=remix&sourceTrack=${encodeURIComponent(track.id)}&title=${encodeURIComponent(track.title || '')}&style=${encodeURIComponent(track.style || '')}`}>Remixer dans le Studio</Link>}
            <button aria-label={post.is_liked ? 'Retirer mon j’aime' : 'Aimer cette discussion'} aria-pressed={!!post.is_liked} disabled={!!busy} onClick={() => void mutate('like', post.is_liked ? `/api/community/posts/likes?post_id=${encodeURIComponent(id)}` : '/api/community/posts/likes', post.is_liked ? 'DELETE' : 'POST', post.is_liked ? null : { post_id: id }, () => thread.update({ post: { ...post, is_liked: !post.is_liked, likes_count: Math.max(0, (post.likes_count || 0) + (post.is_liked ? -1 : 1)) } }))}><Heart size={19} fill={post.is_liked ? 'currentColor' : 'none'} />{post.likes_count || 0}</button>
            <a href="#thread-composer" onClick={() => composer.current?.focus()}><MessageCircle size={19} />{replies.length}<span>Répondre</span></a>
            <button onClick={share} aria-label="Partager la discussion">{copied ? <Check size={19} /> : <Share2 size={19} />}<span role="status">{copied ? 'Lien copié' : ''}</span></button>
            {viewerId === post.user_id && <div className="thread-owner-actions"><button disabled={!!busy || post.is_locked} onClick={() => setEditing({ id, post: true, title: post.title, content: post.content, category: post.category })}><Pencil size={15} /> Modifier</button><button disabled={!!busy} onClick={() => setDeleting({ id, post: true })} aria-label="Supprimer ma discussion"><Trash2 size={15} /></button></div>}
          </footer>
        </article>
        <section className="thread-conversation" aria-labelledby="thread-replies-title"><h2 id="thread-replies-title">La conversation <span>{replies.length}</span></h2>
          {!replies.length && <p className="thread-muted">Une question, une idée, une autre oreille ? Lance la conversation.</p>}
          <div className="thread-replies">{replies.map(item => <article className="thread-panel thread-reply" key={item.id} id={`reply-${item.id}`}><div className="thread-byline"><Author author={item.profiles} /><time dateTime={item.created_at}>{communityDate(item.created_at)}</time></div><p className="thread-message">{item.content}</p><div className="thread-reply-actions"><button disabled={!!busy} aria-pressed={!!item.is_liked} onClick={() => void mutate(item.id, item.is_liked ? `/api/community/posts/replies/likes?reply_id=${encodeURIComponent(item.id)}` : '/api/community/posts/replies/likes', item.is_liked ? 'DELETE' : 'POST', item.is_liked ? null : { reply_id: item.id }, () => thread.update({ replies: replies.map(row => row.id === item.id ? { ...row, is_liked: !row.is_liked, likes_count: Math.max(0, (row.likes_count || 0) + (row.is_liked ? -1 : 1)) } : row) }))}><ThumbsUp size={15} fill={item.is_liked ? 'currentColor' : 'none'} /> Utile <span>{item.likes_count || 0}</span></button>{viewerId === item.user_id && <><button disabled={!!busy || post.is_locked} onClick={() => setEditing({ id: item.id, post: false, title: '', content: item.content, category: '' })}><Pencil size={14} /> Modifier</button><button disabled={!!busy} onClick={() => setDeleting({ id: item.id, post: false })} aria-label="Supprimer ma réponse"><Trash2 size={14} /></button></>}</div></article>)}</div>
        </section>
      </>}
      <section className="thread-panel thread-composer" id="thread-composer" aria-label="Répondre à la discussion">
        <DraftRecovery owner={viewerId} scope={`community-reply:${id}`} fields={{ reply }} empty={!reply.trim()} reset={() => setReply('')} apply={fields => setReply(fields.reply || '')} />
        {post?.is_locked ? <p className="thread-muted"><Lock size={15} /> Cette discussion est fermée aux nouvelles réponses.</p> : !viewerId ? <p><Link className="community-primary" href={`/auth/signin?callbackUrl=${encodeURIComponent(`/community/forum/${id}`)}`}>Se connecter pour participer</Link></p> : <form onSubmit={event => { event.preventDefault(); submitReply(); }}><label htmlFor="thread-reply">À ton tour</label><textarea id="thread-reply" ref={composer} rows={4} maxLength={COMMUNITY_REPLY_LIMIT} value={reply} disabled={!!busy || !post} onChange={event => setReply(event.target.value)} placeholder="Partage un retour, une idée, une question…" onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); submitReply(); } }} /><div className="thread-compose-footer"><span>{reply.length.toLocaleString('fr-FR')} / 5 000</span><button className="community-primary" disabled={!!busy || !reply.trim() || !post}><Send size={17} />{busy === 'reply' ? 'Envoi…' : 'Répondre'}</button></div></form>}
      </section>
      {editing && <section className="thread-panel thread-editor" aria-label="Modifier mon message"><form onSubmit={event => { event.preventDefault(); void mutate('edit', editing.post ? `/api/community/posts/${id}` : `/api/community/posts/replies/${editing.id}`, 'PUT', editing.post ? { title: editing.title, content: editing.content, category: editing.category, tags: post?.tags || [] } : { content: editing.content }, data => { if (editing.post && post) thread.update({ post: { ...post, title: editing.title.trim(), content: editing.content.trim(), category: editing.category } }); else thread.update({ replies: replies.map(row => row.id === editing.id ? { ...row, ...data } : row) }); setEditing(null); notify.success('Modification enregistrée', 'Ton message est à jour.'); }); }}><h2>Modifier mon {editing.post ? 'post' : 'message'}</h2>{editing.post && <><label>Titre<input required maxLength={255} value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} /></label><label>Thème<select value={editing.category} onChange={event => setEditing({ ...editing, category: event.target.value })}>{COMMUNITY_CATEGORIES.map(category => <option key={category} value={category}>{communityCategoryLabel(category)}</option>)}</select></label></>}<label>Message<textarea autoFocus required rows={6} maxLength={editing.post ? 20000 : 5000} value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} /></label><div className="thread-compose-footer"><button type="button" disabled={!!busy} onClick={() => setEditing(null)}><X size={16} /> Annuler</button><button className="community-primary" disabled={!!busy || !editing.content.trim() || (editing.post && !editing.title.trim())}><Check size={16} /> Enregistrer</button></div></form></section>}
      {deleting && <DeleteConfirmation post={deleting.post} pending={!!busy} cancel={() => setDeleting(null)} confirm={() => void mutate('delete', deleting.post ? `/api/community/posts/${id}` : `/api/community/posts/replies/${deleting.id}`, 'DELETE', null, () => { if (deleting.post) router.push('/community/forum'); else thread.update({ replies: replies.filter(item => item.id !== deleting.id) }); setDeleting(null); notify.success('Supprimé', 'Ton contenu a été supprimé.'); })} />}
    </div>
  </SynauraAppShell>;
}
export default function CommunityPostDetailPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const id = String(params?.id || '');
  const viewerId = session?.user?.id || '';
  if (status === 'loading') return <SynauraAppShell><p role="status">Chargement…</p></SynauraAppShell>;
  // Each entity/account owns its draft and in-flight actions. No stale A response can replace B.
  return <Thread key={`${id}:${viewerId}`} id={id} viewerId={viewerId} />;
}

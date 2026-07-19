'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, Loader2, MessageCircle, Send, Share2, X } from 'lucide-react';
import {
  SHARE_CARD_FORMATS,
  type ShareCardFormatId,
  buildShareCardPath,
  formatShareCardDuration,
  shareCardFilename,
} from '@/lib/shareCard';

type ShareTrack = {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  duration?: number | null;
};

type Props = {
  visible: boolean;
  track: ShareTrack | null;
  trackUrl: string;
  onClose: () => void;
};

type ActionStatus = 'idle' | 'copied' | 'downloaded' | 'shared' | 'sent';

type ShareContact = {
  friendshipId: string;
  conversationId: string | null;
  user: { id: string; name: string; username: string; avatar: string | null };
};

export default function TrackShareCardModal({ visible, track, trackUrl, onClose }: Props) {
  const [format, setFormat] = useState<ShareCardFormatId>('square');
  const [personalText, setPersonalText] = useState('');
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const imagePath = useMemo(() => {
    if (!track?.id) return '';
    return buildShareCardPath(track.id, { format, text: personalText });
  }, [format, personalText, track?.id]);

  const absoluteImageUrl = useMemo(() => {
    if (!imagePath || typeof window === 'undefined') return imagePath;
    return `${window.location.origin}${imagePath}`;
  }, [imagePath]);

  if (!visible || !track) return null;

  const showStatus = (next: ActionStatus) => {
    setStatus(next);
    window.setTimeout(() => setStatus('idle'), 1800);
  };

  const loadCardBlob = async () => {
    const response = await fetch(imagePath, { cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.startsWith('image/')) {
      throw new Error('La carte ne peut pas être générée pour ce morceau.');
    }
    const blob = await response.blob();
    if (blob.size < 1024) throw new Error('La carte générée est vide.');
    return blob;
  };

  const shareText = [
    personalText.trim(),
    `Ecoute ${track.title} de ${track.artist} sur Synaura`,
    trackUrl,
  ].filter(Boolean).join('\n\n');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
      showStatus('copied');
    } catch {}
  };

  const downloadImage = async () => {
    setBusy(true);
    setError('');
    try {
      const blob = await loadCardBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = shareCardFilename(track.title, format);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showStatus('downloaded');
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Le téléchargement a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const nativeShare = async () => {
    setBusy(true);
    setError('');
    try {
      const blob = await loadCardBlob();
      const file = new File([blob], shareCardFilename(track.title, format), { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: track.title, text: shareText, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: track.title, text: shareText, url: trackUrl });
      } else {
        await navigator.clipboard.writeText(trackUrl);
      }
      showStatus('shared');
    } catch (shareError) {
      if ((shareError as Error)?.name !== 'AbortError') {
        setError(shareError instanceof Error ? shareError.message : 'Le partage a échoué.');
      }
    } finally {
      setBusy(false);
    }
  };

  const openFriends = async () => {
    if (friendsOpen) {
      setFriendsOpen(false);
      return;
    }
    setFriendsOpen(true);
    setFriendsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/messages/contacts', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(response.status === 401 ? 'Connecte-toi pour envoyer ce son à un ami.' : payload?.error || 'Contacts indisponibles');
      setContacts(Array.isArray(payload?.contacts) ? payload.contacts : []);
    } catch (contactError) {
      setFriendsOpen(false);
      setError(contactError instanceof Error ? contactError.message : 'Contacts indisponibles');
    } finally {
      setFriendsLoading(false);
    }
  };

  const sendToFriend = async (contact: ShareContact) => {
    if (sendingTo) return;
    setSendingTo(contact.user.id);
    setError('');
    try {
      let conversationId = contact.conversationId;
      if (!conversationId) {
        const conversationResponse = await fetch('/api/messages/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: contact.user.id }),
        });
        const conversation = await conversationResponse.json().catch(() => null);
        if (!conversationResponse.ok || !conversation?.id) throw new Error(conversation?.error || 'Discussion indisponible');
        conversationId = String(conversation.id);
      }
      if (!conversationId) throw new Error('Discussion indisponible');
      const messageResponse = await fetch(`/api/messages/${encodeURIComponent(conversationId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'track',
          sharedEntityId: track.id,
          metadata: {
            title: track.title,
            artistName: track.artist,
            coverUrl: track.coverUrl || '',
            duration: Number(track.duration || 0),
            url: trackUrl,
          },
        }),
      });
      const message = await messageResponse.json().catch(() => null);
      if (!messageResponse.ok) throw new Error(message?.error || 'Envoi impossible');
      setFriendsOpen(false);
      showStatus('sent');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Envoi impossible');
    } finally {
      setSendingTo(null);
    }
  };

  const currentFormat = SHARE_CARD_FORMATS.find((item) => item.id === format) || SHARE_CARD_FORMATS[1];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#111111]/76 px-4 py-5 backdrop-blur-xl" onClick={onClose}>
      <div
        className="grid max-h-[92dvh] w-full max-w-5xl overflow-hidden rounded-[1.7rem] border border-white/12 bg-[#111111] text-[#F7F6F3] shadow-[0_34px_120px_rgba(0,0,0,0.42)] lg:grid-cols-[minmax(0,0.92fr)_390px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex min-h-[460px] items-center justify-center overflow-hidden bg-[#111111] p-5 sm:p-7">
          {track.coverUrl ? (
            <img src={track.coverUrl} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-br from-[#111111]/70 via-[#111111]/90 to-[#241c30]" />
          <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[#7357C6]/22 blur-3xl" />
          <div className="absolute -bottom-20 right-8 h-80 w-80 rounded-full bg-[#4A9EAA]/18 blur-3xl" />

          <div
            className="relative overflow-hidden rounded-[1.35rem] border border-white/14 bg-black/30 shadow-[0_30px_90px_rgba(0,0,0,0.42)]"
            style={{
              width: currentFormat.id === 'story' ? 'min(64%, 330px)' : 'min(86%, 520px)',
              aspectRatio: `${currentFormat.width} / ${currentFormat.height}`,
              maxHeight: '68dvh',
            }}
          >
            {absoluteImageUrl ? (
              <img key={absoluteImageUrl} src={absoluteImageUrl} alt="Apercu de la carte de partage" className="h-full w-full object-cover" />
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-col border-l border-white/10 bg-[#F7F6F3] text-[#111111]">
          <div className="flex items-start gap-3 border-b border-black/[0.08] p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-[#111111] text-[#F7F6F3]">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/38">Carte de partage</p>
              <h2 className="mt-1 truncate text-xl font-black tracking-[-0.04em]">{track.title}</h2>
              <p className="mt-1 truncate text-xs font-bold text-black/48">{track.artist}{track.duration ? ` - ${formatShareCardDuration(track.duration)}` : ''}</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-black/50 transition hover:bg-black/[0.1]" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-black/40">Format</p>
              <div className="grid grid-cols-3 gap-2">
                {SHARE_CARD_FORMATS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormat(item.id)}
                    className={`rounded-[1rem] border px-3 py-3 text-left transition ${format === item.id ? 'border-[#7357C6] bg-[#7357C6] text-white' : 'border-black/[0.08] bg-white text-black/62 hover:border-black/[0.14]'}`}
                  >
                    <span className="block text-sm font-black">{item.label}</span>
                    <span className={`mt-1 block text-[10px] font-bold ${format === item.id ? 'text-white/72' : 'text-black/38'}`}>{item.ratioLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-black/40">Texte personnel</span>
              <textarea
                value={personalText}
                onChange={(event) => setPersonalText(event.target.value.slice(0, 112))}
                placeholder="Ajoute une phrase courte..."
                className="min-h-[96px] w-full resize-none rounded-[1.1rem] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold text-[#111111] outline-none transition placeholder:text-black/30 focus:border-[#7357C6]/50"
              />
              <span className="mt-1 block text-right text-[10px] font-bold text-black/34">{personalText.length}/112</span>
            </label>

            <div className="rounded-[1.1rem] border border-black/[0.08] bg-white p-3">
              <p className="text-xs font-black text-[#111111]">Lien du morceau</p>
              <p className="mt-1 break-all text-[11px] font-semibold leading-4 text-black/44">{trackUrl}</p>
            </div>
          </div>

          <div className="border-t border-black/[0.08] p-5">
            <div className="grid gap-2">
              <button type="button" disabled={busy} onClick={nativeShare} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#111111] px-5 text-sm font-black text-[#F7F6F3] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-55">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                {busy ? 'Préparation...' : 'Partager la carte'}
              </button>
              <button type="button" disabled={friendsLoading || Boolean(sendingTo)} onClick={() => void openFriends()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#7357C6] px-4 text-xs font-black text-white transition hover:bg-[#674BB9] disabled:cursor-wait disabled:opacity-55">
                {friendsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                Envoyer à un ami
              </button>
              {friendsOpen ? (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-[1rem] border border-black/[0.08] bg-white p-2">
                  {!contacts.length && !friendsLoading ? <p className="px-3 py-4 text-center text-xs font-bold text-black/42">Aucun ami à qui envoyer ce son.</p> : null}
                  {contacts.map((contact) => (
                    <button key={contact.friendshipId} type="button" disabled={Boolean(sendingTo)} onClick={() => void sendToFriend(contact)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-black/[0.05] disabled:opacity-50">
                      {contact.user.avatar ? <img src={contact.user.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.08] text-xs font-black">{contact.user.name.slice(0, 1).toUpperCase()}</span>}
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{contact.user.name}</span><span className="block truncate text-[10px] font-bold text-black/38">@{contact.user.username}</span></span>
                      {sendingTo === contact.user.id ? <Loader2 className="h-4 w-4 animate-spin text-[#7357C6]" /> : <Send className="h-4 w-4 text-black/36" />}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={copyLink} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black/[0.06] px-4 text-xs font-black text-black/62 transition hover:bg-black/[0.1]">
                  {status === 'copied' ? <Check className="h-4 w-4 text-[#4A9EAA]" /> : <Copy className="h-4 w-4" />}
                  Copier le lien
                </button>
                <button type="button" disabled={busy} onClick={downloadImage} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black/[0.06] px-4 text-xs font-black text-black/62 transition hover:bg-black/[0.1] disabled:cursor-wait disabled:opacity-55">
                  {status === 'downloaded' ? <Check className="h-4 w-4 text-[#4A9EAA]" /> : <Download className="h-4 w-4" />}
                  Telecharger
                </button>
              </div>
            </div>
            {status !== 'idle' ? (
              <p className="mt-3 text-center text-xs font-black text-[#4A9EAA]">
                {status === 'copied' ? 'Lien copie' : status === 'downloaded' ? 'Image prete' : status === 'sent' ? 'Envoye dans la discussion' : 'Partage lance'}
              </p>
            ) : null}
            {error ? <p className="mt-3 rounded-xl border border-[#D96D63]/25 bg-[#D96D63]/10 px-3 py-2 text-center text-xs font-bold text-[#B84D45]">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

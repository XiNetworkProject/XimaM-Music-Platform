'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Loader2, Search, Send, UserPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useHandoffRouter } from '@/hooks/useHandoffRouter';
import Avatar from '@/components/Avatar';
import { SynauraOverlay, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';

type Person = { _id: string; name: string; username: string; avatar?: string };
type Relationship = { relationship: string; conversationId?: string; requestId?: string };

export default function PeopleFinder({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const { data: session } = useSession();
  const router = useHandoffRouter();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!open) { setSelected(null); setQuery(''); setNote(''); setError(''); } }, [open]);
  useEffect(() => {
    if (!open || selected || query.trim().length < 2) { setPeople([]); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?filter=artists&limit=15&query=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error('Recherche indisponible. Réessaie.');
        if (!controller.signal.aborted) setPeople((data.artists || []).filter((p: Person) => p._id !== session?.user?.id));
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Recherche impossible'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, query, selected, session?.user?.id]);
  useEffect(() => {
    setRelationship(null);
    if (!selected || !open) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    void fetch(`/api/messages/requests/status?targetId=${encodeURIComponent(selected._id)}`, { signal: controller.signal, cache: 'no-store' }).then(async r => {
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Contact indisponible');
      if (!controller.signal.aborted) setRelationship(data);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected, open]);
  const act = async () => {
    if (!selected || !relationship || busy) return;
    if (relationship.relationship === 'incoming') { onClose(); router.push('/messages?tab=requests'); return; }
    setBusy(true); setError('');
    try {
      const friends = relationship.relationship === 'friends';
      if (friends && relationship.conversationId) { onClose(); router.push(`/messages/${relationship.conversationId}`); return; }
      const response = await fetch(friends ? '/api/messages/conversations' : '/api/messages/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(friends ? { participantId: selected._id } : { targetId: selected._id, message: note.trim() }),
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Action impossible');
      onChanged(); window.dispatchEvent(new Event('synaura:messages-changed'));
      const id = friends ? data.id : data.conversationId;
      if (id) { onClose(); router.push(`/messages/${id}`); }
      else setRelationship({ relationship: 'outgoing', requestId: data.requestId });
    } catch (e) { setError(e instanceof Error ? e.message : 'Action impossible'); }
    finally { setBusy(false); }
  };
  const state = relationship?.relationship;
  return <SynauraOverlay open={open} onClose={() => !busy && onClose()} initialFocusRef={input} presentation="responsive" size="md" className="ms-dialog">
    <div className="ms-dialog-content"><div className="ms-dialog-symbol"><UserPlus size={24} /></div><SynauraOverlayTitle>Retrouver quelqu’un</SynauraOverlayTitle><p className="ms-muted">Un ami, un artiste, une nouvelle connexion.</p>
      {!selected ? <><label className="ms-search"><Search size={18} /><input ref={input} value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom ou @pseudo" aria-label="Rechercher une personne" maxLength={80} /></label><div className="ms-picker-results">
        {loading ? <p role="status"><Loader2 className="animate-spin" size={20} /> Recherche…</p> : people.map(p => <button className="ms-person" key={p._id} onClick={() => { setSelected(p); setNote(''); }}><Avatar src={p.avatar} name={p.name} username={p.username} size="lg" /><span><strong>{p.name}</strong><small>@{p.username}</small></span><UserPlus size={18} /></button>)}
        {!loading && query.trim().length >= 2 && !people.length && !error && <p>Aucun compte trouvé.</p>}
        {query.trim().length < 2 && <p>Recherche un nom pour discuter ou envoyer une demande d’ami.</p>}
      </div></> : <><button className="ms-back" onClick={() => setSelected(null)} disabled={busy}><ArrowLeft size={16} /> Recherche</button><div className="ms-selected-person"><Avatar src={selected.avatar} name={selected.name} username={selected.username} size="lg" /><strong>{selected.name}</strong><small>@{selected.username}</small></div>
        {loading && <p role="status">Chargement du contact…</p>}
        {state === 'none' && <><p className="ms-muted">Cette personne recevra une demande. Elle choisira de l’accepter avant que vous puissiez échanger.</p><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={280} rows={3} placeholder="Un petit mot ? (facultatif)" aria-label="Message de la demande d’ami" /></>}
        {state === 'outgoing' ? <p className="ms-success"><Check size={18} /> Demande envoyée. Tu la retrouveras dans « Demandes ».</p> : state === 'blocked' ? <p>Ce contact n’est pas disponible.</p> : relationship && <button className="ms-primary" disabled={busy} onClick={() => void act()}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}{state === 'friends' ? 'Ouvrir la discussion' : state === 'incoming' ? 'Voir sa demande' : 'Envoyer la demande'}</button>}
      </>}{error && <p className="ms-error" role="alert">{error}</p>}
    </div>
  </SynauraOverlay>;
}

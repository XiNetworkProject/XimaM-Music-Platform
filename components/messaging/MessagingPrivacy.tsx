'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Shield } from 'lucide-react';
import { SynauraOverlay, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';

const choices = [
  { id: 'everyone', name: 'Tout le monde', description: 'Les non-amis passent toujours par une demande.' },
  { id: 'following', name: 'Les comptes que je suis', description: 'Seules les personnes que tu suis peuvent t’envoyer une demande.' },
  { id: 'nobody', name: 'Aucune nouvelle demande', description: 'Tes amis actuels peuvent continuer à t’écrire.' },
] as const;
export default function MessagingPrivacy({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [choice, setChoice] = useState('everyone');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setLoading(true); setError('');
    void fetch('/api/user/preferences', { signal: controller.signal, cache: 'no-store' }).then(async r => {
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Réglages indisponibles');
      if (!controller.signal.aborted) { setChoice(data.preferences?.messagingPrivacy || 'everyone'); setLoading(false); }
    }).catch(e => { if (!controller.signal.aborted) { setError(e.message); setLoading(true); } });
    return () => controller.abort();
  }, [open]);
  return <SynauraOverlay open={open} onClose={() => !saving && onClose()} presentation="responsive" size="md" className="ms-dialog"><div className="ms-dialog-content"><div className="ms-dialog-symbol"><Shield size={23} /></div><SynauraOverlayTitle>Ton espace, tes règles.</SynauraOverlayTitle><p className="ms-muted">Qui peut t’envoyer une demande d’ami ?</p>
    {loading && !error ? <p role="status" className="ms-muted">Chargement…</p> : !error || !loading ? <div className="ms-privacy-choices" role="group" aria-label="Confidentialité des demandes">{choices.map(item => <button key={item.id} className="ms-person" aria-pressed={choice === item.id} onClick={() => setChoice(item.id)} disabled={saving}><span><strong>{item.name}</strong><small>{item.description}</small></span>{choice === item.id && <Check size={20} />}</button>)}</div> : null}
    {error && <p className="ms-error" role="alert">{error}</p>}<button className="ms-primary" disabled={loading || saving} onClick={async () => { setSaving(true); setError(''); try { const response = await fetch('/api/user/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messagingPrivacy: choice }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Enregistrement impossible'); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible'); } finally { setSaving(false); } }}>{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}Enregistrer</button>
  </div></SynauraOverlay>;
}

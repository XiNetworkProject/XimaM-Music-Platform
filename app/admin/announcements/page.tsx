'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

type Announcement = {
  id?: string;
  title: string;
  body?: string;
  image_url?: string;
  priority?: number;
  published?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

const ADMIN_EMAIL = 'vermeulenmaxime59@gmail.com';

export default function AdminAnnouncementsPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState<Announcement>({ title: '', body: '', image_url: '', priority: 0, published: true });
  const [loading, setLoading] = useState(false);
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/announcements', { headers: { 'Cache-Control': 'no-store' } });
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    };
    load();
  }, []);

  const submit = async () => {
    if (!form.title) return;
    setLoading(true);
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      const json = await res.json();
      setItems((p) => [json.item, ...p]);
      setForm({ title: '', body: '', image_url: '', priority: 0, published: true });
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    const res = await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' });
    if (res.ok) setItems((p) => p.filter((x) => x.id !== id));
  };

  if (status === 'loading') return null;
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="panel-suno rounded-2xl border border-[var(--border)] p-6 text-white/80">
          Accès refusé.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Annonces</h1>
        <p className="text-white/70">Créer et gérer les annonces du carrousel d'accueil.</p>
      </div>

      {/* Formulaire */}
      <div className="panel-suno rounded-2xl border border-[var(--border)] p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/70">Titre</label>
            <input className="w-full mt-1 bg-white/10 border border-white/20 rounded-xl p-2 text-white" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} />
          </div>
          <div>
            <label className="text-sm text-white/70">Image (URL)</label>
            <input className="w-full mt-1 bg-white/10 border border-white/20 rounded-xl p-2 text-white" value={form.image_url || ''} onChange={(e)=>setForm({...form, image_url: e.target.value})} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-white/70">Texte</label>
            <textarea className="w-full mt-1 bg-white/10 border border-white/20 rounded-xl p-2 text-white" rows={4} value={form.body || ''} onChange={(e)=>setForm({...form, body: e.target.value})} />
          </div>
          <div>
            <label className="text-sm text-white/70">Priorité</label>
            <input type="number" className="w-full mt-1 bg-white/10 border border-white/20 rounded-xl p-2 text-white" value={form.priority || 0} onChange={(e)=>setForm({...form, priority: Number(e.target.value)})} />
          </div>
          <div className="flex items-center gap-2">
            <input id="pub" type="checkbox" checked={form.published ?? true} onChange={(e)=>setForm({...form, published: e.target.checked})} />
            <label htmlFor="pub" className="text-sm text-white/80">Publier</label>
          </div>
        </div>
        <div className="mt-4">
          <button onClick={submit} disabled={loading || !form.title} className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-50">Créer l'annonce</button>
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="panel-suno rounded-2xl border border-[var(--border)] p-4 flex items-center justify-between">
            <div>
              <div className="text-white font-semibold">{it.title}</div>
              {it.body && <div className="text-white/70 text-sm line-clamp-2">{it.body}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">prio {it.priority ?? 0}</span>
              <button onClick={()=>it.id && remove(it.id)} className="px-3 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20">Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


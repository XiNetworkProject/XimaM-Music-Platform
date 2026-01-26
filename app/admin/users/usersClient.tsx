'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, ShieldCheck, UserPlus, X } from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

type ProfileLite = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  artist_name?: string | null;
  role: 'user' | 'artist' | 'admin';
  is_artist?: boolean | null;
  is_verified?: boolean | null;
  updated_at?: string | null;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

async function safeJson(res: Response) {
  return await res.json().catch(() => ({}));
}

export default function AdminUsersClient() {
  const [q, setQ] = useState('');
  const [admins, setAdmins] = useState<ProfileLite[]>([]);
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleForNew, setRoleForNew] = useState<'admin' | 'artist' | 'user'>('admin');

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users?role=admin&limit=50', { cache: 'no-store' });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Erreur');
      setAdmins(Array.isArray(j?.items) ? j.items : []);
    } catch (e: any) {
      notify.error('Admin', e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const search = async () => {
    const query = q.trim();
    if (!query) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?role=all&limit=20&q=${encodeURIComponent(query)}`, { cache: 'no-store' });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Erreur');
      setResults(Array.isArray(j?.items) ? j.items : []);
    } catch (e: any) {
      notify.error('Recherche', e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  // debounce search
  useEffect(() => {
    const t = window.setTimeout(() => search(), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const setRole = async (userId: string, role: 'user' | 'artist' | 'admin') => {
    setBusyId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Erreur');
      notify.success('Rôle mis à jour', `${j?.user?.email || j?.user?.username || 'Utilisateur'} → ${role}`);
      await loadAdmins();
      await search();
    } catch (e: any) {
      notify.error('Rôle', e?.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const isEmailQuery = useMemo(() => /\S+@\S+\.\S+/.test(q.trim()), [q]);
  const canApplyDirectEmail = useMemo(() => isEmailQuery && q.trim().length > 0, [isEmailQuery, q]);

  const applyRoleToEmail = async () => {
    const email = q.trim().toLowerCase();
    if (!email) return;
    setBusyId(`email:${email}`);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: roleForNew }),
      });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Erreur');
      notify.success('Rôle mis à jour', `${email} → ${roleForNew}`);
      await loadAdmins();
      await search();
    } catch (e: any) {
      notify.error('Rôle', e?.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const canPromote = useMemo(() => q.trim().length > 0, [q]);

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-foreground-primary">Admins & rôles</div>
          <div className="text-sm text-foreground-tertiary mt-1">
            Recherche un utilisateur (email / username) puis change son rôle. Le rôle <span className="text-foreground-primary font-semibold">admin</span> donne accès à <span className="text-foreground-primary font-semibold">/admin</span>.
          </div>
        </div>
        <button
          type="button"
          onClick={loadAdmins}
          className="h-10 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition text-sm text-foreground-secondary"
          disabled={loading}
        >
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-foreground-primary font-semibold">Admins actuels</div>
            <div className="text-xs text-foreground-tertiary">{admins.length}</div>
          </div>

          <div className="mt-3 space-y-2">
            {admins.map((u) => (
              <div key={u.id} className="p-3 rounded-3xl border border-border-secondary bg-background-fog-thin flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-foreground-secondary" />
                    <div className="text-sm font-semibold text-foreground-primary truncate">{u.username || u.name || 'Admin'}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border-secondary bg-background-tertiary text-foreground-secondary">
                      {u.role}
                    </span>
                  </div>
                  <div className="text-xs text-foreground-tertiary truncate mt-1">{u.email || u.id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setRole(u.id, 'user')}
                  disabled={busyId === u.id}
                  className="h-10 px-3 rounded-2xl border border-border-secondary bg-background-tertiary hover:bg-red-500/15 hover:border-red-500/30 transition text-xs text-foreground-secondary disabled:opacity-60"
                >
                  Retirer
                </button>
              </div>
            ))}

            {admins.length === 0 && !loading && (
              <div className="text-sm text-foreground-tertiary">Aucun admin trouvé.</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-4">
          <div className="text-foreground-primary font-semibold">Rechercher un utilisateur</div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-11 rounded-2xl border border-border-secondary bg-background-tertiary flex items-center gap-2 px-3 focus-within:ring-2 focus-within:ring-overlay-on-primary">
              <Search className="h-4 w-4 text-foreground-tertiary" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="email ou username…"
                className="bg-transparent outline-none text-sm text-foreground-primary placeholder:text-foreground-inactive w-full"
              />
              {q.trim() && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="h-8 w-8 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4 text-foreground-secondary" />
                </button>
              )}
            </div>
            <select
              value={roleForNew}
              onChange={(e) => setRoleForNew(e.target.value as any)}
              className="h-11 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary outline-none"
              title="Rôle à attribuer"
            >
              <option value="admin">admin</option>
              <option value="artist">artist</option>
              <option value="user">user</option>
            </select>
          </div>

          <div className="mt-3 text-xs text-foreground-tertiary">
            Clique sur un résultat pour lui attribuer le rôle sélectionné.
          </div>

          <div className="mt-3 space-y-2">
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setRole(u.id, roleForNew)}
                disabled={busyId === u.id || !canPromote}
                className={cx(
                  'w-full text-left p-3 rounded-3xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition',
                  busyId === u.id && 'opacity-70',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground-primary truncate">
                      {u.username || u.name || u.artist_name || u.email || u.id}
                    </div>
                    <div className="text-xs text-foreground-tertiary truncate mt-1">
                      {u.email || '—'} • rôle actuel: {u.role}
                    </div>
                  </div>
                  <div className="shrink-0 h-10 px-3 rounded-2xl bg-overlay-on-primary text-foreground-primary flex items-center gap-2 text-sm font-semibold">
                    <UserPlus className="h-4 w-4" />
                    Appliquer
                  </div>
                </div>
              </button>
            ))}
            {results.length === 0 && q.trim() && !loading && (
              <div className="space-y-2">
                <div className="text-sm text-foreground-tertiary">Aucun résultat.</div>
                {canApplyDirectEmail && (
                  <button
                    type="button"
                    onClick={applyRoleToEmail}
                    disabled={busyId === `email:${q.trim().toLowerCase()}`}
                    className="w-full inline-flex items-center justify-between gap-2 p-3 rounded-3xl border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary transition disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground-primary truncate">
                        Attribuer <span className="font-bold">{roleForNew}</span> à {q.trim().toLowerCase()}
                      </div>
                      <div className="text-xs text-foreground-tertiary mt-1">
                        Si la personne n’a pas encore de compte, elle doit d’abord s’inscrire.
                      </div>
                    </div>
                    <div className="shrink-0 h-10 px-3 rounded-2xl bg-overlay-on-primary text-foreground-primary flex items-center gap-2 text-sm font-semibold">
                      <UserPlus className="h-4 w-4" />
                      Appliquer
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-3xl border border-border-secondary bg-background-tertiary p-3">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-foreground-secondary mt-0.5" />
              <div className="text-xs text-foreground-tertiary">
                Ton compte <span className="text-foreground-primary font-semibold">vermeulenmaxime59@gmail.com</span> est autorisé par défaut (bootstrap) pour accéder à /admin et gérer les admins.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


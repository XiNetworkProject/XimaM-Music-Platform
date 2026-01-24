import React from 'react';
import { getAdminGuard } from '@/lib/admin';

export default async function AdminPage() {
  const g = await getAdminGuard();

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-foreground-primary">Dashboard Admin</div>
          <div className="text-sm text-foreground-tertiary mt-1">
            Espace de gestion (accès restreint). Tu peux ajouter/retirer des admins depuis l’onglet “Admins & rôles”.
          </div>
        </div>
        <div className="text-xs text-foreground-tertiary text-right">
          <div>Accès: <span className="text-foreground-primary font-semibold">{g.isOwner ? 'Owner' : 'Admin'}</span></div>
          <div className="mt-1">Bootstrap: <span className="text-foreground-primary font-semibold">{String(process.env.ADMIN_OWNER_EMAILS || '').trim() ? 'ON' : 'OFF'}</span></div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-4">
          <div className="text-xs text-foreground-tertiary">Modules</div>
          <div className="mt-1 text-2xl font-semibold text-foreground-primary">Base</div>
          <div className="mt-1 text-xs text-foreground-tertiary">Dashboard • Admins & rôles</div>
        </div>
        <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-4">
          <div className="text-xs text-foreground-tertiary">À venir</div>
          <div className="mt-1 text-2xl font-semibold text-foreground-primary">Contenu</div>
          <div className="mt-1 text-xs text-foreground-tertiary">Featured • annonces • modération • settings global</div>
        </div>
        <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-4">
          <div className="text-xs text-foreground-tertiary">À venir</div>
          <div className="mt-1 text-2xl font-semibold text-foreground-primary">Monétisation</div>
          <div className="mt-1 text-xs text-foreground-tertiary">Boosters • roue daily • packs • quotas</div>
        </div>
      </div>
    </div>
  );
}


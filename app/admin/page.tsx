import React from 'react';
import { getAdminGuard } from '@/lib/admin';

export default async function AdminPage() {
  const g = await getAdminGuard();

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-white">Dashboard Admin</div>
          <div className="text-sm text-white/30 mt-1">
            Espace de gestion (accès restreint). Tu peux ajouter/retirer des admins depuis l'onglet "Admins & rôles".
          </div>
        </div>
        <div className="text-xs text-white/30 text-right">
          <div>Accès: <span className="text-white font-semibold">{g.isOwner ? 'Owner' : 'Admin'}</span></div>
          <div className="mt-1">Bootstrap: <span className="text-white font-semibold">ON</span></div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-4">
          <div className="text-xs text-white/30">Modules</div>
          <div className="mt-1 text-2xl font-semibold text-white">Base</div>
          <div className="mt-1 text-xs text-white/30">Dashboard • Admins & rôles</div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-4">
          <div className="text-xs text-white/30">À venir</div>
          <div className="mt-1 text-2xl font-semibold text-white">Contenu</div>
          <div className="mt-1 text-xs text-white/30">Featured • annonces • modération • settings global</div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-4">
          <div className="text-xs text-white/30">À venir</div>
          <div className="mt-1 text-2xl font-semibold text-white">Monétisation</div>
          <div className="mt-1 text-xs text-white/30">Boosters • roue daily • packs • quotas</div>
        </div>
      </div>
    </div>
  );
}

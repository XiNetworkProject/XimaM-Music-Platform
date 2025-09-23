'use client';

import React from 'react';
import { Users, Clock, Sparkles } from 'lucide-react';

export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-transparent text-[var(--text)] flex items-center justify-center px-4">
      <div className="max-w-md w-full panel-suno border border-[var(--border)] rounded-2xl p-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-white/5 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Accès anticipé
        </div>
        <h1 className="mt-4 text-2xl font-bold">Place limitée</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          L’application est actuellement accessible à un nombre restreint d’utilisateurs pendant le développement.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <div className="px-3 py-1 rounded-full bg-white/5 border border-[var(--border)] flex items-center gap-2">
            <Users className="w-4 h-4" /> 50 accès pour le moment
          </div>
          <div className="px-3 py-1 rounded-full bg-white/5 border border-[var(--border)] flex items-center gap-2">
            <Clock className="w-4 h-4" /> Plus de places bientôt
          </div>
        </div>
        <p className="mt-4 text-sm text-[var(--text-muted)]">Si vous êtes connecté et qu’une place se libère, l’accès sera automatiquement activé.</p>
        <a href="/" className="mt-6 inline-block px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-[var(--border)]">Revenir à l’accueil</a>
      </div>
    </div>
  );
}



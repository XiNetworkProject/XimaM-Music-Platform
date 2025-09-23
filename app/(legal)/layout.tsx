'use client';

import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24 text-[var(--text)]">
      <div className="relative z-10 w-full p-0 sm:p-2">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white/90">Informations légales</h1>
            <Link href="/" className="text-sm text-purple-400 hover:text-purple-300">Retour à l’accueil</Link>
          </div>
          <div className="panel-suno border border-[var(--border)] rounded-2xl p-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}



'use client';

import Link from 'next/link';

const links = [
  { href: '/legal/mentions-legales', label: 'Mentions légales' },
  { href: '/legal/confidentialite', label: 'Politique de confidentialité' },
  { href: '/legal/cgu', label: 'Conditions générales d’utilisation (CGU)' },
  { href: '/legal/cgv', label: 'Conditions générales de vente (CGV)' },
  { href: '/legal/cookies', label: 'Politique Cookies' },
  { href: '/legal/rgpd', label: 'Données personnelles (RGPD)' },
];

export default function LegalIndexPage() {
  return (
    <div className="space-y-3">
      {links.map((l) => (
        <div key={l.href} className="flex items-center justify-between py-2 border-b border-[var(--border)]/40 last:border-0">
          <span className="text-white/90">{l.label}</span>
          <Link href={l.href} className="text-sm text-purple-400 hover:text-purple-300">Ouvrir →</Link>
        </div>
      ))}
    </div>
  );
}



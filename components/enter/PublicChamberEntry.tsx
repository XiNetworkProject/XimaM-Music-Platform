'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import ChamberProduct from '@/components/chamber/ChamberProduct';
import { recordEntryEvent } from '@/lib/entryAnalytics';

/** Presentation only. Authentication and member routing stay on the server. */
export default function PublicChamberEntry({ legacy = false }: { legacy?: boolean }) {
  useEffect(() => { recordEntryEvent('discover_view', { legacy }); }, [legacy]);
  return <div className="chambre-public-entry">
    <nav className="chambre-public-account" aria-label="Entrer dans son compte Synaura"><Link href="/enter">Entrer <span aria-hidden="true">↗</span></Link></nav>
    <ChamberProduct presentationHref="/landing/presentation" />
  </div>;
}

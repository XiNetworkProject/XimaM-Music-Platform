import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminGuard } from '@/lib/admin';
import AdminSidebar from './sidebar';
import Link from 'next/link';
import SynauraLogo from '@/components/brand/SynauraLogo';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const g = await getAdminGuard();
  if (!g.userId) redirect('/auth/signin');
  if (!g.ok) redirect('/');

  return (
    <div className="v2-admin min-h-screen bg-background-primary text-foreground-primary">
      <div className="mx-auto max-w-7xl px-3 md:px-4 py-3 md:py-4">
        <header className="chambre-admin-header"><Link href="/live" aria-label="Synaura — Retour à Live"><SynauraLogo variant="wordmark" size={38} decorative /></Link><span>Administration / Espace autorisé</span></header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-3">
            <AdminSidebar isOwner={g.isOwner} />
          </div>
          <div className="lg:col-span-9">
            <div className="rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


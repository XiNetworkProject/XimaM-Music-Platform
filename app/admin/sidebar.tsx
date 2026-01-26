'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShieldCheck, Tv, Users } from 'lucide-react';

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export default function AdminSidebar({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  const items = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Admins & rôles', icon: Users },
    { href: '/admin/tv', label: 'SYNAURA TV', icon: Tv },
  ];

  return (
    <div className="rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
      <div className="p-4 border-b border-border-secondary/60">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-tertiary grid place-items-center">
            <ShieldCheck className="h-5 w-5 text-foreground-secondary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground-primary">Administration</div>
            <div className="text-xs text-foreground-tertiary">
              {isOwner ? 'Owner (bootstrap)' : 'Admin'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cx(
                'flex items-center gap-2 px-3 h-11 rounded-2xl border transition',
                active
                  ? 'border-border-secondary bg-background-tertiary text-foreground-primary'
                  : 'border-transparent bg-transparent text-foreground-secondary hover:bg-overlay-on-primary hover:border-border-secondary/60',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-semibold">{it.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border-secondary/60 text-xs text-foreground-tertiary">
        Astuce: ajoute un admin par email/username, puis il aura accès à <span className="text-foreground-primary font-semibold">/admin</span>.
      </div>
    </div>
  );
}


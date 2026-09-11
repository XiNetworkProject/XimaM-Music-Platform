'use client';

import { useProfilePeek } from '@/components/profile/useProfilePeek';
import { SynauraAppShell, SynauraPanel } from '@/components/synaura/SynauraShell';
import { SynauraBadge, SynauraButton } from '@/components/ui/SynauraPrimitives';

export default function ProfilePeekLab() {
  const openProfilePeek = useProfilePeek('other');

  return (
    <SynauraAppShell contentClassName="max-w-5xl">
      <main className="grid min-h-[80dvh] content-center gap-5" data-context-surface-origin="other" tabIndex={-1}>
        <SynauraBadge tone="warning">Développement uniquement</SynauraBadge>
        <h1 className="text-4xl font-black text-[var(--syn-text-primary)]">Profile Peek 4B.3</h1>
        <SynauraPanel className="grid max-w-2xl gap-4 p-6">
          <p className="text-sm font-semibold leading-6 text-[var(--syn-text-secondary)]">
            Harness isolé pour mesurer le chargement, le cache, le focus, le responsive et les cycles répétés.
          </p>
          <SynauraButton
            className="w-fit"
            data-context-surface-trigger-key="ui-lab-profile-peek"
            onClick={(event) => openProfilePeek('ximamoff', event.currentTarget)}
          >
            Ouvrir Profile Peek 4B.3
          </SynauraButton>
        </SynauraPanel>
      </main>
    </SynauraAppShell>
  );
}

import { Suspense } from 'react';
import SettingsClient from './SettingsClient';

function SettingsFallback() {
  return (
    <div className="min-h-screen w-full px-3 sm:px-5 pt-6 pb-24 text-foreground-primary">
      <div className="mx-auto w-full max-w-6xl">
        <div className="panel-suno border border-border-secondary rounded-2xl p-4">
          <div className="text-sm text-foreground-inactive">Chargement…</div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsClient />
    </Suspense>
  );
}


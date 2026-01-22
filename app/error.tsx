'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-border-secondary bg-background-fog-thin p-6 text-center">
        <div className="text-2xl font-semibold text-foreground-primary">Oups…</div>
        <div className="mt-2 text-sm text-foreground-secondary">
          Une erreur est survenue.
        </div>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="h-11 rounded-2xl bg-overlay-on-primary px-4 text-foreground-primary hover:opacity-90 transition"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border-secondary bg-background-fog-thin px-4 text-foreground-primary hover:bg-overlay-on-primary transition"
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}


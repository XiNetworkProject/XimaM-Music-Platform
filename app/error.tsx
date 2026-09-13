'use client';

import { useEffect } from 'react';
import SynauraLogo from '@/components/brand/SynauraLogo';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <main className="v2-personal v2-page" style={{ minHeight: '70vh', maxWidth: 760, margin: '0 auto', padding: 'clamp(32px, 8vw, 80px) 24px', color: 'var(--v2-text, #eff1f8)' }}>
      <SynauraLogo variant="lockup" size={42} />
      <p className="v2-kicker" style={{ marginTop: 48 }}>Une interruption</p>
      <h1 className="v2-heading" style={{ margin: '20px 0', fontSize: 'clamp(36px, 6vw, 60px)' }}>La page n’a pas pu se charger.</h1>
      <p className="v2-intro">Tu peux réessayer ou revenir à l’accueil.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32 }}>
        <button type="button" onClick={() => reset()} className="v2-action v2-action-primary">Réessayer</button>
        <a href="/" className="v2-action">Retour à l’accueil</a>
      </div>
      <details style={{ marginTop: 44, borderTop: '1px solid var(--v2-line, #30384a)', paddingTop: 20 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--v2-muted, #b0b8ca)', fontSize: 13, minHeight: 44 }}>Détails techniques</summary>
        <pre style={{ margin: '0 0 20px', padding: 16, background: 'var(--v2-surface, #10141e)', borderRadius: 8, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 240, overflow: 'auto', color: 'var(--v2-muted, #b0b8ca)' }}>
          {error?.message || 'Erreur inconnue'}
          {'\n\n'}
          {error?.stack || ''}
        </pre>
      </details>
    </main>
  );
}

'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '70vh', padding: 20 }}>
      <div style={{
        maxWidth: 600,
        margin: '40px auto',
        borderRadius: 16,
        border: '1px solid rgba(255,50,50,0.2)',
        background: 'rgba(255,50,50,0.05)',
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Oups…</div>
        <pre style={{
          margin: '16px auto',
          padding: 12,
          background: 'rgba(255,50,50,0.1)',
          borderRadius: 8,
          fontSize: 12,
          textAlign: 'left',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 200,
          overflow: 'auto',
          color: '#ff8080',
        }}>
          {error?.message || 'Erreur inconnue'}
          {'\n\n'}
          {error?.stack || ''}
        </pre>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: '10px 20px', borderRadius: 10, background: '#7c3aed', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer' }}
          >
            Reessayer
          </button>
          <a
            href="/"
            style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', fontSize: 14 }}
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

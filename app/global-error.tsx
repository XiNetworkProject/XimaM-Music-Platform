'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ background: '#0a0a14', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
        <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Erreur</h1>
          <pre style={{
            margin: '20px auto',
            padding: 16,
            background: 'rgba(255,50,50,0.15)',
            border: '1px solid rgba(255,50,50,0.3)',
            borderRadius: 12,
            fontSize: 13,
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 300,
            overflow: 'auto',
            color: '#ff8080',
          }}>
            {error?.message || 'Erreur inconnue'}
            {'\n\n'}
            {error?.stack || ''}
          </pre>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button
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
      </body>
    </html>
  );
}

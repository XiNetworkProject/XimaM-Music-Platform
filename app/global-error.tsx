'use client';

/** Self-contained recovery UI: no provider, imported component or global stylesheet required. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: '100vh', boxSizing: 'border-box', background: '#030508', color: '#f3f6fc', fontFamily: 'system-ui, sans-serif', padding: 'clamp(32px, 8vw, 80px) 24px' }}>
        <main style={{ maxWidth: 680, margin: '0 auto' }}>
          <img src="/brand/v2/reference-symbol.svg" width={48} height={48} alt="" style={{ display: 'block', objectFit: 'contain' }} />
          <p style={{ marginTop: 44, color: '#b0b8ca', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Synaura · Interruption</p>
          <h1 style={{ margin: '20px 0', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 'clamp(36px, 7vw, 60px)', fontWeight: 750, lineHeight: 1, letterSpacing: '-0.06em' }}>Nous n’avons pas pu ouvrir cette page.</h1>
          <p style={{ maxWidth: 480, color: '#b0b8ca', fontSize: 16, lineHeight: 1.8 }}>Réessaie dans un instant, ou retrouve Synaura depuis l’accueil.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32 }}>
            <button type="button" onClick={() => reset()} style={{ minHeight: 48, padding: '12px 20px', borderRadius: 5, background: '#315fea', color: '#fff', border: '1px solid #608dff', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Réessayer</button>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box', minHeight: 48, padding: '12px 20px', borderRadius: 8, background: '#10141e', color: '#eff1f8', border: '1px solid #30384a', textDecoration: 'none', fontSize: 14 }}>Retour à l’accueil</a>
          </div>
          <details style={{ marginTop: 44, paddingTop: 20, borderTop: '1px solid #30384a' }}>
            <summary style={{ minHeight: 44, fontSize: 13, color: '#b0b8ca', cursor: 'pointer' }}>Détails techniques</summary>
            <pre style={{ margin: '0 0 20px', padding: 16, background: '#10141e', borderRadius: 8, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 240, overflow: 'auto', color: '#b0b8ca' }}>
              {error?.message || 'Erreur inconnue'}
              {'\n\n'}
              {error?.stack || ''}
            </pre>
          </details>
        </main>
      </body>
    </html>
  );
}

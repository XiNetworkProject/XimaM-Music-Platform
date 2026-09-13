import SynauraLogo from '@/components/brand/SynauraLogo';

export default function NotFound() {
  return (
    <main className="v2-personal v2-page" style={{ minHeight: '70vh', maxWidth: 760, margin: '0 auto', padding: 'clamp(32px, 8vw, 80px) 24px', color: 'var(--v2-text, #eff1f8)' }}>
      <SynauraLogo variant="lockup" size={42} />
      <p className="v2-kicker" style={{ marginTop: 48 }}>404 · Un autre chemin</p>
      <h1 className="v2-heading" style={{ margin: '20px 0', fontSize: 'clamp(40px, 6vw, 64px)' }}>Page introuvable.</h1>
      <p className="v2-intro">Cette page n’existe pas ou a été déplacée.</p>
      <a href="/" className="v2-action v2-action-primary" style={{ marginTop: 32 }}>Retour à l’accueil</a>
    </main>
  );
}


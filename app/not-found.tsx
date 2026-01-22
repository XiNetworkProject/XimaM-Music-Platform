export default function NotFound() {
  return (
    <div className="min-h-[70vh] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-border-secondary bg-background-fog-thin p-6 text-center">
        <div className="text-2xl font-semibold text-foreground-primary">Page introuvable</div>
        <div className="mt-2 text-sm text-foreground-secondary">
          Cette page n’existe pas (ou a été déplacée).
        </div>
        <a
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-overlay-on-primary px-4 text-foreground-primary hover:opacity-90 transition"
        >
          Retour à l’accueil
        </a>
      </div>
    </div>
  );
}


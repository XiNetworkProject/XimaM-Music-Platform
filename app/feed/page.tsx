import { Suspense } from 'react';
import FeedClient from './FeedClient';

function FeedFallback() {
  return (
    <div className="min-h-screen w-full px-3 sm:px-5 pt-6 pb-24 text-foreground-primary">
      <div className="mx-auto w-full max-w-3xl">
        <div className="panel-suno border border-border-secondary rounded-2xl p-4">
          <div className="text-sm text-foreground-inactive">Chargement…</div>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <div className="min-h-screen w-full px-3 sm:px-5 pt-6 pb-24 text-foreground-primary">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4">
          <div className="text-xl font-bold">Feed (test “TikTok-like”)</div>
          <div className="text-sm text-foreground-inactive">
            Prototype comportement: scroll snap + item actif + autoplay audio après geste utilisateur.
          </div>
        </div>

        <Suspense fallback={<FeedFallback />}>
          <FeedClient />
        </Suspense>
      </div>
    </div>
  );
}


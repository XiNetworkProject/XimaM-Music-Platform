'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function MobileGoogleSignIn() {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const callbackUrl = searchParams.get('callbackUrl');
  const safeCallbackUrl = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//')
    ? callbackUrl
    : '/api/auth/mobile/google/callback';

  useEffect(() => {
    void signIn('google', { callbackUrl: safeCallbackUrl }).catch(() => {
      setError('Connexion Google impossible. Tu peux fermer cette fenetre.');
    });
  }, [safeCallbackUrl]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0c12] px-6 text-center text-white">
      <div>
        <p className="text-xl font-black">Synaura</p>
        <p className="mt-3 text-sm text-white/60">{error || 'Ouverture de la connexion Google...'}</p>
      </div>
    </main>
  );
}

export default function MobileGooglePage() {
  return <Suspense fallback={null}><MobileGoogleSignIn /></Suspense>;
}

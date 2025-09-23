import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Chemins autorisés sans restriction (auth, api webhook/public, static)
const PUBLIC_PATHS = [
  '/',
  '/api/health',
  '/api/auth',
  '/api/upload/cleanup',
  '/waitlist',
  '/_next',
  '/favicon',
  '/public',
  '/assets',
  '/images',
  '/icons',
];

export async function middleware(req: NextRequest) {
  // En dev, désactiver le middleware pour éviter les erreurs sandbox/ESM
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }
  const { pathname } = req.nextUrl;
  // Bypass pour fichiers statiques et chemins publics
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Bypass API publiques spécifiques
  if (pathname.startsWith('/api/ai/') || pathname.startsWith('/api/billing/webhook')) {
    return NextResponse.next();
  }

  // Lire cookies d'accès anticipé
  const cookieFlag = req.cookies.get('ea')?.value;
  if (cookieFlag === '1') {
    return NextResponse.next();
  }

  // Pas d'appel réseau ici (Edge). La vérification sera faite côté client depuis /waitlist.

  // Rediriger vers la waitlist
  const url = req.nextUrl.clone();
  url.pathname = '/waitlist';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};



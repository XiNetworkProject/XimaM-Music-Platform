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

  // Interroger endpoint de vérification côté serveur
  try {
    const origin = req.nextUrl.origin;
    const res = await fetch(`${origin}/api/early-access/check`, {
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.allowed) {
        // Définir un cookie court pour éviter l'appel à chaque requête
        const response = NextResponse.next();
        response.cookies.set('ea', '1', { httpOnly: false, maxAge: 60 * 10, path: '/' });
        return response;
      }
    }
  } catch {}

  // Rediriger vers la waitlist
  const url = req.nextUrl.clone();
  url.pathname = '/waitlist';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};



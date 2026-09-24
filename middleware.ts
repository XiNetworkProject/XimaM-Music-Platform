import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  isPastShutdownEnd,
  isShutdownAllowedPath,
  SYNAURA_SHUTDOWN_NOTICES_ENABLED,
} from '@/lib/synauraShutdown';
import { shouldBlockDiagnosticPage } from '@/lib/diagnostics';
import { voicePreviewDecision } from '@/lib/voice/previewGate';

function securePageResponse(response: NextResponse, pathname: string) {
  if (pathname === '/embed' || pathname.startsWith('/embed/')) {
    response.headers.set('Content-Security-Policy', 'frame-ancestors *');
    response.headers.delete('X-Frame-Options');
  } else {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Content-Security-Policy', "frame-ancestors 'self'");
  }
  return response;
}

function publicRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (forwardedHost && /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(forwardedHost)) {
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const protocol = forwardedProto === 'http' ? 'http' : 'https';
    return `${protocol}://${forwardedHost}`;
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
    } catch {}
  }

  return request.nextUrl.origin;
}

// Pages publiques (accessibles sans authentification)
const publicPages = [
  '/',
  '/discover',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/reset-password',
  '/api/auth/count-users',
  '/track',
  '/embed',
  '/join',
  '/landing',
  '/fermeture',
  '/arret',
];

// Pages protégées (nécessitent une authentification)
const protectedPages = [
  '/profile/edit',
  '/upload',
  '/library',
  '/messages',
  '/stats',
  '/subscriptions',
  '/ai-generator',
  '/studio',
  '/settings',
  '/admin',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (process.env.SYNAURA_VOICE_PREVIEW === 'true') {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET, secureCookie: true });
    const decision = voicePreviewDecision(process.env, pathname, request.method, typeof token?.id === 'string' ? token.id : '');
    if (decision !== 'allow') {
      const response = decision === 'login'
        ? NextResponse.redirect(new URL('/auth/signin?callbackUrl=%2Fmessages', process.env.NEXTAUTH_URL))
        : new NextResponse('Prévisualisation privée : accès non autorisé.', { status: decision === 'unavailable' ? 503 : decision === 'unauthorized' ? 401 : 403 });
      response.headers.set('Cache-Control', 'private, no-store');
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return response;
    }
  }
  // APIs were previously outside the matcher. Keep public production behavior unchanged.
  if (pathname.startsWith('/api/') || pathname === '/_next/image') return NextResponse.next();
  if (shouldBlockDiagnosticPage(pathname)) {
    return securePageResponse(new NextResponse('Not Found', { status: 404 }), pathname);
  }
  if (
    !SYNAURA_SHUTDOWN_NOTICES_ENABLED &&
    (pathname === '/fermeture' || pathname === '/arret')
  ) {
    return securePageResponse(NextResponse.redirect(new URL('/', publicRequestOrigin(request))), pathname);
  }

  // Après la date de fin : seules les pages d'information restent accessibles
  if (isPastShutdownEnd() && !isShutdownAllowedPath(pathname)) {
    const arretUrl = new URL('/arret', publicRequestOrigin(request));
    if (pathname !== arretUrl.pathname) {
      return securePageResponse(NextResponse.redirect(arretUrl), pathname);
    }
  }
  
  // Vérifier si c'est une page publique
  const isPublicPage = publicPages.some(page => 
    pathname === page || pathname.startsWith(page + '/')
  );
  
  // Vérifier si c'est une page protégée
  const isProtectedPage = protectedPages.some(page => 
    pathname.startsWith(page)
  );
  
  // Si c'est une page publique, laisser passer
  if (isPublicPage) {
    return securePageResponse(NextResponse.next(), pathname);
  }
  
  // Si c'est une page protégée, vérifier l'authentification
  if (isProtectedPage) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      // Si un cookie de session NextAuth est présent, laisser passer pour éviter les boucles
      const hasSessionCookie = Boolean(
        request.cookies.get('next-auth.session-token') ||
        request.cookies.get('__Secure-next-auth.session-token')
      );
      if (hasSessionCookie) {
        return securePageResponse(NextResponse.next(), pathname);
      }
      // Rediriger vers la page de connexion
      // L'origine vient du site public explicite ou des en-têtes du reverse proxy.
      // request.url contient l'origine interne localhost:3000 en production.
      const signInUrl = new URL('/auth/signin', publicRequestOrigin(request));
      // La destination reste toujours relative et ne peut donc pas devenir un open redirect.
      const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      signInUrl.searchParams.set('callbackUrl', callbackUrl);
      return securePageResponse(NextResponse.redirect(signInUrl), pathname);
    }

    // Guard admin: /admin nécessite role=admin (ou bootstrap via env ADMIN_OWNER_EMAILS)
    if (pathname.startsWith('/admin')) {
      const tokenRole = (token as any)?.role as string | undefined;
      const tokenEmail = ((token as any)?.email as string | undefined) || '';
      const defaultOwners = ['vermeulenmaxime59@gmail.com'];
      const owners = String(process.env.ADMIN_OWNER_EMAILS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const allOwners = [...defaultOwners, ...owners].map((e) => String(e).toLowerCase());
      const isOwner = tokenEmail ? allOwners.includes(tokenEmail.toLowerCase()) : false;
      // IMPORTANT:
      // Le rôle dans le JWT peut être "stale" après un changement de role en DB.
      // On laisse passer tout utilisateur authentifié vers /admin, et on s'appuie sur
      // le guard serveur (getAdminGuard + layout /admin) + les routes API /api/admin/*,
      // qui vérifient le rôle en base.
      if (tokenRole === 'admin' || isOwner) {
        return securePageResponse(NextResponse.next(), pathname);
      }
      return securePageResponse(NextResponse.next(), pathname);
    }
  }
  
  // Pour toutes les autres pages, laisser passer
  return securePageResponse(NextResponse.next(), pathname);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|favicon.ico).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { WEB_MFA_COOKIE, verifyWebMfaMarker } from '@/lib/webMfaMarker';
import {
  isPastShutdownEnd,
  isShutdownAllowedPath,
  SYNAURA_SHUTDOWN_NOTICES_ENABLED,
} from '@/lib/synauraShutdown';

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

const mfaExemptPages = [
  '/auth/mfa',
  '/auth/error',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/legal',
];
const mfaExemptApiPages = [
  '/api/auth/session',
  '/api/auth/providers',
  '/api/auth/csrf',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/callback',
  '/api/auth/error',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/count-users',
  '/api/auth/web/mfa',
];

function hasNextAuthCookie(request: NextRequest) {
  return Boolean(
    request.cookies.get('next-auth.session-token')
    || request.cookies.get('__Secure-next-auth.session-token'),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    !SYNAURA_SHUTDOWN_NOTICES_ENABLED &&
    (pathname === '/fermeture' || pathname === '/arret')
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Après la date de fin : seules les pages d'information restent accessibles
  if (isPastShutdownEnd() && !isShutdownAllowedPath(pathname)) {
    const arretUrl = new URL('/arret', request.url);
    if (pathname !== arretUrl.pathname) {
      return NextResponse.redirect(arretUrl);
    }
  }

  const hasSessionCookie = hasNextAuthCookie(request);
  const token = hasSessionCookie
    ? await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
    })
    : null;
  const mfaExempt = mfaExemptApiPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  ) || mfaExemptPages.some((page) => pathname === page || pathname.startsWith(`${page}/`));

  if (token?.mfaRequired && !mfaExempt) {
    const userId = typeof token.id === 'string' ? token.id : '';
    const sessionId = typeof token.authSessionId === 'string'
      ? token.authSessionId
      : `${typeof token.sub === 'string' ? token.sub : userId}:${typeof token.iat === 'number' ? token.iat : 0}`;
    const verified = userId && sessionId && process.env.NEXTAUTH_SECRET
      ? await verifyWebMfaMarker(
        request.cookies.get(WEB_MFA_COOKIE)?.value,
        { userId, sessionId },
        process.env.NEXTAUTH_SECRET,
      )
      : false;

    if (!verified) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Verification 2FA requise', code: 'MFA_REQUIRED' },
          { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
        );
      }
      const mfaUrl = new URL('/auth/mfa', request.url);
      mfaUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(mfaUrl);
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
    return NextResponse.next();
  }
  
  // Si c'est une page protégée, vérifier l'authentification
  if (isProtectedPage) {
    if (!token) {
      // Rediriger vers la page de connexion
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(signInUrl);
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
        return NextResponse.next();
      }
      return NextResponse.next();
    }
  }
  
  // Pour toutes les autres pages, laisser passer
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|mp3|wav|m4a|mp4|webm)$).*)',
  ],
};

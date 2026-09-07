import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  isPastShutdownEnd,
  isShutdownAllowedPath,
  SYNAURA_SHUTDOWN_NOTICES_ENABLED,
} from '@/lib/synauraShutdown';
import { shouldBlockDiagnosticPage } from '@/lib/diagnostics';

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
  if (shouldBlockDiagnosticPage(pathname)) {
    return securePageResponse(new NextResponse('Not Found', { status: 404 }), pathname);
  }
  if (
    !SYNAURA_SHUTDOWN_NOTICES_ENABLED &&
    (pathname === '/fermeture' || pathname === '/arret')
  ) {
    return securePageResponse(NextResponse.redirect(new URL('/', request.url)), pathname);
  }

  // Après la date de fin : seules les pages d'information restent accessibles
  if (isPastShutdownEnd() && !isShutdownAllowedPath(pathname)) {
    const arretUrl = new URL('/arret', request.url);
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
      const signInUrl = new URL('/auth/signin', request.url);
      // Toujours conserver une destination relative. Derriere nginx, request.url
      // peut contenir l'origine interne (localhost:3000), ce qui renvoyait
      // l'utilisateur vers l'accueil apres la connexion en production.
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

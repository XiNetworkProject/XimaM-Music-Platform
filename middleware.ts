import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Pages publiques (accessibles sans authentification)
const publicPages = [
  '/',
  '/discover',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/reset-password',
  '/api/auth/count-users'
];

// Pages protégées (nécessitent une authentification)
const protectedPages = [
  '/profile',
  '/upload',
  '/library',
  '/messages',
  '/stats',
  '/subscriptions',
  '/ai-generator',
  '/settings',
  '/admin',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
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
        return NextResponse.next();
      }
      // Rediriger vers la page de connexion
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', request.url);
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

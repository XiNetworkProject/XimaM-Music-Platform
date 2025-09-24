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
  '/settings'
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
      // Rediriger vers la page de connexion
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
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

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

const EARLY_ACCESS_LIMIT = 50;

export async function middleware(request: NextRequest) {
  // Vérifier si l'utilisateur est authentifié
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    // Rediriger vers la page d'attente si pas authentifié
    if (request.nextUrl.pathname !== '/waiting-list') {
      return NextResponse.redirect(new URL('/waiting-list', request.url));
    }
    return NextResponse.next();
  }

  try {
    // Vérifier si l'utilisateur a l'accès anticipé
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('early_access')
      .eq('id', session.user.id)
      .single();

    if (!profile?.early_access) {
      // Rediriger vers la page d'attente si pas d'accès anticipé
      if (request.nextUrl.pathname !== '/waiting-list') {
        return NextResponse.redirect(new URL('/waiting-list', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Erreur middleware early access:', error);
    // En cas d'erreur, permettre l'accès pour éviter de bloquer l'app
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - waiting-list (page d'attente)
     * - auth (pages d'authentification)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|waiting-list|auth).*)',
  ],
};

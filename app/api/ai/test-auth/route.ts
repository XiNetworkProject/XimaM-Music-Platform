import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { diagnosticsEnabled } from '@/lib/diagnostics';

export async function GET(request: NextRequest) {
  if (!diagnosticsEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        authenticated: false,
        error: 'Non authentifié'
      }, { status: 401 });
    }

    return NextResponse.json({ 
      authenticated: true,
      userId: session.user.id,
    });

  } catch {
    console.error('[ai/test-auth] verification impossible');
    return NextResponse.json({ error: 'Erreur lors du test d\'authentification' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

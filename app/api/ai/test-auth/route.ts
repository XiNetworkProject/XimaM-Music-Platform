import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { diagnosticsEnabled } from '@/lib/diagnostics';

export async function GET(request: NextRequest) {
  if (!diagnosticsEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    console.log('🔍 Test authentification...');
    
    const session = await getServerSession(authOptions);
    console.log('👤 Session complète:', session);
    
    if (!session?.user?.id) {
      console.log('❌ Non authentifié');
      return NextResponse.json({ 
        authenticated: false,
        error: 'Non authentifié'
      }, { status: 401 });
    }

    console.log('✅ Authentifié:', session.user.id);
    return NextResponse.json({ 
      authenticated: true,
      userId: session.user.id,
      user: session.user
    });

  } catch (error) {
    console.error('❌ Erreur test auth:', error);
    return NextResponse.json({ 
      error: 'Erreur lors du test d\'authentification',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

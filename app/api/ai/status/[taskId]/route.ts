import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const SUNO_API_KEY = process.env.SUNO_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    console.log('🔍 Début vérification statut...');
    
    const session = await getServerSession(authOptions);
    console.log('👤 Session:', session ? 'OK' : 'Non authentifié');
    
    if (!session?.user?.id) {
      console.log('❌ Non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { taskId } = params;
    console.log('🆔 Task ID:', taskId);
    
    if (!taskId) {
      console.log('❌ Task ID manquant');
      return NextResponse.json({ error: 'Task ID manquant' }, { status: 400 });
    }

    if (!SUNO_API_KEY) {
      console.log('❌ Clé API Suno manquante');
      return NextResponse.json({ error: 'Clé API Suno manquante' }, { status: 500 });
    }

    console.log('🔑 Clé API Suno:', SUNO_API_KEY.substring(0, 8) + '...');

    // Suno API ne supporte pas le polling, utiliser les webhooks
    console.log('🌐 Suno API utilise les webhooks, pas le polling');
    
    // Retourner un statut en attente
    const result = {
      taskId,
      status: 'pending',
      audioUrls: [],
      error: null,
      callbackType: 'pending',
      message: 'Génération en cours via webhook',
      timestamp: new Date().toISOString()
    };

    console.log('✅ Résultat (webhook):', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Erreur vérification statut:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la vérification du statut',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

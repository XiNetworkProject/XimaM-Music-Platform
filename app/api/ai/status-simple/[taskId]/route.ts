import { NextRequest, NextResponse } from 'next/server';

const SUNO_API_KEY = process.env.SUNO_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    console.log('🔍 Début vérification statut simple...');
    
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

    // Vérifier le statut auprès de Suno API
    console.log('🌐 Appel Suno API...');
    const response = await fetch(`https://api.sunoapi.org/api/v1/generate/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    });

    console.log('📡 Réponse Suno:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur Suno API:', errorText);
      return NextResponse.json({ 
        error: 'Erreur lors de la vérification du statut',
        sunoError: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log(`📊 Status check pour ${taskId}:`, JSON.stringify(data, null, 2));

    // Extraire les informations de statut selon la documentation officielle
    const status = data.data?.status || data.status || 'pending';
    const audioUrls = data.data?.data?.map((item: any) => item.audio_url) || [];
    const error = data.data?.error || data.error;
    const callbackType = data.data?.callbackType || 'pending';

    const result = {
      taskId,
      status,
      audioUrls,
      error,
      callbackType,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Résultat:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Erreur vérification statut:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la vérification du statut',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

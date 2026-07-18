import { NextRequest, NextResponse } from 'next/server';
import { diagnosticsEnabled } from '@/lib/diagnostics';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  if (!diagnosticsEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    console.log('🔍 Debug status pour:', params.taskId);
    
    // Simuler différents états de génération
    const random = Math.random();
    
    if (random < 0.3) {
      // 30% de chance : génération en cours
      return NextResponse.json({
        taskId: params.taskId,
        status: 'pending',
        audioUrls: [],
        error: null,
        callbackType: 'pending',
        timestamp: new Date().toISOString()
      });
    } else if (random < 0.6) {
      // 30% de chance : première piste terminée
      return NextResponse.json({
        taskId: params.taskId,
        status: 'pending',
        audioUrls: ['/temp/debug_audio_1.wav'],
        error: null,
        callbackType: 'first',
        timestamp: new Date().toISOString()
      });
    } else {
      // 40% de chance : génération terminée
      return NextResponse.json({
        taskId: params.taskId,
        status: 'completed',
        audioUrls: [
          '/temp/debug_audio_1.wav',
          '/temp/debug_audio_2.wav'
        ],
        error: null,
        callbackType: 'complete',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Erreur debug status:', error);
    return NextResponse.json({ 
      error: 'Erreur debug status',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

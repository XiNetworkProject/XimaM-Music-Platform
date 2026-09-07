import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { verifySunoCallback } from '@/lib/sunoWebhook';

export async function POST(request: NextRequest) {
  try {
    if (!verifySunoCallback(request)) {
      return NextResponse.json({ error: 'Signature callback invalide' }, { status: 401 });
    }
    const body = await request.json();

    const { code, msg, data } = body;

    // Vérifier la structure du callback selon la documentation
    if (!data || !data.task_id) {
      return NextResponse.json({ error: 'Webhook invalide' }, { status: 400 });
    }

    const taskId = data.task_id;
    const callbackType = data.callbackType;
    const musicData = data.data || [];

    // Traiter selon le type de callback
    if (code === 200 && callbackType === 'complete') {
      // Génération terminée avec succès
      // Mettre à jour la base de données avec les URLs audio
      if (musicData.length > 0) {
        const audioUrls = musicData.map((item: any) => item.audio_url);
        const firstMusic = musicData[0];
        
        try {
          // Mettre à jour l'enregistrement dans ai_generations
          const { error } = await db
            .from('ai_generations')
            .update({
              audio_url: audioUrls.join('|'), // Stocker toutes les URLs séparées par |
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('task_id', taskId);

          if (error) {
            console.error('[ai/webhook] mise a jour impossible');
          }
        } catch {
          console.error('[ai/webhook] mise a jour impossible');
        }
      }
    } else if (code !== 200) {
      // Génération échouée
      try {
        const { error } = await db
          .from('ai_generations')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('task_id', taskId);

        if (error) {
          console.error('[ai/webhook] mise a jour impossible');
        }
      } catch {
        console.error('[ai/webhook] mise a jour impossible');
      }
    }

    // Retourner 200 pour confirmer la réception
    return NextResponse.json({ 
      status: 'received',
      taskId,
      callbackType 
    });

  } catch {
    console.error('[ai/webhook] traitement impossible');
    return NextResponse.json({ error: 'Erreur traitement webhook' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

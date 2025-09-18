import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🎵 Webhook Suno reçu:', JSON.stringify(body, null, 2));

    const { code, msg, data } = body;

    // Vérifier la structure du callback selon la documentation
    if (!data || !data.task_id) {
      console.error('❌ Webhook invalide: task_id manquant');
      return NextResponse.json({ error: 'Webhook invalide' }, { status: 400 });
    }

    const taskId = data.task_id;
    const callbackType = data.callbackType;
    const musicData = data.data || [];

    console.log(`📊 Callback Suno pour ${taskId}:`, {
      code,
      callbackType,
      musicCount: musicData.length
    });

    // Traiter selon le type de callback
    if (code === 200 && callbackType === 'complete') {
      // Génération terminée avec succès
      console.log(`✅ Génération Suno terminée pour ${taskId}`);
      
      // Mettre à jour la base de données avec les URLs audio
      if (musicData.length > 0) {
        const audioUrls = musicData.map((item: any) => item.audio_url);
        const firstMusic = musicData[0];
        
        try {
          // Mettre à jour l'enregistrement dans ai_generations
          const { error } = await supabase
            .from('ai_generations')
            .update({
              audio_url: audioUrls.join('|'), // Stocker toutes les URLs séparées par |
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('task_id', taskId);

          if (error) {
            console.error('❌ Erreur mise à jour DB:', error);
          } else {
            console.log(`✅ Base de données mise à jour pour ${taskId}`);
          }
        } catch (error) {
          console.error('❌ Erreur mise à jour DB:', error);
        }
      }
    } else if (code !== 200) {
      // Génération échouée
      console.error(`❌ Génération Suno échouée pour ${taskId}:`, msg);
      
      try {
        const { error } = await supabase
          .from('ai_generations')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('task_id', taskId);

        if (error) {
          console.error('❌ Erreur mise à jour DB:', error);
        }
      } catch (error) {
        console.error('❌ Erreur mise à jour DB:', error);
      }
    }

    // Retourner 200 pour confirmer la réception
    return NextResponse.json({ 
      status: 'received',
      taskId,
      callbackType 
    });

  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return NextResponse.json({ 
      error: 'Erreur traitement webhook',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

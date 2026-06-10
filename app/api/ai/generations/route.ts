// app/api/ai/generations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from '@/lib/getApiSession';
import { aiGenerationService } from '@/lib/aiGenerationService';

export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Récupérer les générations de l'utilisateur
    const generations = await aiGenerationService.getUserGenerations(userId);
    
    console.log(`📊 Générations récupérées pour ${userId}:`, generations.length);
    console.log(`📊 Détails des générations:`, generations.map(g => ({
      id: g.id,
      taskId: g.task_id,
      status: g.status,
      tracksCount: g.tracks?.length || 0,
      metadata: g.metadata
    })));
    
    // Retourner toutes les générations (pas seulement les complétées)
    console.log(`✅ Toutes les générations:`, generations.length);
    
    return NextResponse.json({
      generations: generations.map(gen => ({
        id: gen.id,
        taskId: gen.task_id,
        status: gen.status,
        title: gen.metadata?.title || 'Musique générée',
        style: gen.metadata?.style || 'Custom',
        prompt: gen.prompt,
        createdAt: gen.created_at,
        tracks: (gen.tracks || []).map(track => ({
          id: track.id,
          title: track.title,
          audioUrl: track.audio_url, // Conversion snake_case vers camelCase
          streamAudioUrl: track.stream_audio_url || '',
          imageUrl: track.image_url || '',
          duration: track.duration,
          prompt: track.prompt || '',
          modelName: track.model_name || '',
          tags: track.tags?.join(', ') || '',
          createTime: new Date(track.created_at).getTime()
        }))
      }))
    });

  } catch (error: any) {
    console.error('❌ Erreur récupération générations:', error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

// app/api/suno/save-tracks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from '@/lib/getApiSession';
import { aiGenerationService } from '@/lib/aiGenerationService';
import { dbAdmin } from '@/lib/database';
import { enforceRequestRateLimit, isSafeOpaqueIdentifier, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export async function POST(req: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(req);
    if (originError) return originError;
    // Vérification de l'authentification
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const limited = enforceRequestRateLimit(req, 'suno-save-tracks-user', 20, 60_000, session.user.id);
    if (limited) return limited;

    const parsed = await readLimitedJson<any>(req, 256 * 1024);
    if (!parsed.ok) return parsed.response;
    const { taskId, tracks, status } = parsed.value;
    const normalizedStatus: 'partial' | 'completed' = status === 'completed' ? 'completed' : 'partial';

    if (!isSafeOpaqueIdentifier(taskId) || !Array.isArray(tracks) || tracks.length === 0 || tracks.length > 8) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const { data: existingGeneration, error: generationError } = await dbAdmin
      .from('ai_generations')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (generationError) return NextResponse.json({ error: 'Verification impossible' }, { status: 500 });
    if (!existingGeneration) return NextResponse.json({ error: 'Generation introuvable' }, { status: 404 });
    const generationId = existingGeneration.id;

    // Les previews stream sont acceptees ici pour debloquer la lecture rapide;
    // le callback complete remplace ensuite avec l'audio final quand disponible.
    const hasPlayableAudio = (t: any) => {
      const hasAudio = typeof t?.audio === 'string' && t.audio.trim().length > 0;
      const hasStream = typeof t?.stream === 'string' && t.stream.trim().length > 0;
      return hasAudio || hasStream;
    };

    const tracksToPersist =
      normalizedStatus === 'partial'
        ? (tracks || []).filter(hasPlayableAudio)
        : (tracks || []).filter(hasPlayableAudio);

    if (!tracksToPersist || tracksToPersist.length === 0) {
      return NextResponse.json({
        success: true,
        taskId,
        status: normalizedStatus,
        tracksCount: 0,
        message: 'Aucune piste finale à sauvegarder pour le moment'
      });
    }

    // Sauvegarder les tracks (insert + enrichissement des lignes existantes)
    await aiGenerationService.saveTracks(generationId, tracksToPersist);

    // Mettre à jour le statut uniquement à la fin complète.
    if (normalizedStatus === 'completed') {
      await aiGenerationService.updateGenerationStatus(taskId, 'completed');
    }

    return NextResponse.json({ 
      success: true, 
      taskId, 
      status: normalizedStatus,
      tracksCount: tracksToPersist.length,
      message: 'Musique sauvegardée dans votre bibliothèque IA'
    });

  } catch {
    console.error('[suno/save-tracks] sauvegarde impossible');
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

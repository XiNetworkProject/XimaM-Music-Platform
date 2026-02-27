// app/api/suno/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { aiGenerationService } from '@/lib/aiGenerationService';
import { normalizeSunoItem } from "@/lib/suno-normalize";

// Optionnel: ajoute une vérification d'origine IP/signature si Suno en fournit plus tard.
type CallbackOk = {
  code: number; // 200 si OK
  msg: string;
  data: {
    callbackType: "text" | "first" | "complete" | "error" | string;
    task_id: string;
    data?: Array<{
      id: string;
      audio_url?: string;
      source_audio_url?: string;
      stream_audio_url?: string;
      source_stream_audio_url?: string;
      image_url?: string;
      source_image_url?: string;
      prompt?: string;
      model_name?: string;
      title?: string;
      tags?: string;
      createTime?: string;
      duration?: number;
    }>;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CallbackOk;
    const callbackType = body?.data?.callbackType;
    const taskId = body?.data?.task_id;
    if (!taskId) {
      return NextResponse.json({ received: false, error: 'task_id manquant' }, { status: 400 });
    }

    // Log minimal
    console.log("🎵 Suno callback reçu:", {
      status: body.code,
      type: callbackType,
      taskId,
      items: body.data?.data?.length ?? 0,
      body: JSON.stringify(body, null, 2)
    });

    // Normaliser les tracks s'il y en a (first/complete)
    const tracks = body.data?.data?.length ? body.data.data.map(normalizeSunoItem) : [];

    // Mapper callback Suno vers statuts DB
    const callbackTypeLower = String(callbackType || '').toLowerCase();
    const statusForDb =
      body.code !== 200 || callbackTypeLower === 'error'
        ? 'failed'
        : callbackTypeLower === 'complete'
        ? 'completed'
        : 'pending';

    // Traitement des données reçues
    if (tracks.length > 0) {
      console.log("📊 Tracks reçues:", tracks.map(track => ({
        id: track.id,
        title: track.title || track.raw?.title,
        audioUrl: track.audio || track.raw?.audio_url,
        streamUrl: track.stream || track.raw?.stream_audio_url,
        imageUrl: track.image || track.raw?.image_url,
        duration: track.duration
      })));
    }

    // Mettre à jour la génération même quand c'est une erreur callback sans tracks.
    // Important: ne persister les pistes qu'au callback "complete" pour éviter
    // de figer des URLs partielles/temporaires (first/text).
    // Au "complete", chaque track inclut image_url (cover) et prompt (paroles) fournis par Suno,
    // qui sont enregistrés automatiquement via updateGenerationStatus → saveTracks.
    const shouldPersistTracks = callbackTypeLower === 'complete' && tracks.length > 0;
    try {
      await aiGenerationService.updateGenerationStatus(taskId, statusForDb, shouldPersistTracks ? tracks : undefined);
      console.log("✅ Génération mise à jour en base:", taskId, statusForDb);
    } catch (error) {
      console.error("❌ Erreur mise à jour base:", error);
    }

    // Répondre vite (<=15s). Le traitement lourd (download audio) doit être asynchrone.
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('❌ Erreur callback Suno:', error);
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
  }
}

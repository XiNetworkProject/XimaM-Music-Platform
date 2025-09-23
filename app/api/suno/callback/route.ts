// app/api/suno/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { aiGenerationService } from '@/lib/aiGenerationService';
import { normalizeSunoItem } from "@/lib/suno-normalize";

// Optionnel: ajoute une vérification d'origine IP/signature si Suno en fournit plus tard.
type CallbackOk = {
  code: number; // 200 si OK
  msg: string;
  data: {
    callbackType: "text" | "first" | "complete" | "error";
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

    // Log minimal
    console.log("🎵 Suno callback reçu:", {
      status: body.code,
      type: body.data?.callbackType,
      taskId: body.data?.task_id,
      items: body.data?.data?.length ?? 0,
      body: JSON.stringify(body, null, 2)
    });

    // Traitement des données reçues
    if (body.data?.data && body.data.data.length > 0) {
      console.log("📊 Tracks reçues:", body.data.data.map(track => ({
        id: track.id,
        title: track.title,
        audioUrl: track.audio_url,
        streamUrl: track.stream_audio_url,
        imageUrl: track.image_url,
        duration: track.duration
      })));

      // Normaliser les tracks
      const tracks = body.data.data.map(normalizeSunoItem);

      // Mettre à jour la génération en base
      try {
        await aiGenerationService.updateGenerationStatus(
          body.data.task_id,
          body.data.callbackType === 'complete' ? 'completed' : 'pending',
          tracks
        );
        
        console.log("✅ Génération mise à jour en base:", body.data.task_id);
      } catch (error) {
        console.error("❌ Erreur mise à jour base:", error);
      }
    }

    // Répondre vite (<=15s). Le traitement lourd (download audio) doit être asynchrone.
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('❌ Erreur callback Suno:', error);
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
  }
}

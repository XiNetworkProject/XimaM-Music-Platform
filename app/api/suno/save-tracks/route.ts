// app/api/suno/save-tracks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { aiGenerationService } from '@/lib/aiGenerationService';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { taskId, tracks, status } = await req.json();

    console.log("💾 Sauvegarde tracks:", {
      taskId,
      tracksCount: tracks?.length,
      status,
      userId: session.user.id
    });

    if (!taskId || !tracks || tracks.length === 0) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Vérifier si la génération existe, sinon la créer
    try {
      // D'abord essayer de trouver la génération existante
      const { data: existingGeneration } = await supabaseAdmin
        .from('ai_generations')
        .select('id')
        .eq('task_id', taskId)
        .single();

      if (existingGeneration) {
        // Passer le taskId au lieu de l'id
        await aiGenerationService.updateGenerationStatus(taskId, status, tracks);
        console.log("✅ Génération mise à jour avec succès");
      } else {
        throw new Error("Génération non trouvée");
      }
    } catch (error: any) {
      // Si la génération n'existe pas, la créer
      console.log("⚠️ Génération non trouvée, création avec userId:", session.user.id);
      console.log("📊 Erreur originale:", error.message);
      
      // Fallback sur V4_5 si le modèle n'est pas disponible
      // Note: Le modelName de Suno (chirp-auk) est un identifiant interne, pas utilisable
      const inferredModel = 'V4_5';
      
      const generation = await aiGenerationService.createGeneration(
        session.user.id,
        taskId,
        'Musique générée',
        'Custom',
        '',
        inferredModel,
        { duration: 120 }
      );
      console.log("✅ Génération créée:", generation.id);
      // Puis sauvegarder les tracks et mettre à jour le statut (avec taskId)
      await aiGenerationService.updateGenerationStatus(taskId, status, tracks);
    }

    console.log("✅ Tracks sauvegardées avec succès");

    // Mettre à jour le statut de la génération comme "completed"
    try {
      // Passer directement le taskId
      await aiGenerationService.updateGenerationStatus(taskId, 'completed');
      console.log("✅ Statut de génération mis à jour vers 'completed'");
    } catch (error) {
      console.error("⚠️ Erreur mise à jour statut final:", error);
    }

    return NextResponse.json({ 
      success: true, 
      taskId, 
      tracksCount: tracks.length,
      message: 'Musique sauvegardée dans votre bibliothèque IA'
    });

  } catch (error: any) {
    console.error('❌ Erreur sauvegarde tracks:', error);
    return NextResponse.json({ 
      error: error.message || "Erreur serveur" 
    }, { status: 500 });
  }
}

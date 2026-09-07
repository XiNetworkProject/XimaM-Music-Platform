import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { generateCustomMusic } from '@/lib/suno';
import { aiGenerationService } from '@/lib/aiGenerationService';
import { buildSunoCallbackUrl } from '@/lib/sunoWebhook';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

// Configuration Suno API
const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_API_URL = 'https://api.sunoapi.org/api/v1/generate';

interface SunoGenerationRequest {
  prompt: string;
  duration: number;
  style?: string;
  title?: string;
  lyrics?: string;
  isInstrumental?: boolean;
  model?: string;
  customMode?: boolean;
  styleWeight?: number; // 0.00-1.00
  weirdnessConstraint?: number; // 0.00-1.00
  audioWeight?: number; // 0.00-1.00
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  callBackUrl?: string;
}

interface SunoGenerationResponse {
  code?: number;
  msg?: string;
  data?: {
    id?: string;
    task_id?: string;
    taskId?: string;
    status?: 'pending' | 'completed' | 'failed';
    audio_url?: string;
    error?: string;
  };
  id?: string;
  task_id?: string;
  status?: 'pending' | 'completed' | 'failed';
  audio_url?: string;
  error?: string;
}

async function generateMusicWithSuno(prompt: string, duration: number, style: string, title?: string, lyrics?: string, isInstrumental?: boolean, model?: string, customMode?: boolean, extra?: Partial<SunoGenerationRequest>): Promise<{ success: boolean; audioUrl?: string; taskId?: string; error?: string }> {
  if (!SUNO_API_KEY) {
    console.error('❌ Clé API Suno manquante');
    return { success: false, error: 'Configuration Suno API manquante' };
  }

  try {
    // Améliorer le prompt avec le style
    const stylePrompts = {
      "pop": "pop music, catchy melody, upbeat, modern",
      "rock": "rock music, electric guitar, drums, energetic, powerful",
      "jazz": "jazz music, smooth, saxophone, piano, sophisticated",
      "classical": "classical music, orchestral, elegant, timeless",
      "electronic": "electronic music, synthesizer, electronic beats, futuristic",
      "ambient": "ambient music, atmospheric, peaceful, relaxing",
      "hiphop": "hip hop music, rap beats, urban, rhythmic",
      "country": "country music, acoustic guitar, folk, warm",
      "reggae": "reggae music, laid back, Caribbean, tropical",
      "blues": "blues music, soulful, guitar, emotional"
    };

    let enhancedPrompt = prompt;
    
    // Ajouter le style si spécifié
    if (style && style !== 'custom') {
      enhancedPrompt += `, ${stylePrompts[style as keyof typeof stylePrompts] || style}`;
    }
    
    // Ajouter les paroles si fournies
    if (lyrics && lyrics.trim()) {
      enhancedPrompt += `. Paroles: ${lyrics}`;
    }
    
    // Ajouter l'instruction instrumental si demandé
    if (isInstrumental) {
      enhancedPrompt += '. Musique instrumentale uniquement, sans voix';
    }

    // Utiliser la nouvelle fonction Suno personnalisée
    const result = await generateCustomMusic({
      title: title || 'Musique générée',
      style: style || 'electronic',
      prompt: enhancedPrompt,
      instrumental: isInstrumental || false,
      model: model || 'V4_5PLUS',
      callBackUrl: extra?.callBackUrl,
      styleWeight: extra?.styleWeight,
      weirdnessConstraint: extra?.weirdnessConstraint,
      audioWeight: extra?.audioWeight,
      negativeTags: extra?.negativeTags,
      vocalGender: extra?.vocalGender
    });

    return { success: true, taskId: result.data.taskId };

  } catch {
    console.error('[ai/generate] fournisseur Suno indisponible');
    return { success: false, error: 'Service IA indisponible' };
  }
}

// Fonction de fallback pour générer de la musique simulée
function generateSimulatedMusic(duration: number): string {
  const timestamp = Date.now();
  const fileName = `generation_${timestamp}.wav`;
  const filePath = `public/temp/${fileName}`;
  
  // Créer un fichier WAV avec du contenu musical simulé
  const fs = require('fs');
  const path = require('path');
  
  // Créer le dossier temp s'il n'existe pas
  const tempDir = path.join(process.cwd(), 'public', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Générer des données audio musicales simulées (sine waves avec variations)
  const sampleRate = 44100;
  const channels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  
  const totalSamples = sampleRate * duration * channels;
  const dataSize = totalSamples * bytesPerSample;
  const fileSize = 44 + dataSize;

  // En-tête WAV
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize - 8, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  header.writeUInt16LE(channels * bytesPerSample, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  // Données audio musicales simulées
  const audioData = Buffer.alloc(dataSize);
  let offset = 0;

  for (let i = 0; i < totalSamples / channels; i++) {
    const time = i / sampleRate;
    
    // Créer plusieurs couches de sons pour simuler de la musique
    let sampleValue = 0;
    
    // Couche 1: Basse (fréquence fondamentale)
    const freq1 = 220 + Math.sin(time * 0.5) * 50;
    sampleValue += Math.sin(2 * Math.PI * freq1 * time) * 0.3;
    
    // Couche 2: Mélodie (fréquence moyenne)
    const freq2 = 440 + Math.sin(time * 0.3) * 100;
    sampleValue += Math.sin(2 * Math.PI * freq2 * time) * 0.2;
    
    // Couche 3: Harmonie (fréquence haute)
    const freq3 = 880 + Math.sin(time * 0.7) * 200;
    sampleValue += Math.sin(2 * Math.PI * freq3 * time) * 0.1;
    
    // Ajouter du bruit pour simuler des instruments
    sampleValue += (Math.random() - 0.5) * 0.05;
    
    // Limiter la valeur
    sampleValue = Math.max(-1, Math.min(1, sampleValue));
    
    // Convertir en 16-bit PCM
    const pcmValue = Math.round(sampleValue * 32767);
    
    // Écrire pour les deux canaux
    for (let ch = 0; ch < channels; ch++) {
      audioData.writeInt16LE(pcmValue, offset);
      offset += 2;
    }
  }

  // Écrire le fichier
  fs.writeFileSync(filePath, Buffer.concat([header, audioData]));
  
  return `/temp/${fileName}`;
}

// Validation des quotas utilisateur
async function validateUserQuota(userId: string): Promise<{ canGenerate: boolean; used: number; total: number; remaining: number }> {
  try {
    const quota = await aiGenerationService.getUserQuota(userId);
    
    return {
      canGenerate: quota.remaining > 0,
      used: quota.used_this_month,
      total: quota.monthly_limit,
      remaining: quota.remaining
    };
  } catch (error) {
    console.error('Erreur validation quota:', error);
    return { canGenerate: false, used: 0, total: 10, remaining: 0 };
  }
}

// Enregistrer la génération en base
async function recordGeneration(data: {
  userId: string;
  prompt: string;
  duration: number;
  style: string;
  title: string;
  audioUrl: string;
  success: boolean;
  model: string;
  taskId?: string;
}): Promise<string> {
  try {
    const metadata = {
      style: data.style,
      duration: data.duration,
      originalPrompt: data.prompt
    };

    const generation = await aiGenerationService.createGeneration(
      data.userId,
      data.taskId || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data.title || 'Musique générée',
      data.style || 'custom',
      data.prompt,
      data.model,
      metadata
    );

    return generation.id;
  } catch (error) {
    console.error('Erreur enregistrement génération:', error);
    return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(request);
    if (originError) return originError;
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const limited = enforceRequestRateLimit(request, 'ai-legacy-generate-user', 3, 10 * 60_000, session.user.id);
    if (limited) return limited;

    const parsed = await readLimitedJson<any>(request, 64 * 1024);
    if (!parsed.ok) return parsed.response;
    const { prompt, duration, style = 'pop', title, lyrics, isInstrumental, model, customMode, styleWeight, weirdnessConstraint, audioWeight, negativeTags, vocalGender } = parsed.value;

    // Validation et fallback pour le prompt
    const validatedPrompt = prompt?.trim() || 'Musique générée par IA';
    if (validatedPrompt.length < 3) {
      return NextResponse.json({ error: 'Prompt trop court (minimum 3 caractères)' }, { status: 400 });
    }

    if (duration < 10 || duration > 240) {
      return NextResponse.json({ error: 'Durée invalide (10-240 secondes)' }, { status: 400 });
    }

    // Vérifier le quota
    const quotaCheck = await validateUserQuota(session.user.id);
    if (!quotaCheck.canGenerate) {
      return NextResponse.json({ 
        error: 'Quota dépassé', 
        quota: quotaCheck 
      }, { status: 429 });
    }

    // Essayer Suno API d'abord
    const sunoResult = await generateMusicWithSuno(validatedPrompt, duration, style, title, lyrics, isInstrumental, model, customMode, {
      styleWeight,
      weirdnessConstraint,
      audioWeight,
      negativeTags,
      vocalGender,
      callBackUrl: buildSunoCallbackUrl(request, '/api/suno/callback')
    });
    
    if (sunoResult.success && sunoResult.taskId) {
      // Succès avec Suno API - retourner le taskId pour suivi en temps réel
                // Créer un titre personnalisé basé sur le prompt
      const customTitle = title || validatedPrompt.substring(0, 50) + (validatedPrompt.length > 50 ? '...' : '');
      
      // Enregistrer la génération
      const generationId = await recordGeneration({
        userId: session.user.id,
        prompt: validatedPrompt,
        duration,
        style,
        title: customTitle,
        audioUrl: '', // Sera mis à jour quand la génération sera terminée
        success: true,
        model: `suno-${model || 'V4_5'}`,
        taskId: sunoResult.taskId,
      });

      return NextResponse.json({
        success: true,
        id: generationId,
        taskId: sunoResult.taskId,
        status: 'pending',
        prompt: validatedPrompt,
        duration,
        style,
        title,
        lyrics,
        isInstrumental,
        model: `suno-${model || 'V4_5'}`,
        message: 'Génération en cours...'
      });
    } else {
      // Le fallback WAV est reserve au developpement : en production il pouvait
      // remplir le disque local lors d'indisponibilites fournisseur repetees.
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Service IA temporairement indisponible' }, { status: 502 });
      }
      const audioUrl = generateSimulatedMusic(duration);
      
      // Créer un titre personnalisé basé sur le prompt
      const customTitle = title || validatedPrompt.substring(0, 50) + (validatedPrompt.length > 50 ? '...' : '');
      
      // Enregistrer la génération simulée
      const generationId = await recordGeneration({
        userId: session.user.id,
        prompt: validatedPrompt,
        duration,
        style,
        title: customTitle,
        audioUrl,
        success: true,
        model: 'simulated'
      });

      return NextResponse.json({
        success: true,
        id: generationId,
        audioUrl,
        status: 'completed',
        prompt: validatedPrompt,
        duration,
        style,
        title,
        lyrics,
        isInstrumental,
        model: 'simulated'
      });
    }

  } catch {
    console.error('[ai/generate] generation impossible');
    return NextResponse.json({ error: 'Erreur de generation' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Récupérer les générations de l'utilisateur
    const { db } = await import('@/lib/database');
    
    const { data: generations, error } = await db
      .from('ai_generations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erreur récupération générations:', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    return NextResponse.json({
      generations: generations || [],
      pagination: {
        limit,
        offset,
        total: generations?.length || 0
      }
    });

  } catch (error) {
    console.error('Erreur récupération générations:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

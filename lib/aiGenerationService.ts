// lib/aiGenerationService.ts
import { supabase, supabaseAdmin } from './supabase';
import { Track } from '@/lib/suno-normalize';

export interface AIGeneration {
  id: string;
  user_id: string;
  task_id: string;
  prompt: string;
  model: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  is_favorite: boolean;
  is_public: boolean;
  is_trashed?: boolean;
  play_count: number;
  like_count: number;
  share_count: number;
  metadata: {
    title?: string;
    style?: string;
    total_duration?: number;
    [key: string]: any;
  };
  tracks?: AITrack[];
}

export interface AITrack {
  id: string;
  generation_id: string;
  suno_id?: string;
  title: string;
  audio_url: string;
  stream_audio_url?: string;
  image_url?: string;
  duration: number; // En secondes, entier
  prompt?: string;
  model_name?: string;
  tags?: string[];
  // Champs étendus (si présents en base)
  style?: string | null;
  lyrics?: string | null;
  source_links?: string | null;
  created_at: string;
  is_favorite: boolean;
  is_public?: boolean | null;
  play_count: number;
  like_count: number;
}

export interface UserQuota {
  id: string;
  user_id: string;
  plan_type: 'free' | 'basic' | 'pro' | 'enterprise';
  monthly_limit: number;
  used_this_month: number;
  reset_date: string;
  remaining: number;
}

export interface AIPlaylist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  tracks?: AITrack[];
}

export interface AIUsageStats {
  total_generations: number;
  total_tracks: number;
  total_duration: number;
  favorite_count: number;
  recent_activity: Array<{
    date: string;
    generations: number;
    duration: number;
  }>;
}

class AIGenerationService {
  // 🎵 Créer une nouvelle génération
  async createGeneration(userId: string, taskId: string, title: string, style: string, prompt: string, model: string, metadata: any = {}): Promise<AIGeneration> {
    console.log("🔧 Création génération avec userId:", userId);
    
    const { data, error } = await supabaseAdmin
      .from('ai_generations')
      .insert({
        user_id: userId,
        task_id: taskId,
        prompt,
        model,
        status: 'pending', // Statut initial
        is_public: false,
        metadata: {
          ...metadata,
          total_duration: metadata.duration || 120,
          title: title,
          style: style
        }
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur création génération:", error);
      throw new Error(`Erreur création génération: ${error.message}`);
    }
    
    console.log("✅ Génération créée avec succès:", data.id);
    return data;
  }

  // 🎵 Mettre à jour le statut d'une génération (par task_id)
  async updateGenerationStatus(taskId: string, status: string, tracks?: Track[]): Promise<void> {
    console.log("🔄 Mise à jour statut génération par task_id:", taskId, "->", status);
    
    // Trouver la génération par task_id
    const { data: generation, error: findError } = await supabaseAdmin
      .from('ai_generations')
      .select('id')
      .eq('task_id', taskId)
      .single();

    if (findError || !generation) {
      console.error("❌ Génération non trouvée pour task_id:", taskId, findError);
      throw new Error(`Génération non trouvée pour task_id: ${taskId}`);
    }

    const generationId = generation.id;
    const updateData: any = { status };

    const { error } = await supabaseAdmin
      .from('ai_generations')
      .update(updateData)
      .eq('id', generationId);

    if (error) {
      console.error("❌ Erreur mise à jour statut:", error);
      throw new Error(`Erreur mise à jour statut: ${error.message}`);
    }

    console.log("✅ Statut mis à jour avec succès:", generationId, "->", status);

    // Sauvegarder les tracks si fournies
    if (tracks && tracks.length > 0) {
      await this.saveTracks(generationId, tracks);
    }
  }

  // 🎵 Sauvegarder les tracks d'une génération (callback "complete" Suno).
  // Chaque track persiste : audio_url, stream, image_url (cover), prompt/lyrics (paroles), durée, tags.
  async saveTracks(generationId: string, tracks: Track[]): Promise<void> {
    // Récupérer les tracks existantes pour insert + update (les partial saves doivent être enrichis ensuite)
    const { data: existingTracks } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, suno_id, audio_url, stream_audio_url, image_url, duration, prompt, title, tags, style, lyrics, source_links')
      .eq('generation_id', generationId);
    const existingBySunoId = new Map<string, any>();
    (existingTracks || []).forEach((t: any) => {
      const key = String(t?.suno_id || '').trim();
      if (!key) return;
      existingBySunoId.set(key, t);
    });
    
    // Récupérer le titre, le style et le modèle de la génération pour les utiliser dans les tracks
    const { data: generation, error: genError } = await supabaseAdmin
      .from('ai_generations')
      .select('metadata, prompt, model, task_id')
      .eq('id', generationId)
      .single();
    
    if (genError || !generation) {
      console.error("❌ Erreur récupération génération:", genError);
      throw new Error(`Impossible de récupérer la génération ${generationId}`);
    }
    
    const generationTitle = generation?.metadata?.title || 'Musique générée';
    const generationStyle = generation?.metadata?.style || '';
    const generationLyrics = generation?.prompt || '';
    
    const finalModel = generation?.model || 'V4_5';
    
    console.log("🔍 MODÈLE RÉCUPÉRÉ:", {
      generationId,
      modelFromDB: generation?.model,
      finalModel,
      taskId: generation?.task_id
    });
    
    const toInsert: any[] = [];
    const toUpdate: Array<{ sunoId: string; patch: any }> = [];

    tracks.forEach((track, index) => {
      // Suno renvoie les tags comme une chaîne séparée par des virgules
      const tagsString = track.raw?.tags || '';
      const tagsArray = typeof tagsString === 'string' 
        ? tagsString.split(',').map(t => t.trim()).filter(Boolean) 
        : (Array.isArray(tagsString) ? tagsString : []);

      const sunoId = String(track.id || '').trim();
      if (!sunoId) return;

      const nextRow = {
        generation_id: generationId,
        suno_id: sunoId,
        title: track.title || `${generationTitle} ${index + 1}`,
        // Important: audio_url doit rester la piste "finale". Le stream preview reste en stream_audio_url.
        audio_url: track.audio || '',
        stream_audio_url: track.stream || '',
        image_url: track.image || '',
        duration: Math.round(track.duration || 120), // Convertir en entier
        prompt: track.raw?.prompt || generationLyrics || '', // Paroles/lyrics
        // Utiliser UNIQUEMENT le modèle de la génération (celui réellement utilisé par l'utilisateur)
        // Le modelName de Suno (chirp-auk) est un identifiant interne, pas le nom du modèle
        model_name: finalModel,
        tags: tagsArray, // Tags Suno (genres/styles)
        // Style musical séparé
        style: generationStyle || track.raw?.style || tagsString || null,
        lyrics: track.raw?.lyrics || track.raw?.prompt || generationLyrics || null,
        source_links: track.raw?.links ? JSON.stringify(track.raw.links) : null
      };
      const existing = existingBySunoId.get(sunoId);
      if (!existing) {
        toInsert.push(nextRow);
        return;
      }

      const patch: any = {
        // Ne jamais écraser une bonne URL finale par une chaîne vide.
        audio_url: nextRow.audio_url || existing.audio_url || '',
        stream_audio_url: nextRow.stream_audio_url || existing.stream_audio_url || '',
        image_url: nextRow.image_url || existing.image_url || '',
        duration: nextRow.duration || existing.duration || 120,
        prompt: nextRow.prompt || existing.prompt || '',
        title: nextRow.title || existing.title || '',
        tags: (Array.isArray(nextRow.tags) && nextRow.tags.length > 0) ? nextRow.tags : (existing.tags || []),
        style: nextRow.style || existing.style || null,
        lyrics: nextRow.lyrics || existing.lyrics || null,
        source_links: nextRow.source_links || existing.source_links || null,
      };
      toUpdate.push({ sunoId, patch });
    });

    if (toInsert.length > 0) {
      console.log("📊 Nouvelles tracks à insérer:", toInsert);
      const { error: insertError } = await supabaseAdmin
        .from('ai_tracks')
        .insert(toInsert);
      if (insertError) {
        console.error("❌ Erreur insert tracks:", insertError);
        throw new Error(`Erreur sauvegarde tracks: ${insertError.message}`);
      }
    }

    for (const upd of toUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from('ai_tracks')
        .update(upd.patch)
        .eq('generation_id', generationId)
        .eq('suno_id', upd.sunoId);
      if (updateError) {
        console.error("❌ Erreur update track:", upd.sunoId, updateError);
        throw new Error(`Erreur mise à jour track: ${updateError.message}`);
      }
    }

    if (toInsert.length === 0 && toUpdate.length === 0) {
      console.log("ℹ️ Aucune track à insérer/mettre à jour pour", generationId);
      return;
    }

    console.log("✅ Tracks sauvegardées/mises à jour avec succès", {
      inserted: toInsert.length,
      updated: toUpdate.length,
    });
  }

  // 📊 Obtenir le quota d'un utilisateur
  async getUserQuota(userId: string): Promise<UserQuota> {
    const { data, error } = await supabase
      .rpc('get_user_quota_remaining', { user_uuid: userId });

    if (error) throw new Error(`Erreur quota: ${error.message}`);

    // Récupérer les détails du quota
    const { data: quotaData, error: quotaError } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (quotaError && quotaError.code !== 'PGRST116') {
      throw new Error(`Erreur détails quota: ${quotaError.message}`);
    }

    return {
      id: quotaData?.id || '',
      user_id: userId,
      plan_type: quotaData?.plan_type || 'free',
      monthly_limit: quotaData?.monthly_limit || 5,
      used_this_month: quotaData?.used_this_month || 0,
      reset_date: quotaData?.reset_date || new Date().toISOString(),
      remaining: data
    };
  }

  // 📊 Incrémenter l'utilisation du quota
  async incrementQuota(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('increment_ai_usage', { user_uuid: userId });

    if (error) throw new Error(`Erreur incrément quota: ${error.message}`);
    return data;
  }

  // 📚 Obtenir la bibliothèque IA d'un utilisateur
  async getUserLibrary(userId: string, limit: number = 50, offset: number = 0): Promise<AIGeneration[]> {
    const { data, error } = await supabase
      .from('ai_generations')
      .select(`
        *,
        tracks:ai_tracks(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Erreur bibliothèque: ${error.message}`);
    return data || [];
  }

  // 📊 Obtenir les générations récentes d'un utilisateur
  async getUserGenerations(userId: string): Promise<AIGeneration[]> {
    const { data, error } = await supabase
      .from('ai_generations')
      .select(`
        *,
        tracks:ai_tracks(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Erreur récupération générations utilisateur:', error);
      return [];
    }

    return data || [];
  }

  // ❤️ Marquer comme favori
  async toggleFavorite(generationId: string, userId: string): Promise<boolean> {
    const { data: current, error: fetchError } = await supabase
      .from('ai_generations')
      .select('is_favorite')
      .eq('id', generationId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw new Error(`Erreur récupération favori: ${fetchError.message}`);

    const newFavoriteState = !current.is_favorite;

    const { error } = await supabase
      .from('ai_generations')
      .update({ is_favorite: newFavoriteState })
      .eq('id', generationId)
      .eq('user_id', userId);

    if (error) throw new Error(`Erreur mise à jour favori: ${error.message}`);
    return newFavoriteState;
  }

  // 📈 Obtenir les statistiques d'un utilisateur
  async getUserStats(userId: string, daysBack: number = 30): Promise<AIUsageStats> {
    const { data, error } = await supabase
      .rpc('get_user_ai_stats', { 
        user_uuid: userId, 
        days_back: daysBack 
      });

    if (error) throw new Error(`Erreur statistiques: ${error.message}`);
    return data || {
      total_generations: 0,
      total_tracks: 0,
      total_duration: 0,
      favorite_count: 0,
      recent_activity: []
    };
  }

  // 📝 Créer une playlist IA
  async createPlaylist(userId: string, name: string, description?: string, isPublic: boolean = false): Promise<AIPlaylist> {
    const { data, error } = await supabase
      .from('ai_playlists')
      .insert({
        user_id: userId,
        name,
        description,
        is_public: isPublic
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur création playlist: ${error.message}`);
    return data;
  }

  // 🎵 Ajouter une track à une playlist
  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_playlist_tracks')
      .insert({
        playlist_id: playlistId,
        track_id: trackId,
        position: 0 // TODO: Calculer la position
      });

    if (error) throw new Error(`Erreur ajout track: ${error.message}`);
  }

  // 📚 Obtenir les playlists d'un utilisateur
  async getUserPlaylists(userId: string): Promise<AIPlaylist[]> {
    const { data, error } = await supabase
      .from('ai_playlists')
      .select(`
        *,
        tracks:ai_playlist_tracks(
          track:ai_tracks(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erreur playlists: ${error.message}`);
    return data || [];
  }

  // 🎵 Incrémenter le compteur de lecture
  async incrementPlayCount(generationId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_generations')
      .update({ 
        play_count: supabase.rpc('increment', { value: 1 })
      })
      .eq('id', generationId);

    if (error) throw new Error(`Erreur incrément plays: ${error.message}`);
  }

  // 🎵 Incrémenter le compteur de likes
  async incrementLikeCount(generationId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_generations')
      .update({ 
        like_count: supabase.rpc('increment', { value: 1 })
      })
      .eq('id', generationId);

    if (error) throw new Error(`Erreur incrément likes: ${error.message}`);
  }

  // 🎵 Incrémenter le compteur de partages
  async incrementShareCount(generationId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_generations')
      .update({ 
        share_count: supabase.rpc('increment', { value: 1 })
      })
      .eq('id', generationId);

    if (error) throw new Error(`Erreur incrément shares: ${error.message}`);
  }

  // 🔍 Rechercher dans la bibliothèque
  async searchLibrary(userId: string, query: string): Promise<AIGeneration[]> {
    const { data, error } = await supabase
      .from('ai_generations')
      .select(`
        *,
        tracks:ai_tracks(*)
      `)
      .eq('user_id', userId)
      .or(`prompt.ilike.%${query}%,tracks.title.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erreur recherche: ${error.message}`);
    return data || [];
  }

  // 🗑️ Supprimer une génération
  async deleteGeneration(generationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_generations')
      .delete()
      .eq('id', generationId)
      .eq('user_id', userId);

    if (error) throw new Error(`Erreur suppression: ${error.message}`);
  }

  // 📊 Obtenir les générations publiques (découverte)
  async getPublicGenerations(limit: number = 20, offset: number = 0): Promise<AIGeneration[]> {
    const { data, error } = await supabase
      .from('ai_generations')
      .select(`
        *,
        tracks:ai_tracks(*),
        user_id
      `)
      .eq('is_public', true)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Erreur générations publiques: ${error.message}`);
    return data || [];
  }
}

export const aiGenerationService = new AIGenerationService();

import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { getEntitlements } from '@/lib/entitlements';
import { DEFAULT_REMIX_PERMISSIONS, remixPermissionsToRow, sanitizeRemixPermissions } from '@/lib/remixPermissions';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    let ent: ReturnType<typeof getEntitlements> | null = null;
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
      const plan = (profile?.plan || 'free') as any;
      ent = getEntitlements(plan);
      if (ent.uploads.maxTracks > -1) {
        const { count } = await supabaseAdmin.from('tracks').select('*', { count: 'exact', head: true }).eq('creator_id', session.user.id);
        if ((count || 0) >= ent.uploads.maxTracks) {
          return NextResponse.json({ error: `Quota atteint: ${ent.uploads.maxTracks} pistes` }, { status: 403 });
        }
      }
    } catch {}

    if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      const { audioUrl, audioPublicId, coverUrl, coverPublicId, coverVideoUrl, coverVideoPublicId, coverVideoPosterUrl, trackData, duration } = jsonData;
      if (!audioUrl || !trackData?.title) {
        // rollback best-effort si l'audio a été déjà uploadé
        try {
          if (audioPublicId) await cloudinary.uploader.destroy(audioPublicId, { resource_type: 'video' });
          if (coverPublicId) await cloudinary.uploader.destroy(coverPublicId, { resource_type: 'image' });
          if (coverVideoPublicId) await cloudinary.uploader.destroy(coverVideoPublicId, { resource_type: 'video' });
        } catch {}
        return NextResponse.json({ error: 'URL audio et titre requis' }, { status: 400 });
      }

      const trackDuration = Math.round(parseFloat(duration) || 0);
      // Validation côté serveur: taille fichier selon plan (si bytes fournis)
      const audioBytes = jsonData.audioBytes ? Number(jsonData.audioBytes) : 0;
      if (ent && audioBytes > 0) {
        const maxBytes = ent.uploads.maxFileMb * 1024 * 1024;
        if (audioBytes > maxBytes) {
          return NextResponse.json({ error: `Fichier trop volumineux pour votre plan. Limite: ${ent.uploads.maxFileMb} MB.` }, { status: 413 });
        }
      }
      const trackGenre = Array.isArray(trackData.genre) ? trackData.genre : [];
      const albumName: string | null = (trackData.album && String(trackData.album).trim()) ? String(trackData.album).trim() : null;

      // New optional fields from the refactored upload form
      const extraMood = jsonData.mood || null;
      const extraLanguage = jsonData.language || null;
      const extraTags = Array.isArray(jsonData.tags) ? jsonData.tags : null;
      const extraFeaturing = Array.isArray(jsonData.featuring) ? jsonData.featuring : null;
      const extraCredits = jsonData.credits && typeof jsonData.credits === 'object' ? jsonData.credits : null;
      const extraReleaseType = jsonData.release_type || null;
      const extraVisibility = jsonData.visibility || null;
      const extraScheduledAt = jsonData.scheduled_at || null;
      // Le createur choisit explicitement les droits de creation avant publication ;
      // sans choix, on reste sur "remix desactive" (aucune fuite par defaut).
      const remixPermissions = sanitizeRemixPermissions(jsonData.remixPermissions, DEFAULT_REMIX_PERMISSIONS);

      const insertPayload: Record<string, any> = {
          id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: trackData.title,
          description: trackData.description || '',
          lyrics: trackData.lyrics || null,
          genre: trackGenre,
          audio_url: audioUrl,
          cover_url: coverUrl || null,
          album: albumName,
          duration: trackDuration,
          creator_id: session.user.id,
          is_public: extraVisibility === 'private' ? false : trackData.isPublic !== false,
          plays: 0,
          likes: 0,
          is_featured: false,
          audio_size_mb: (jsonData.audioBytes ? Math.round(jsonData.audioBytes / (1024*1024)) : null),
          cover_size_mb: (jsonData.coverBytes ? Math.round(jsonData.coverBytes / (1024*1024)) : null),
          audio_public_id: audioPublicId || null,
          cover_public_id: coverPublicId || null,
          cover_video_url: coverVideoUrl || null,
          cover_video_public_id: coverVideoPublicId || null,
          cover_video_poster_url: coverVideoPosterUrl || null,
          ...remixPermissionsToRow(remixPermissions),
      };

      // Store extended metadata in a JSONB `data` column if the column exists,
      // and also attempt direct columns for forward-compatibility.
      const extendedData: Record<string, any> = {};
      if (extraMood) extendedData.mood = extraMood;
      if (extraLanguage) extendedData.language = extraLanguage;
      if (extraTags) extendedData.tags = extraTags;
      if (extraFeaturing) extendedData.featuring = extraFeaturing;
      if (extraCredits) extendedData.credits = extraCredits;
      if (extraReleaseType) extendedData.release_type = extraReleaseType;
      if (extraVisibility) extendedData.visibility = extraVisibility;
      if (extraScheduledAt) extendedData.scheduled_at = extraScheduledAt;
      if (coverVideoUrl) extendedData.cover_video_url = coverVideoUrl;
      if (coverVideoPublicId) extendedData.cover_video_public_id = coverVideoPublicId;
      if (coverVideoPosterUrl) extendedData.cover_video_poster_url = coverVideoPosterUrl;
      if (trackData.isExplicit) extendedData.is_explicit = true;

      // Try with extended data in a `data` JSONB column, fallback without it
      if (Object.keys(extendedData).length > 0) {
        insertPayload.data = extendedData;
      }

      let track: any = null;
      let error: any = null;
      let currentPayload = insertPayload;

      const insertTrack = (payload: Record<string, any>) => supabaseAdmin.from('tracks').insert(payload).select().single();
      const shouldRetryWithoutVideoColumns = (err: any) => {
        const msg = String(err?.message || err?.details || '');
        return Boolean(err) && (
          msg.includes('cover_video_url') ||
          msg.includes('cover_video_public_id') ||
          msg.includes('cover_video_poster_url') ||
          msg.includes('Could not find') ||
          msg.includes('schema cache')
        );
      };

      const stripVideoColumns = (payload: Record<string, any>) => {
        const { cover_video_url, cover_video_public_id, cover_video_poster_url, ...rest } = payload;
        return rest;
      };

      const shouldRetryWithoutRemixColumns = (err: any) => {
        const msg = String(err?.message || err?.details || '');
        return Boolean(err) && (
          msg.includes('allow_clips') ||
          msg.includes('allow_audio_remix') ||
          msg.includes('allow_ai_variation') ||
          msg.includes('remix_approval_required') ||
          msg.includes('remix_visibility') ||
          msg.includes('Could not find') ||
          msg.includes('schema cache')
        );
      };

      const stripRemixColumns = (payload: Record<string, any>) => {
        const { allow_clips, allow_audio_remix, allow_ai_variation, remix_approval_required, remix_visibility, ...rest } = payload;
        return rest;
      };

      const result = await insertTrack(insertPayload);
      track = result.data;
      error = result.error;

      if (error && shouldRetryWithoutVideoColumns(error)) {
        currentPayload = stripVideoColumns(insertPayload);
        const retry = await insertTrack(currentPayload);
        track = retry.data;
        error = retry.error;
      }

      // Si la migration des droits de creation n'a pas encore ete appliquee, on retente sans ces colonnes.
      if (error && shouldRetryWithoutRemixColumns(error)) {
        currentPayload = stripRemixColumns(currentPayload);
        const retry = await insertTrack(currentPayload);
        track = retry.data;
        error = retry.error;
      }

      // If the `data` column doesn't exist, retry without it
      if (error && currentPayload.data) {
        const { data: _d, ...payloadWithout } = currentPayload;
        const retry = await insertTrack(payloadWithout);
        track = retry.data;
        error = retry.error;
      }

      if (error) {
        // rollback Cloudinary (best-effort)
        try {
          if (audioPublicId) await cloudinary.uploader.destroy(audioPublicId, { resource_type: 'video' });
          if (coverPublicId) await cloudinary.uploader.destroy(coverPublicId, { resource_type: 'image' });
          if (coverVideoPublicId) await cloudinary.uploader.destroy(coverVideoPublicId, { resource_type: 'video' });
        } catch {}
        return NextResponse.json({ error: `Erreur lors de la sauvegarde en base de données: ${error.message}` }, { status: 500 });
      }

      try {
        const { data: artist } = await supabaseAdmin
          .from('profiles')
          .select('username, name')
          .eq('id', session.user.id)
          .maybeSingle();
        if (artist && trackData.isPublic !== false) {
          const { data: followers } = await supabaseAdmin
            .from('user_follows')
            .select('follower_id')
            .eq('following_id', session.user.id);
          if (followers?.length) {
            const { notifyNewTrackFromFollowed } = await import('@/lib/notifications');
            const artistName = artist.name || artist.username || 'Un artiste';
            for (const f of followers.slice(0, 500)) {
              notifyNewTrackFromFollowed(f.follower_id, artistName, trackData.title, track.id, session.user.id).catch(() => {});
            }
          }
        }
      } catch {}

      return NextResponse.json({ success: true, trackId: track.id, message: 'Piste sauvegardée avec succès' });
    } else if (contentType.includes('multipart/form-data')) {
      return NextResponse.json({ success: true, message: 'Piste uploadée avec succès (simulation)' });
    } else {
      return NextResponse.json({ error: 'Content-Type non supporté. Utilisez application/json ou multipart/form-data' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de l\'upload de la piste' }, { status: 500 });
  }
}

export async function GET() { return NextResponse.json({ error: 'Méthode GET non supportée pour cet endpoint' }, { status: 405 }); }
export async function PUT() { return NextResponse.json({ error: 'Méthode PUT non supportée pour cet endpoint' }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: 'Méthode DELETE non supportée pour cet endpoint' }, { status: 405 }); }

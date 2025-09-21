import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { getEntitlements } from '@/lib/entitlements';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
      const plan = (profile?.plan || 'free') as any;
      const ent = getEntitlements(plan);
      if (ent.uploads.maxTracks > -1) {
        const { count } = await supabaseAdmin.from('tracks').select('*', { count: 'exact', head: true }).eq('creator_id', session.user.id);
        if ((count || 0) >= ent.uploads.maxTracks) {
          return NextResponse.json({ error: `Quota atteint: ${ent.uploads.maxTracks} pistes` }, { status: 403 });
        }
      }
    } catch {}

    if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      const { audioUrl, audioPublicId, coverUrl, coverPublicId, trackData, duration } = jsonData;
      if (!audioUrl || !trackData?.title) {
        // rollback best-effort si l'audio a été déjà uploadé
        try {
          if (audioPublicId) await cloudinary.uploader.destroy(audioPublicId, { resource_type: 'video' });
          if (coverPublicId) await cloudinary.uploader.destroy(coverPublicId, { resource_type: 'image' });
        } catch {}
        return NextResponse.json({ error: 'URL audio et titre requis' }, { status: 400 });
      }

      const trackDuration = Math.round(parseFloat(duration) || 0);
      const trackGenre = Array.isArray(trackData.genre) ? trackData.genre : [];

      const { data: track, error } = await supabaseAdmin
        .from('tracks')
        .insert({
          id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: trackData.title,
          description: trackData.description || '',
          genre: trackGenre,
          audio_url: audioUrl,
          cover_url: coverUrl || null,
          duration: trackDuration,
          creator_id: session.user.id,
          is_public: trackData.isPublic !== false,
          plays: 0,
          likes: 0,
          is_featured: false,
          audio_size_mb: (jsonData.audioBytes ? Math.round(jsonData.audioBytes / (1024*1024)) : null),
          cover_size_mb: (jsonData.coverBytes ? Math.round(jsonData.coverBytes / (1024*1024)) : null),
          audio_public_id: audioPublicId || null,
          cover_public_id: coverPublicId || null,
        })
        .select()
        .single();

      if (error) {
        // rollback Cloudinary (best-effort)
        try {
          if (audioPublicId) await cloudinary.uploader.destroy(audioPublicId, { resource_type: 'video' });
          if (coverPublicId) await cloudinary.uploader.destroy(coverPublicId, { resource_type: 'image' });
        } catch {}
        return NextResponse.json({ error: `Erreur lors de la sauvegarde en base de données: ${error.message}` }, { status: 500 });
      }

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

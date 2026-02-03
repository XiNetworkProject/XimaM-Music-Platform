import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteFile } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

/** Extrait le public_id Cloudinary depuis une URL (image ou video). */
function cloudinaryPublicIdFromUrl(url: string | null): string | null {
  if (!url || !url.includes('cloudinary.com')) return null;
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return null;
  const afterUpload = url.substring(uploadIndex + 8);
  const versionRemoved = afterUpload.replace(/^v\d+\//, '');
  const publicIdWithExt = versionRemoved;
  const publicId = publicIdWithExt.split('.')[0];
  return publicId || null;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // 1) Récupérer le profil (images Cloudinary)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, avatar, banner, avatar_public_id, banner_public_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    // 2) Récupérer toutes les pistes du créateur (Cloudinary)
    const { data: tracks, error: tracksErr } = await supabaseAdmin
      .from('tracks')
      .select('id, audio_public_id, cover_public_id, audio_url, cover_url')
      .eq('creator_id', userId);

    if (tracksErr) {
      console.error('Erreur récupération tracks:', tracksErr);
    }

    const tracksList = tracks || [];

    // 3) Supprimer les médias sur Cloudinary (best-effort, ne pas bloquer)
    const deleteCloudinary = async (publicId: string | null, resourceType: 'image' | 'video') => {
      if (!publicId) return;
      try {
        await deleteFile(publicId, resourceType);
      } catch (e) {
        console.warn('Suppression Cloudinary ignorée:', publicId, e);
      }
    };

    // Avatar / bannière
    const avatarId = (profile as any).avatar_public_id || cloudinaryPublicIdFromUrl((profile as any).avatar);
    const bannerId = (profile as any).banner_public_id || cloudinaryPublicIdFromUrl((profile as any).banner);
    await deleteCloudinary(avatarId || null, 'image');
    await deleteCloudinary(bannerId || null, 'image');

    // Pistes : audio (video) et cover (image)
    for (const t of tracksList) {
      const audioId = (t as any).audio_public_id || cloudinaryPublicIdFromUrl((t as any).audio_url);
      const coverId = (t as any).cover_public_id || cloudinaryPublicIdFromUrl((t as any).cover_url);
      await deleteCloudinary(audioId || null, 'video');
      await deleteCloudinary(coverId || null, 'image');
    }

    // 4) Supprimer les données en base (ordre respectant les FKs)
    const tablesToDelete: { table: string; column: string; value: string }[] = [
      { table: 'comment_likes', column: 'user_id', value: userId },
      { table: 'comment_reactions', column: 'user_id', value: userId },
      { table: 'track_likes', column: 'user_id', value: userId },
      { table: 'comments', column: 'user_id', value: userId },
      { table: 'tracks', column: 'creator_id', value: userId },
      { table: 'playlists', column: 'creator_id', value: userId },
      { table: 'user_follows', column: 'follower_id', value: userId },
      { table: 'user_follows', column: 'following_id', value: userId },
      { table: 'follow_requests', column: 'requester_id', value: userId },
      { table: 'follow_requests', column: 'target_id', value: userId },
      { table: 'notifications', column: 'user_id', value: userId },
      { table: 'conversation_participants', column: 'user_id', value: userId },
      { table: 'messages', column: 'sender_id', value: userId },
      { table: 'subscriptions', column: 'user_id', value: userId },
      { table: 'payments', column: 'user_id', value: userId },
    ];

    for (const { table, column, value } of tablesToDelete) {
      try {
        await supabaseAdmin.from(table).delete().eq(column, value);
      } catch (e) {
        console.warn(`Suppression ${table}.${column} ignorée:`, e);
      }
    }

    // comment_moderation et creator_comment_filters (creator_id)
    try {
      await supabaseAdmin.from('comment_moderation').delete().eq('creator_id', userId);
    } catch {
      // table peut ne pas exister
    }
    try {
      await supabaseAdmin.from('creator_comment_filters').delete().eq('creator_id', userId);
    } catch {
      // table peut ne pas exister
    }

    // AI: générations et pistes IA
    const { data: generations } = await supabaseAdmin
      .from('ai_generations')
      .select('id')
      .eq('user_id', userId);
    const genIds = (generations || []).map((g: { id: string }) => g.id);
    if (genIds.length > 0) {
      try {
        await supabaseAdmin.from('ai_tracks').delete().in('generation_id', genIds);
      } catch (e) {
        console.warn('Suppression ai_tracks ignorée:', e);
      }
    }
    try {
      await supabaseAdmin.from('ai_generations').delete().eq('user_id', userId);
    } catch (e) {
      console.warn('Suppression ai_generations ignorée:', e);
    }

    // play_stats (user_id)
    try {
      await supabaseAdmin.from('play_stats').delete().eq('user_id', userId);
    } catch {
      // optionnel
    }

    // 5) Supprimer le profil
    const { error: delProfileErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (delProfileErr) {
      console.error('Erreur suppression profil:', delProfileErr);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du profil' },
        { status: 500 }
      );
    }

    // 6) Supprimer l'utilisateur Supabase Auth (user_boosters, ai_credit_balances, etc. en CASCADE si FK vers auth.users)
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authErr) {
      console.error('Erreur suppression auth user:', authErr);
      return NextResponse.json(
        { error: 'Compte partiellement supprimé ; contactez le support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Compte et données supprimés.' });
  } catch (error: any) {
    console.error('Erreur suppression compte:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la suppression du compte' },
      { status: 500 }
    );
  }
}

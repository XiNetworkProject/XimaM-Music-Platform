import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { deleteLocalMedia, isLocalMediaPublicId, localPublicIdFromUrl } from '@/lib/localMediaStorage';
import { deleteLocalAuthUser } from '@/lib/localAuth';

export const dynamic = 'force-dynamic';

function parseSourceLinks(value: unknown): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try { return JSON.parse(value) || {}; } catch { return {}; }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Inventorier les references avant de supprimer les lignes en base.
    const { data: profile, error: profileErr } = await dbAdmin
      .from('profiles')
      .select('id, avatar, banner, avatar_public_id, banner_public_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const { data: tracks, error: tracksErr } = await dbAdmin
      .from('tracks')
      .select('*')
      .eq('creator_id', userId);

    if (tracksErr) {
      console.error('Erreur récupération tracks:', tracksErr);
    }

    const tracksList = tracks || [];
    const [{ data: posts }, { data: clips }, { data: messages }, { data: generations }, { data: conversationPreferences }] = await Promise.all([
      dbAdmin.from('creator_posts').select('image_url').eq('creator_id', userId),
      dbAdmin.from('music_clips').select('video_public_id, poster_url').eq('creator_id', userId),
      dbAdmin.from('messages').select('id, media_url').eq('sender_id', userId),
      dbAdmin.from('ai_generations').select('id').eq('user_id', userId),
      dbAdmin.from('conversation_participants').select('wallpaper_url').eq('user_id', userId),
    ]);
    const messageIds = (messages || []).map((message: any) => message.id).filter(Boolean);
    const genIds = (generations || []).map((generation: any) => generation.id).filter(Boolean);
    const { data: attachments } = messageIds.length
      ? await dbAdmin.from('message_attachments').select('url, preview_url').in('message_id', messageIds)
      : { data: [] as any[] };
    const { data: aiTracks } = genIds.length
      ? await dbAdmin.from('ai_tracks').select('source_links, audio_url, stream_audio_url, image_url').in('generation_id', genIds)
      : { data: [] as any[] };

    const localIds = new Set<string>();
    const collect = (publicId?: unknown, url?: unknown) => {
      if (typeof publicId === 'string' && isLocalMediaPublicId(publicId)) localIds.add(publicId);
      const fromUrl = localPublicIdFromUrl(url);
      if (fromUrl) localIds.add(fromUrl);
    };
    collect((profile as any).avatar_public_id, (profile as any).avatar);
    collect((profile as any).banner_public_id, (profile as any).banner);
    for (const track of tracksList as any[]) {
      collect(track.audio_public_id, track.audio_url);
      collect(track.cover_public_id, track.cover_url);
      collect(track.cover_video_public_id, track.cover_video_url);
      collect(null, track.cover_video_poster_url);
    }
    for (const post of posts || []) collect(null, (post as any).image_url);
    for (const clip of clips || []) { collect((clip as any).video_public_id); collect(null, (clip as any).poster_url); }
    for (const message of messages || []) collect(null, (message as any).media_url);
    for (const attachment of attachments || []) { collect(null, (attachment as any).url); collect(null, (attachment as any).preview_url); }
    for (const preferences of conversationPreferences || []) collect(null, (preferences as any).wallpaper_url);
    for (const track of aiTracks || []) {
      const links = parseSourceLinks((track as any).source_links);
      collect(links.local_media_public_id, (track as any).audio_url);
      collect(links.local_audio_public_id, (track as any).stream_audio_url);
      collect(links.local_image_public_id, (track as any).image_url);
    }
    for (const publicId of Array.from(localIds)) await deleteLocalMedia(publicId).catch(() => false);

    // 4) Supprimer les données en base (ordre respectant les FKs)
    const tablesToDelete: { table: string; column: string; value: string }[] = [
      { table: 'comment_likes', column: 'user_id', value: userId },
      { table: 'comment_reactions', column: 'user_id', value: userId },
      { table: 'track_likes', column: 'user_id', value: userId },
      { table: 'comments', column: 'user_id', value: userId },
      { table: 'creator_posts', column: 'creator_id', value: userId },
      { table: 'music_clips', column: 'creator_id', value: userId },
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
        await dbAdmin.from(table).delete().eq(column, value);
      } catch (e) {
        console.warn(`Suppression ${table}.${column} ignorée:`, e);
      }
    }

    // comment_moderation et creator_comment_filters (creator_id)
    try {
      await dbAdmin.from('comment_moderation').delete().eq('creator_id', userId);
    } catch {
      // table peut ne pas exister
    }
    try {
      await dbAdmin.from('creator_comment_filters').delete().eq('creator_id', userId);
    } catch {
      // table peut ne pas exister
    }

    // AI: générations et pistes IA
    if (genIds.length > 0) {
      try {
        await dbAdmin.from('ai_tracks').delete().in('generation_id', genIds);
      } catch (e) {
        console.warn('Suppression ai_tracks ignorée:', e);
      }
    }
    try {
      await dbAdmin.from('ai_generations').delete().eq('user_id', userId);
    } catch (e) {
      console.warn('Suppression ai_generations ignorée:', e);
    }

    // play_stats (user_id)
    try {
      await dbAdmin.from('play_stats').delete().eq('user_id', userId);
    } catch {
      // optionnel
    }

    // 5) Supprimer le profil
    const { error: delProfileErr } = await dbAdmin
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

    // 6) Supprimer l'utilisateur auth local (les FK restaurees conservent leur comportement CASCADE).
    if (!await deleteLocalAuthUser(userId)) {
      console.error('Erreur suppression auth user local');
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

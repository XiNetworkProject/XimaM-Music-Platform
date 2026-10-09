import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { db } from '@/lib/database';
import { notifyForumPostReply } from '@/lib/notifications';
import { attachReplies } from '@/lib/communityPosts';
import { communityText, COMMUNITY_REPLY_LIMIT } from '@/lib/communityValidation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    // Récupérer les réponses du post
    const { data: replies, error } = await db
      .from('forum_replies')
      .select('*')
      .eq('post_id', post_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des réponses:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des réponses' }, { status: 500 });
    }

    const session = await getApiSession(request);
    return NextResponse.json(await attachReplies(replies || [], session?.user?.id), { headers: { 'Cache-Control': 'private, no-store' } });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const post_id = communityText(body?.post_id, 100);
    const content = communityText(body?.content, COMMUNITY_REPLY_LIMIT);

    if (!post_id || !content) {
      return NextResponse.json({ error: 'ID du post et contenu requis' }, { status: 400 });
    }

    // Vérifier si le post existe
    const { data: post, error: postError } = await db
      .from('forum_posts')
      .select('id, user_id, title, is_locked')
      .eq('id', post_id)
      .maybeSingle();

    if (postError) throw postError;
    if (!post) {
      return NextResponse.json({ error: 'Post non trouvé' }, { status: 404 });
    }
    if (post.is_locked) return NextResponse.json({ error: 'Cette discussion est verrouillée.' }, { status: 423 });
    // Read the author before inserting: an enrichment error must not cause duplicate retries.
    const { data: profile, error: profileError } = await db.from('profiles').select('id, name, username, avatar').eq('id', session.user.id).maybeSingle();
    if (profileError) throw profileError;

    // Créer la réponse
    const { data: reply, error } = await db
      .from('forum_replies')
      .insert({
        post_id,
        user_id: session.user.id,
        content: content.trim()
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erreur lors de la création de la réponse:', error);
      return NextResponse.json({ error: 'Erreur lors de la création de la réponse' }, { status: 500 });
    }

    // Combiner la réponse avec le profil
    const replyWithProfile = {
      ...reply,
      profiles: profile || null,
      is_liked: false
    };

    if (post.user_id && post.user_id !== session.user.id) {
      try {
        const replierName = profile?.name || profile?.username || session.user.name || 'Quelqu’un';
        notifyForumPostReply(session.user.id, post.user_id, replierName, post.id, post.title).catch((notificationError) => {
          console.warn('[forum notifications] reply notification failed:', notificationError?.message || notificationError);
        });
      } catch (notificationError: any) {
        console.warn('[forum notifications] reply notification skipped:', notificationError?.message || notificationError);
      }
    }

    return NextResponse.json(replyWithProfile, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

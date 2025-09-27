import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Récupérer les statistiques de la communauté
    const [
      { data: postsCount, error: postsError },
      { data: repliesCount, error: repliesError },
      { data: faqCount, error: faqError },
      { data: usersCount, error: usersError }
    ] = await Promise.all([
      supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
      supabase.from('forum_replies').select('*', { count: 'exact', head: true }),
      supabase.from('faq_items').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
    ]);

    if (postsError || repliesError || faqError || usersError) {
      console.error('Erreur lors de la récupération des statistiques:', { postsError, repliesError, faqError, usersError });
      return NextResponse.json({ error: 'Erreur lors de la récupération des statistiques' }, { status: 500 });
    }

    // Récupérer les posts récents
    const { data: recentPosts, error: recentPostsError } = await supabase
      .from('forum_posts')
      .select(`
        id,
        title,
        category,
        likes_count,
        replies_count,
        created_at,
        profiles:user_id (
          name,
          username
        )
      `)
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentPostsError) {
      console.error('Erreur lors de la récupération des posts récents:', recentPostsError);
    }

    // Récupérer les FAQ populaires
    const { data: popularFAQs, error: popularFAQsError } = await supabase
      .from('faq_items')
      .select('id, question, category, views_count')
      .eq('is_published', true)
      .order('views_count', { ascending: false })
      .limit(4);

    if (popularFAQsError) {
      console.error('Erreur lors de la récupération des FAQ populaires:', popularFAQsError);
    }

    return NextResponse.json({
      stats: {
        postsCount: postsCount || 0,
        repliesCount: repliesCount || 0,
        faqCount: faqCount || 0,
        usersCount: usersCount || 0
      },
      recentPosts: recentPosts || [],
      popularFAQs: popularFAQs || []
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Calculer les statistiques de la communauté
    const [
      resolvedQuestionsResult,
      forumPostsResult,
      implementedSuggestionsResult
    ] = await Promise.all([
      // Questions résolues : posts de catégorie "question" avec replies_count > 0
      supabase
        .from('forum_posts')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'question')
        .gt('replies_count', 0),
      
      // Total des posts du forum
      supabase
        .from('forum_posts')
        .select('id', { count: 'exact', head: true }),
      
      // Suggestions implémentées : posts de catégorie "suggestion" avec likes_count >= 5
      supabase
        .from('forum_posts')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'suggestion')
        .gte('likes_count', 5)
    ]);

    // Vérifier les erreurs
    if (resolvedQuestionsResult.error || forumPostsResult.error || implementedSuggestionsResult.error) {
      console.error('Erreur lors de la récupération des statistiques:', { 
        resolvedQuestionsError: resolvedQuestionsResult.error, 
        forumPostsError: forumPostsResult.error, 
        implementedSuggestionsError: implementedSuggestionsResult.error 
      });
      return NextResponse.json({ error: 'Erreur lors de la récupération des statistiques' }, { status: 500 });
    }

    // Calculer les membres actifs : utilisateurs ayant posté dans les 30 derniers jours
    let activeMembersCount = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from('forum_posts')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .not('user_id', 'is', null);
    
    if (!recentUsersError && recentUsers) {
      const uniqueUsers = new Set(recentUsers.map(post => post.user_id));
      activeMembersCount = uniqueUsers.size;
    }

    return NextResponse.json({
      resolvedQuestions: resolvedQuestionsResult.count || 0,
      forumPosts: forumPostsResult.count || 0,
      activeMembers: activeMembersCount,
      implementedSuggestions: implementedSuggestionsResult.count || 0
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

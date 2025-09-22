import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Test simple : essayer de sélectionner depuis comments
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('comments')
      .select('id')
      .limit(1);

    const commentsExists = !commentsError || commentsError.code !== 'PGRST116';
    
    // Test simple : essayer de sélectionner depuis comment_likes
    const { data: likes, error: likesError } = await supabaseAdmin
      .from('comment_likes')
      .select('id')
      .limit(1);

    const likesExists = !likesError || likesError.code !== 'PGRST116';
    
    return NextResponse.json({
      success: true,
      tablesExist: {
        comments: commentsExists,
        comment_likes: likesExists
      },
      errors: {
        comments: commentsError?.message || null,
        likes: likesError?.message || null
      },
      message: commentsExists && likesExists 
        ? 'Tables commentaires existent' 
        : 'Tables commentaires manquantes - exécutez scripts/fix_comments_schema.sql'
    });

  } catch (error) {
    console.error('Erreur debug comments:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur debug', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

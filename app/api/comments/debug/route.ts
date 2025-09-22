import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Vérifier si les tables existent
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['comments', 'comment_likes']);

    if (tablesError) {
      return NextResponse.json({ 
        error: 'Erreur vérification tables', 
        details: tablesError.message 
      }, { status: 500 });
    }

    const tableNames = tables?.map(t => t.table_name) || [];
    
    return NextResponse.json({
      success: true,
      tablesExist: {
        comments: tableNames.includes('comments'),
        comment_likes: tableNames.includes('comment_likes')
      },
      allTables: tableNames,
      message: 'Vérifiez que les tables comments et comment_likes existent'
    });

  } catch (error) {
    console.error('Erreur debug comments:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur debug', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/creator/filters  -> liste des mots filtrés (par créateur)
// POST /api/creator/filters -> ajoute un mot
// DELETE /api/creator/filters?word=... -> supprime un mot
export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from('creator_comment_filters')
      .select('word')
      .eq('creator_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ filters: [], message: 'Système de filtres non disponible' });
    }

    return NextResponse.json({ filters: (data || []).map((r: any) => r.word).filter(Boolean) });
  } catch {
    return NextResponse.json({ filters: [], message: 'Système de filtres non disponible' });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const word = String(body?.word || '').trim();
  if (!word) return NextResponse.json({ error: 'Mot manquant' }, { status: 400 });
  if (word.length > 64) return NextResponse.json({ error: 'Mot trop long' }, { status: 400 });

  try {
    const { error } = await supabaseAdmin.from('creator_comment_filters').insert({
      creator_id: userId,
      word,
    });
    if (error) return NextResponse.json({ error: 'Impossible d’ajouter le filtre' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Impossible d’ajouter le filtre' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const word = String(searchParams.get('word') || '').trim();
  if (!word) return NextResponse.json({ error: 'Mot manquant' }, { status: 400 });

  try {
    const { error } = await supabaseAdmin
      .from('creator_comment_filters')
      .delete()
      .eq('creator_id', userId)
      .eq('word', word);
    if (error) return NextResponse.json({ error: 'Impossible de supprimer le filtre' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Impossible de supprimer le filtre' }, { status: 400 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('faq_items')
      .select('*')
      .eq('is_published', true)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrer par catégorie
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Recherche dans la question et la réponse
    if (search) {
      query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
    }

    const { data: faqs, error } = await query;

    if (error) {
      console.error('Erreur lors de la récupération des FAQ:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des FAQ' }, { status: 500 });
    }

    // Compter le total pour la pagination
    let countQuery = supabase
      .from('faq_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category);
    }

    if (search) {
      countQuery = countQuery.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      faqs: faqs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { question, answer, category, tags, order_index } = body;

    if (!question || !answer || !category) {
      return NextResponse.json({ error: 'Question, réponse et catégorie requis' }, { status: 400 });
    }

    const validCategories = ['general', 'player', 'upload', 'abonnement', 'ia', 'technique'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
    }

    const { data: faq, error } = await supabase
      .from('faq_items')
      .insert({
        question: question.trim(),
        answer: answer.trim(),
        category,
        tags: tags || [],
        order_index: order_index || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création de la FAQ:', error);
      return NextResponse.json({ error: 'Erreur lors de la création de la FAQ' }, { status: 500 });
    }

    return NextResponse.json(faq, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

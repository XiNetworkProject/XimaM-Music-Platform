import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { db } from '@/lib/database';
import { getAdminGuard } from '@/lib/admin';
import { communityPage, communityText } from '@/lib/communityValidation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim().slice(0, 120).replace(/[(),%_*\\]/g, '');
    const sort = searchParams.get('sort') || 'order';
    const page = communityPage(searchParams.get('page'), 1);
    const limit = communityPage(searchParams.get('limit'), 10, 100);
    const offset = (page - 1) * limit;

    let query = db
      .from('faq_items')
      .select('*')
      .eq('is_published', true);

    // Appliquer le tri selon le paramètre sort
    switch (sort) {
      case 'popular':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'order':
      default:
        query = query.order('order_index', { ascending: true });
        break;
    }

    query = query.range(offset, offset + limit - 1);

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
    let countQuery = db
      .from('faq_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category);
    }

    if (search) {
      countQuery = countQuery.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

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
    const session = await getApiSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const guard = await getAdminGuard();
    if (!guard.ok || guard.userId !== session.user.id) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });

    const body = await request.json().catch(() => null);
    const question = communityText(body?.question, 500);
    const answer = communityText(body?.answer, 20000);
    const { category, tags, order_index } = body || {};

    if (!question || !answer || !category) {
      return NextResponse.json({ error: 'Question, réponse et catégorie requis' }, { status: 400 });
    }

    const validCategories = ['general', 'player', 'upload', 'abonnement', 'ia', 'technique'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
    }
    if (tags != null && (!Array.isArray(tags) || tags.length > 10 || tags.some((tag: unknown) => !communityText(tag, 40)))) return NextResponse.json({ error: 'Mots-clés invalides.' }, { status: 400 });

    const { data: faq, error } = await db
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

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import creatorModeration from '@/lib/creatorModeration';

// GET - Récupérer les filtres personnalisés du créateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const filters = await creatorModeration.getCustomFilters(session.user.id);

    return NextResponse.json({
      success: true,
      filters
    });

  } catch (error) {
    console.error('Erreur récupération filtres:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des filtres' },
      { status: 500 }
    );
  }
}

// POST - Ajouter un filtre personnalisé
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { word } = await request.json();

    if (!word || !word.trim()) {
      return NextResponse.json({ error: 'Mot requis' }, { status: 400 });
    }

    const success = await creatorModeration.addCustomFilter(session.user.id, word.trim());

    if (!success) {
      return NextResponse.json({ error: 'Erreur lors de l\'ajout du filtre' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Filtre ajouté avec succès'
    });

  } catch (error) {
    console.error('Erreur ajout filtre:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du filtre' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un filtre personnalisé
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');

    if (!word) {
      return NextResponse.json({ error: 'Mot requis' }, { status: 400 });
    }

    const success = await creatorModeration.removeCustomFilter(session.user.id, word);

    if (!success) {
      return NextResponse.json({ error: 'Filtre non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Filtre supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression filtre:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du filtre' },
      { status: 500 }
    );
  }
} 
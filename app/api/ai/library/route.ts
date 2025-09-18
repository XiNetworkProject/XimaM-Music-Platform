// app/api/ai/library/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { aiGenerationService } from '@/lib/aiGenerationService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    let generations;
    
    if (search) {
      generations = await aiGenerationService.searchLibrary(session.user.id, search);
    } else {
      generations = await aiGenerationService.getUserLibrary(session.user.id, limit, offset);
    }

    return NextResponse.json({
      generations,
      pagination: {
        limit,
        offset,
        total: generations.length
      }
    });

  } catch (error: any) {
    console.error('Erreur bibliothèque:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

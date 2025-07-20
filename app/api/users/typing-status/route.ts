import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import onlineStatusService from '@/lib/onlineStatusService';

// POST - Mettre à jour le statut de frappe
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { isTyping, conversationId } = await request.json();

    if (typeof isTyping !== 'boolean') {
      return NextResponse.json({ error: 'Statut de frappe invalide' }, { status: 400 });
    }

    const success = await onlineStatusService.setTypingStatus(
      session.user.id,
      isTyping,
      conversationId
    );

    if (!success) {
      return NextResponse.json({ error: 'Erreur mise à jour frappe' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Statut de frappe mis à jour: ${isTyping ? 'en train de taper' : 'arrêté'}`
    });

  } catch (error) {
    console.error('Erreur statut de frappe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut de frappe' },
      { status: 500 }
    );
  }
}

// GET - Obtenir les utilisateurs en train de taper dans une conversation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'ID conversation requis' }, { status: 400 });
    }

    // Pour l'instant, on retourne une liste vide
    // Dans une implémentation complète, on récupérerait les utilisateurs en train de taper
    const typingUsers: string[] = [];

    return NextResponse.json({
      success: true,
      typingUsers
    });

  } catch (error) {
    console.error('Erreur récupération frappe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statuts de frappe' },
      { status: 500 }
    );
  }
} 
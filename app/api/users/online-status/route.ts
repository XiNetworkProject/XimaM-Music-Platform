import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import onlineStatusService from '@/lib/onlineStatusService';

// GET - Obtenir le statut en ligne d'un utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    const status = await onlineStatusService.getUserStatus(userId);

    return NextResponse.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Erreur récupération statut:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}

// POST - Mettre à jour le statut en ligne
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { isOnline, isTyping, typingInConversation, deviceInfo } = await request.json();

    const updates: any = {};
    if (typeof isOnline === 'boolean') updates.isOnline = isOnline;
    if (typeof isTyping === 'boolean') updates.isTyping = isTyping;
    if (typingInConversation) updates.typingInConversation = typingInConversation;
    if (deviceInfo) updates.deviceInfo = deviceInfo;

    const success = await onlineStatusService.updateUserStatus(session.user.id, updates);

    if (!success) {
      return NextResponse.json({ error: 'Erreur mise à jour statut' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Statut mis à jour'
    });

  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut' },
      { status: 500 }
    );
  }
}

// PUT - Marquer comme en ligne
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { deviceInfo } = await request.json();

    const success = await onlineStatusService.setUserOnline(session.user.id, deviceInfo);

    if (!success) {
      return NextResponse.json({ error: 'Erreur mise en ligne' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Utilisateur marqué comme en ligne'
    });

  } catch (error) {
    console.error('Erreur mise en ligne:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise en ligne' },
      { status: 500 }
    );
  }
}

// DELETE - Marquer comme hors ligne
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const success = await onlineStatusService.setUserOffline(session.user.id);

    if (!success) {
      return NextResponse.json({ error: 'Erreur mise hors ligne' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Utilisateur marqué comme hors ligne'
    });

  } catch (error) {
    console.error('Erreur mise hors ligne:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise hors ligne' },
      { status: 500 }
    );
  }
}
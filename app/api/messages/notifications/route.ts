import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET /api/messages/notifications - Server-Sent Events pour les notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const response = new Response(
      new ReadableStream({
        start(controller) {
          // Envoyer un message de connexion
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({
              type: 'connected',
              userId: session.user.id,
              timestamp: new Date().toISOString()
            })}\n\n`)
          );

          // Envoyer un heartbeat toutes les 30 secondes pour maintenir la connexion
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({
                  type: 'heartbeat',
                  timestamp: new Date().toISOString()
                })}\n\n`)
              );
            } catch (error) {
              console.error('Erreur heartbeat SSE:', error);
              clearInterval(heartbeat);
              controller.close();
            }
          }, 30000);

          // Nettoyer à la fermeture
          request.signal.addEventListener('abort', () => {
            clearInterval(heartbeat);
            controller.close();
          });

          // Nettoyer si la connexion est fermée
          request.signal.addEventListener('close', () => {
            clearInterval(heartbeat);
            controller.close();
          });
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control',
          'X-Accel-Buffering': 'no', // Désactiver le buffering pour Vercel
        },
      }
    );

    return response;
  } catch (error) {
    console.error('Erreur route notifications:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/messages/notifications - Envoyer une notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { type, recipientId, conversationId, message } = await request.json();

    // Ici on pourrait envoyer une vraie notification push
    // Pour l'instant, on retourne juste un succès
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur POST notifications:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
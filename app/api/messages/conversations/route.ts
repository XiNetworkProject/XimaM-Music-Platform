import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message'; // <-- Ajouté pour Mongoose populate
import User from '@/models/User'; // <-- Ajouté pour Mongoose populate
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET /api/messages/conversations
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Début récupération conversations');
    
    // Connexion à la base de données
    console.log('📡 Tentative de connexion MongoDB...');
    await dbConnect();
    console.log('✅ Connexion MongoDB établie');
    
    // Vérification de la session
    console.log('🔐 Vérification session utilisateur...');
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log('❌ Session utilisateur non trouvée');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.log('✅ Session utilisateur valide:', session.user.id);

    // Récupération des conversations
    console.log('📋 Récupération des conversations pour l\'utilisateur:', session.user.id);
    const conversations = await Conversation.find({
      participants: session.user.id
    })
      .populate('participants', 'name username avatar')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name username avatar'
        }
      })
      .sort({ updatedAt: -1 })
      .lean();

    console.log('✅ Conversations récupérées:', conversations.length);
    return NextResponse.json({ conversations });
    
  } catch (error) {
    console.error('❌ Erreur récupération conversations:', error);
    
    // Log détaillé de l'erreur
    if (error instanceof Error) {
      console.error('Message d\'erreur:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Vérification du type d'erreur
    if (error instanceof Error && error.message.includes('MongoDB')) {
      return NextResponse.json({ 
        error: 'Erreur de connexion à la base de données',
        details: error.message 
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
} 
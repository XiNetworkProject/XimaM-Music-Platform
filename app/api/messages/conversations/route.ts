import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Client Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Stockage temporaire des conversations avec la structure MongoDB exacte
let tempConversations: any[] = [];

// Fonction pour créer des conversations de test avec la structure MongoDB
function createTestConversations(userId: string) {
  if (tempConversations.length === 0) {
    tempConversations = [
      {
        _id: 'conv-1',
        name: 'John Doe',
        type: 'direct',
        participants: [
          {
            _id: userId,
            username: 'moi',
            name: 'Moi',
            avatar: '/default-avatar.png',
            bio: null
          },
          {
            _id: 'user-1',
            username: 'johndoe',
            name: 'John Doe',
            avatar: '/default-avatar.png',
            bio: 'Développeur passionné'
          }
        ],
        lastMessage: {
          _id: 'msg-1',
          content: 'Salut ! Comment ça va ?',
          type: 'text',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          senderId: 'user-1'
        },
        unreadCount: 1,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        lastMessageAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        _id: 'conv-2',
        name: 'Équipe Dev',
        type: 'group',
        participants: [
          {
            _id: userId,
            username: 'moi',
            name: 'Moi',
            avatar: '/default-avatar.png',
            bio: null
          },
          {
            _id: 'user-2',
            username: 'alice',
            name: 'Alice Martin',
            avatar: '/default-avatar.png',
            bio: 'Designer UX'
          },
          {
            _id: 'user-3',
            username: 'bob',
            name: 'Bob Wilson',
            avatar: '/default-avatar.png',
            bio: 'DevOps Engineer'
          }
        ],
        lastMessage: {
          _id: 'msg-2',
          content: 'Réunion demain à 14h !',
          type: 'text',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          senderId: 'user-2'
        },
        unreadCount: 0,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        lastMessageAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];
  }
}

// Fonction pour vérifier si les tables Supabase existent
async function checkSupabaseTables() {
  try {
    // Test simple pour voir si la table conversations existe
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Tables Supabase non trouvées:', error.message);
      return false;
    }
    
    console.log('✅ Tables Supabase trouvées, données disponibles:', data?.length || 0);
    return true;
  } catch (error) {
    console.log('❌ Erreur lors de la vérification Supabase:', error);
    return false;
  }
}

// GET - Récupérer les conversations d'un utilisateur
export async function GET(request: NextRequest) {
  try {
    // Récupérer l'ID utilisateur depuis les paramètres de requête
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    console.log('💬 Récupération des conversations pour user:', userId);

    // Vérifier d'abord si les tables Supabase existent
    const supabaseAvailable = await checkSupabaseTables();
    
    if (supabaseAvailable) {
      console.log('🔄 Tentative de récupération depuis Supabase...');
      
      try {
        // 🚫 MESSAGERIE EN MAINTENANCE - INDISPONIBLE POUR UNE DURÉE INDÉTERMINÉE
        console.log('🚫 Messagerie en maintenance - indisponible');
        
        // Retourner un message de maintenance
        return NextResponse.json({ 
          error: 'MAINTENANCE',
          message: 'La messagerie est actuellement en maintenance pour une durée indéterminée.',
          maintenance: true,
          conversations: [],
          total: 0,
          source: 'maintenance'
        });

        // Cette partie n'est plus nécessaire car on retourne directement la maintenance
        console.log('✅ Maintenance activée - messagerie indisponible');

      } catch (supabaseError) {
        console.log('⚠️ Erreur Supabase, basculement vers données de test:', supabaseError);
        // Continue vers les données de test
      }
    }

    // Si Supabase n'est pas disponible ou en erreur, utiliser les données de test
    console.log('🔄 Utilisation des données de test MongoDB...');
    
    // Créer des conversations de test avec la structure MongoDB
    createTestConversations(userId);
    
    // Filtrer les conversations de l'utilisateur
    const userConversations = tempConversations.filter(conv => 
      conv.participants.some((p: any) => p._id === userId)
    );

    console.log('✅ Conversations MongoDB trouvées:', userConversations.length);

    return NextResponse.json({ 
      conversations: userConversations,
      total: userConversations.length,
      source: 'test-data'
    });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// POST - Créer une nouvelle conversation
export async function POST(request: NextRequest) {
  try {
    const { participantIds, type = 'direct', name } = await request.json();
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'IDs des participants requis' }, { status: 400 });
    }

    const userId = 'default-user-id'; // À remplacer par l'ID de l'utilisateur connecté
    
    console.log('💬 Création de conversation MongoDB:', { participantIds, type, name, userId });

    // Créer une conversation avec la structure MongoDB
    const newConversation = {
      _id: `conv-${Date.now()}`,
      name: name || `Conversation ${Date.now()}`,
      type: type,
      participants: [
        {
          _id: userId,
          username: 'moi',
          name: 'Moi',
          avatar: '/default-avatar.png',
          bio: null
        },
        ...participantIds.map((id: string) => ({
          _id: id,
          username: `user-${id}`,
          name: `Utilisateur ${id}`,
          avatar: '/default-avatar.png',
          bio: null
        }))
      ],
      lastMessage: null,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    // Ajouter à la liste temporaire
    tempConversations.push(newConversation);
    
    console.log('✅ Conversation MongoDB créée:', newConversation._id);

    return NextResponse.json(newConversation, { status: 201 });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes !');
  console.error('Vérifiez votre fichier .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 Début de la migration des tables de messagerie vers Supabase...');

async function createTables() {
  try {
    console.log('📋 Création des tables...');
    
    // 1. Table conversations
    const { error: conversationsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255),
          type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
          created_by UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true
        );
      `
    });
    
    if (conversationsError) {
      console.log('⚠️ Table conversations déjà existante ou erreur:', conversationsError.message);
    } else {
      console.log('✅ Table conversations créée');
    }

    // 2. Table conversation_participants
    const { error: participantsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversation_participants (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_admin BOOLEAN DEFAULT false,
          UNIQUE(conversation_id, user_id)
        );
      `
    });
    
    if (participantsError) {
      console.log('⚠️ Table conversation_participants déjà existante ou erreur:', participantsError.message);
    } else {
      console.log('✅ Table conversation_participants créée');
    }

    // 3. Table messages
    const { error: messagesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL,
          content TEXT NOT NULL,
          message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'file')),
          media_url TEXT,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (messagesError) {
      console.log('⚠️ Table messages déjà existante ou erreur:', messagesError.message);
    } else {
      console.log('✅ Table messages créée');
    }

    // 4. Table message_reads
    const { error: readsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS message_reads (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(message_id, user_id)
        );
      `
    });
    
    if (readsError) {
      console.log('⚠️ Table message_reads déjà existante ou erreur:', readsError.message);
    } else {
      console.log('✅ Table message_reads créée');
    }

    console.log('🎯 Toutes les tables ont été créées !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des tables:', error);
  }
}

async function insertTestData() {
  try {
    console.log('🧪 Insertion des données de test...');
    
    // Vérifier si des données existent déjà
    const { data: existingConversations } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (existingConversations && existingConversations.length > 0) {
      console.log('⚠️ Des conversations existent déjà, pas d\'insertion de données de test');
      return;
    }

    // 1. Créer une conversation de test
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        name: 'Conversation de test',
        type: 'direct',
        created_by: 'f64a1b7a-c261-4ad5-955b-c0ad06a1d0bb' // ID de l'utilisateur connecté
      })
      .select()
      .single();

    if (convError) {
      console.error('❌ Erreur création conversation:', convError);
      return;
    }

    console.log('✅ Conversation de test créée:', conversation.id);

    // 2. Ajouter des participants
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert([
        {
          conversation_id: conversation.id,
          user_id: 'f64a1b7a-c261-4ad5-955b-c0ad06a1d0bb',
          is_admin: true
        },
        {
          conversation_id: conversation.id,
          user_id: 'test-user-1',
          is_admin: false
        }
      ]);

    if (participantsError) {
      console.error('❌ Erreur ajout participants:', participantsError);
      return;
    }

    console.log('✅ Participants ajoutés');

    // 3. Ajouter un message de test
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: 'test-user-1',
        content: 'Salut ! Ceci est un message de test.',
        message_type: 'text'
      });

    if (messageError) {
      console.error('❌ Erreur création message:', messageError);
      return;
    }

    console.log('✅ Message de test créé');
    console.log('🎉 Données de test insérées avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données de test:', error);
  }
}

async function main() {
  try {
    await createTables();
    await insertTestData();
    
    console.log('🎯 Migration terminée !');
    console.log('📱 Testez maintenant votre page de messagerie');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  }
}

main();

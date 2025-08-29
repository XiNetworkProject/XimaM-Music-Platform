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

console.log('🔍 Vérification du contenu des tables Supabase de messagerie...');

async function checkTables() {
  try {
    // 1. Vérifier la table conversations
    console.log('\n📋 Table conversations:');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*');
    
    if (convError) {
      console.error('❌ Erreur conversations:', convError.message);
    } else {
      console.log(`✅ ${conversations?.length || 0} conversations trouvées`);
      if (conversations && conversations.length > 0) {
        conversations.forEach(conv => {
          console.log(`   - ID: ${conv.id}, Nom: ${conv.name}, Type: ${conv.type}, Créé par: ${conv.created_by}`);
        });
      }
    }

    // 2. Vérifier la table conversation_participants
    console.log('\n👥 Table conversation_participants:');
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('*');
    
    if (partError) {
      console.error('❌ Erreur participants:', partError.message);
    } else {
      console.log(`✅ ${participants?.length || 0} participants trouvés`);
      if (participants && participants.length > 0) {
        participants.forEach(part => {
          console.log(`   - Conversation: ${part.conversation_id}, Utilisateur: ${part.user_id}, Admin: ${part.is_admin}`);
        });
      }
    }

    // 3. Vérifier la table messages
    console.log('\n💬 Table messages:');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*');
    
    if (msgError) {
      console.error('❌ Erreur messages:', msgError.message);
    } else {
      console.log(`✅ ${messages?.length || 0} messages trouvés`);
      if (messages && messages.length > 0) {
        messages.forEach(msg => {
          console.log(`   - Conversation: ${msg.conversation_id}, Expéditeur: ${msg.sender_id}, Contenu: ${msg.content.substring(0, 50)}...`);
        });
      }
    }

    // 4. Vérifier la table message_reads
    console.log('\n👁️ Table message_reads:');
    const { data: reads, error: readError } = await supabase
      .from('message_reads')
      .select('*');
    
    if (readError) {
      console.error('❌ Erreur reads:', readError.message);
    } else {
      console.log(`✅ ${reads?.length || 0} lectures trouvées`);
    }

    // 5. Test de requête complexe (comme dans l'API)
    console.log('\n🔍 Test de requête complexe (comme dans l\'API):');
    const { data: complexData, error: complexError } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user_id,
          profiles!conversation_participants_user_id_fkey(
            id,
            username,
            name,
            avatar,
            bio
          )
        ),
        last_message:messages(
          id,
          content,
          message_type,
          created_at,
          sender_id
        )
      `)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false });

    if (complexError) {
      console.error('❌ Erreur requête complexe:', complexError.message);
    } else {
      console.log(`✅ Requête complexe réussie: ${complexData?.length || 0} conversations`);
      if (complexData && complexData.length > 0) {
        console.log('   Première conversation:', JSON.stringify(complexData[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkTables();

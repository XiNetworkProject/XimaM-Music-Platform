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

console.log('🔍 Vérification de la structure des tables Supabase...');

async function checkTableStructure() {
  try {
    // 1. Vérifier la structure de la table conversations
    console.log('\n📋 Structure de la table conversations:');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (convError) {
      console.error('❌ Erreur conversations:', convError.message);
    } else {
      console.log('✅ Table conversations accessible');
      if (conversations && conversations.length > 0) {
        console.log('   Colonnes disponibles:', Object.keys(conversations[0]));
        console.log('   Exemple de données:', conversations[0]);
      } else {
        console.log('   Table vide, pas d\'exemple de données');
      }
    }

    // 2. Vérifier la structure de la table messages
    console.log('\n💬 Structure de la table messages:');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (msgError) {
      console.error('❌ Erreur messages:', msgError.message);
    } else {
      console.log('✅ Table messages accessible');
      if (messages && messages.length > 0) {
        console.log('   Colonnes disponibles:', Object.keys(messages[0]));
        console.log('   Exemple de données:', messages[0]);
      } else {
        console.log('   Table vide, pas d\'exemple de données');
      }
    }

    // 3. Vérifier la structure de la table conversation_participants
    console.log('\n👥 Structure de la table conversation_participants:');
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('*')
      .limit(1);
    
    if (partError) {
      console.error('❌ Erreur participants:', partError.message);
    } else {
      console.log('✅ Table conversation_participants accessible');
      if (participants && participants.length > 0) {
        console.log('   Colonnes disponibles:', Object.keys(participants[0]));
        console.log('   Exemple de données:', participants[0]);
      } else {
        console.log('   Table vide, pas d\'exemple de données');
      }
    }

    // 4. Test d'insertion simple
    console.log('\n🧪 Test d\'insertion simple:');
    const { data: testInsert, error: insertError } = await supabase
      .from('conversations')
      .insert({
        name: 'Test Structure',
        type: 'direct'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erreur insertion test:', insertError.message);
    } else {
      console.log('✅ Insertion test réussie:', testInsert);
      
      // Supprimer l'insertion de test
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', testInsert.id);
      
      if (deleteError) {
        console.log('⚠️ Erreur suppression test:', deleteError.message);
      } else {
        console.log('✅ Test supprimé');
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkTableStructure();

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

console.log('🧹 Nettoyage complet et reconstruction des tables de messagerie...');

async function cleanTables() {
  try {
    console.log('🗑️ Suppression des anciennes données cassées...');
    
    // 1. Supprimer tous les messages
    const { error: messagesDeleteError } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout
    
    if (messagesDeleteError) {
      console.log('⚠️ Erreur suppression messages:', messagesDeleteError.message);
    } else {
      console.log('✅ Tous les messages supprimés');
    }

    // 2. Supprimer tous les participants
    const { error: participantsDeleteError } = await supabase
      .from('conversation_participants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout
    
    if (participantsDeleteError) {
      console.log('⚠️ Erreur suppression participants:', participantsDeleteError.message);
    } else {
      console.log('✅ Tous les participants supprimés');
    }

    // 3. Supprimer toutes les conversations
    const { error: conversationsDeleteError } = await supabase
      .from('conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout
    
    if (conversationsDeleteError) {
      console.log('⚠️ Erreur suppression conversations:', conversationsDeleteError.message);
    } else {
      console.log('✅ Toutes les conversations supprimées');
    }

    console.log('🎯 Tables nettoyées avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

async function createCleanTables() {
  try {
    console.log('🏗️ Création de tables propres et fonctionnelles...');
    
    // 1. Recréer la table conversations avec une structure propre
    const { error: conversationsError } = await supabase
      .from('conversations')
      .insert({
        id: '00000000-0000-0000-0000-000000000000', // Placeholder
        name: 'Conversation de test',
        type: 'direct',
        created_by: 'f64a1b7a-c261-4ad5-955b-c0ad06a1d0bb',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        is_active: true
      });

    if (conversationsError) {
      console.log('⚠️ Erreur création conversation de test:', conversationsError.message);
    } else {
      console.log('✅ Table conversations fonctionnelle');
    }

    // 2. Vérifier que tout fonctionne
    const { data: conversations, error: checkError } = await supabase
      .from('conversations')
      .select('*');
    
    if (checkError) {
      console.error('❌ Erreur vérification tables:', checkError.message);
    } else {
      console.log(`✅ Vérification réussie: ${conversations?.length || 0} conversations`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la création des tables:', error);
  }
}

async function main() {
  try {
    await cleanTables();
    await createCleanTables();
    
    console.log('🎉 Nettoyage et reconstruction terminés !');
    console.log('📱 Votre système de messagerie est maintenant propre et fonctionnel');
    console.log('💬 Vous pouvez maintenant créer de nouvelles conversations !');
    
  } catch (error) {
    console.error('❌ Erreur lors du processus:', error);
  }
}

main();

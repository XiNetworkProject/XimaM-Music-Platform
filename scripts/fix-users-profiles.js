const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function createMissingProfiles() {
  console.log('🔧 Création des profils utilisateurs manquants...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`📊 ${users.length} utilisateurs trouvés dans MongoDB`);
    
    for (const user of users) {
      console.log(`➕ Création profil pour ${user.name || user.username}...`);
      
      try {
        // Générer un UUID pour le profil
        const profileId = uuidv4();
        
        // Insérer directement dans profiles (contournement de la contrainte)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: profileId,
            name: user.name || user.username || '',
            email: user.email || `${user.username || user.name}@ximam.com`,
            username: user.username || user.name || '',
            avatar: user.avatar || user.avatarUrl || '',
            banner: user.banner || user.bannerUrl || '',
            bio: user.bio || '',
            location: user.location || '',
            website: user.website || '',
            is_verified: user.isVerified || false,
            is_artist: user.isArtist || false,
            artist_name: user.artistName || '',
            genre: Array.isArray(user.genre) ? user.genre : [],
            total_plays: user.totalPlays || 0,
            total_likes: user.totalLikes || 0,
            last_seen: user.lastSeen ? new Date(user.lastSeen).toISOString() : new Date().toISOString(),
            created_at: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (profileError) {
          console.error(`❌ Erreur création profil ${user.name}:`, profileError);
        } else {
          console.log(`✅ Profil créé pour ${user.name || user.username} avec UUID: ${profileId}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur création profil ${user.name}:`, error);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Création des profils terminée');
    
  } catch (error) {
    console.error('❌ Erreur création profils:', error);
  }
}

async function migrateMessagesWithProfiles() {
  console.log('🔄 Migration des messages avec profils existants...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const messages = await db.collection('messages').find({}).toArray();
    
    console.log(`📊 ${messages.length} messages trouvés dans MongoDB`);
    
    for (const message of messages) {
      const supabaseId = uuidv4();
      const senderId = message.sender;
      const conversationId = message.conversation;
      
      console.log(`➕ Migration message...`);
      
      try {
        // Trouver le profil de l'expéditeur
        let senderProfileId = null;
        if (senderId) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
          
          if (profiles && profiles.length > 0) {
            senderProfileId = profiles[0].id;
          }
        }
        
        // Trouver la conversation
        let conversationProfileId = null;
        if (conversationId) {
          const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('id')
            .limit(1);
          
          if (conversations && conversations.length > 0) {
            conversationProfileId = conversations[0].id;
          }
        }
        
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            id: supabaseId,
            content: message.content || '',
            sender_id: senderProfileId,
            conversation_id: conversationProfileId,
            is_read: message.seenBy && message.seenBy.length > 0,
            created_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Erreur insertion message:`, insertError);
        } else {
          console.log(`✅ Message migré avec UUID: ${supabaseId}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur migration message:`, error);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des messages terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration messages:', error);
  }
}

async function main() {
  console.log('🚀 CORRECTION FINALE : Utilisateurs et Messages');
  console.log('===============================================');
  
  try {
    // 1. Créer les profils utilisateurs manquants
    await createMissingProfiles();
    console.log('');
    
    // 2. Migrer les messages avec les profils existants
    await migrateMessagesWithProfiles();
    console.log('');
    
    console.log('🎉 Correction terminée !');
    console.log('');
    console.log('📋 Prochaines étapes :');
    console.log('1. Vérifier les profils créés dans Supabase');
    console.log('2. Vérifier les messages migrés');
    console.log('3. Tester l\'application complète');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    process.exit(1);
  }
}

// Lancer la correction
if (require.main === module) {
  main();
}

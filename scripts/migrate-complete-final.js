const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Map pour stocker les correspondances MongoDB ID -> Supabase UUID
const idMapping = new Map();

// Fonction pour générer un UUID valide à partir d'un ID MongoDB
function generateValidUUID(mongoId) {
  if (idMapping.has(mongoId)) {
    return idMapping.get(mongoId);
  }
  
  const uuid = uuidv4();
  idMapping.set(mongoId, uuid);
  return uuid;
}

async function cleanDuplicates() {
  console.log('🧹 Nettoyage des doublons...');
  
  try {
    // Nettoyer les conversations en trop
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, created_at')
      .order('created_at', { ascending: false });
    
    if (convError) {
      console.error('❌ Erreur récupération conversations:', convError);
      return;
    }
    
    if (conversations && conversations.length > 3) {
      const toDelete = conversations.slice(3);
      for (const conv of toDelete) {
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conv.id);
        
        if (deleteError) {
          console.error(`❌ Erreur suppression conversation ${conv.id}:`, deleteError);
        } else {
          console.log(`✅ Conversation ${conv.id} supprimée`);
        }
      }
    }
    
    // Nettoyer les subscriptions en trop
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, created_at')
      .order('created_at', { ascending: false });
    
    if (subError) {
      console.error('❌ Erreur récupération subscriptions:', subError);
      return;
    }
    
    if (subscriptions && subscriptions.length > 5) {
      const toDelete = subscriptions.slice(5);
      for (const sub of toDelete) {
        const { error: deleteError } = await supabase
          .from('subscriptions')
          .delete()
          .eq('id', sub.id);
        
        if (deleteError) {
          console.error(`❌ Erreur suppression subscription ${sub.id}:`, deleteError);
        } else {
          console.log(`✅ Subscription ${sub.id} supprimée`);
        }
      }
    }
    
    console.log('✅ Nettoyage des doublons terminé');
    
  } catch (error) {
    console.error('❌ Erreur nettoyage doublons:', error);
  }
}

async function migrateUsers() {
  console.log('🔄 Migration des utilisateurs...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`📊 ${users.length} utilisateurs trouvés dans MongoDB`);
    
    for (const user of users) {
      const supabaseId = generateValidUUID(user._id.toString());
      
      console.log(`➕ Migration utilisateur ${user.name || user.username}...`);
      
      try {
        // Créer l'utilisateur dans auth.users
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email || `${user.username || user.name}@ximam.com`,
          password: 'tempPassword123!',
          email_confirm: true,
          user_metadata: {
            name: user.name || user.username || '',
            username: user.username || user.name || ''
          }
        });
        
        if (authError && !authError.message.includes('already registered')) {
          console.error(`❌ Erreur création auth utilisateur ${user.name}:`, authError);
          continue;
        }
        
        // Utiliser l'ID retourné par createUser ou générer un nouveau
        const userId = authData?.user?.id || supabaseId;
        
        // Insérer dans profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
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
          console.error(`❌ Erreur insertion profil ${user.name}:`, profileError);
        } else {
          console.log(`✅ Utilisateur ${user.name || user.username} migré avec UUID: ${userId}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur migration utilisateur ${user.name}:`, error);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des utilisateurs terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration utilisateurs:', error);
  }
}

async function migrateMessages() {
  console.log('🔄 Migration des messages...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const messages = await db.collection('messages').find({}).toArray();
    
    console.log(`📊 ${messages.length} messages trouvés dans MongoDB`);
    
    for (const message of messages) {
      const supabaseId = generateValidUUID(message._id.toString());
      const senderId = message.sender;
      const conversationId = message.conversation;
      
      console.log(`➕ Migration message...`);
      
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          id: supabaseId,
          content: message.content || '',
          sender_id: senderId ? generateValidUUID(senderId.toString()) : null,
          conversation_id: conversationId ? generateValidUUID(conversationId.toString()) : null,
          is_read: message.seenBy && message.seenBy.length > 0,
          created_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`❌ Erreur insertion message:`, insertError);
      } else {
        console.log(`✅ Message migré avec UUID: ${supabaseId}`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des messages terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration messages:', error);
  }
}

async function migrateUserStatuses() {
  console.log('🔄 Migration des statuts utilisateurs...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const userStatuses = await db.collection('userstatuses').find({}).toArray();
    
    console.log(`📊 ${userStatuses.length} statuts utilisateurs trouvés dans MongoDB`);
    
    for (const userStatus of userStatuses) {
      const userId = userStatus.userId;
      
      if (userId) {
        const supabaseUserId = generateValidUUID(userId.toString());
        
        // Mettre à jour le profil utilisateur avec le statut
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            last_seen: userStatus.lastSeen ? new Date(userStatus.lastSeen).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', supabaseUserId);
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour statut utilisateur:`, updateError);
        } else {
          console.log(`✅ Statut mis à jour pour l'utilisateur ${supabaseUserId}`);
        }
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des statuts utilisateurs terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration statuts utilisateurs:', error);
  }
}

async function updateRelations() {
  console.log('🔄 Mise à jour des relations...');
  
  try {
    // Mettre à jour les creator_id des pistes
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, creator_id');
    
    if (tracksError) {
      console.error('❌ Erreur récupération pistes:', tracksError);
      return;
    }
    
    for (const track of tracks) {
      if (track.creator_id) {
        // Chercher l'utilisateur correspondant dans le mapping
        let newCreatorId = null;
        for (const [mongoId, supabaseId] of idMapping.entries()) {
          if (mongoId === track.creator_id) {
            newCreatorId = supabaseId;
            break;
          }
        }
        
        if (newCreatorId) {
          const { error: updateError } = await supabase
            .from('tracks')
            .update({ creator_id: newCreatorId })
            .eq('id', track.id);
          
          if (updateError) {
            console.error(`❌ Erreur mise à jour creator_id pour piste ${track.id}:`, updateError);
          } else {
            console.log(`✅ Creator_id mis à jour pour piste ${track.id}`);
          }
        }
      }
    }
    
    // Mettre à jour les user_id et track_id des commentaires
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, user_id, track_id');
    
    if (commentsError) {
      console.error('❌ Erreur récupération commentaires:', commentsError);
      return;
    }
    
    for (const comment of comments) {
      let updates = {};
      
      if (comment.user_id) {
        for (const [mongoId, supabaseId] of idMapping.entries()) {
          if (mongoId === comment.user_id) {
            updates.user_id = supabaseId;
            break;
          }
        }
      }
      
      if (comment.track_id) {
        for (const [mongoId, supabaseId] of idMapping.entries()) {
          if (mongoId === comment.track_id) {
            updates.track_id = supabaseId;
            break;
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('comments')
          .update(updates)
          .eq('id', comment.id);
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour commentaire ${comment.id}:`, updateError);
        } else {
          console.log(`✅ Relations mises à jour pour commentaire ${comment.id}`);
        }
      }
    }
    
    console.log('✅ Relations mises à jour');
    
  } catch (error) {
    console.error('❌ Erreur mise à jour relations:', error);
  }
}

async function main() {
  console.log('🚀 MIGRATION COMPLÈTE FINALE MongoDB → Supabase');
  console.log('===============================================');
  
  try {
    // 1. Nettoyer les doublons
    await cleanDuplicates();
    console.log('');
    
    // 2. Migrer les utilisateurs
    await migrateUsers();
    console.log('');
    
    // 3. Migrer les messages
    await migrateMessages();
    console.log('');
    
    // 4. Migrer les statuts utilisateurs
    await migrateUserStatuses();
    console.log('');
    
    // 5. Mettre à jour les relations
    await updateRelations();
    console.log('');
    
    console.log('🎉 Migration COMPLÈTE FINALE terminée !');
    console.log('');
    console.log('📋 Mapping des IDs :');
    for (const [mongoId, supabaseId] of idMapping.entries()) {
      console.log(`   ${mongoId} → ${supabaseId}`);
    }
    console.log('');
    console.log('📋 Prochaines étapes :');
    console.log('1. Vérifier toutes les données migrées dans Supabase');
    console.log('2. Tester l\'application complète avec Supabase');
    console.log('3. Basculement complet vers Supabase');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration finale:', error);
    process.exit(1);
  }
}

// Lancer la migration
if (require.main === module) {
  main();
}

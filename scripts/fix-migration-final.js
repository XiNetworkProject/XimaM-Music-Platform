const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Map pour stocker les correspondances MongoDB ID -> Supabase UUID
const idMapping = new Map();

async function getExistingUsersAndCreateProfiles() {
  console.log('🔍 Récupération des utilisateurs existants dans Supabase Auth...');
  
  try {
    // 1. Récupérer tous les utilisateurs existants dans Supabase Auth
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erreur récupération utilisateurs Supabase:', listError);
      return;
    }
    
    console.log(`📊 ${existingUsers.users.length} utilisateurs trouvés dans Supabase Auth`);
    
    // 2. Récupérer les utilisateurs MongoDB
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const mongoUsers = await db.collection('users').find({}).toArray();
    
    console.log(`📊 ${mongoUsers.length} utilisateurs trouvés dans MongoDB`);
    
    // 3. Faire correspondre les utilisateurs par email
    for (const mongoUser of mongoUsers) {
      const userEmail = mongoUser.email || `${mongoUser.username || mongoUser.name}@ximam.com`;
      
      // Chercher l'utilisateur correspondant dans Supabase Auth
      const existingUser = existingUsers.users.find(u => u.email === userEmail);
      
      if (existingUser) {
        // Stocker la correspondance MongoDB ID -> Supabase ID
        idMapping.set(mongoUser._id.toString(), existingUser.id);
        console.log(`✅ Correspondance trouvée: ${mongoUser.name} → ${existingUser.id}`);
        
        // Créer le profil dans la table profiles
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: existingUser.id,
              name: mongoUser.name || mongoUser.username || '',
              email: userEmail,
              username: mongoUser.username || mongoUser.name || '',
              avatar: mongoUser.avatar || mongoUser.avatarUrl || '',
              banner: mongoUser.banner || mongoUser.bannerUrl || '',
              bio: mongoUser.bio || '',
              location: mongoUser.location || '',
              website: mongoUser.website || '',
              is_verified: mongoUser.isVerified || false,
              is_artist: mongoUser.isArtist || false,
              artist_name: mongoUser.artistName || '',
              genre: Array.isArray(mongoUser.genre) ? mongoUser.genre : [],
              total_plays: mongoUser.totalPlays || 0,
              total_likes: mongoUser.totalLikes || 0,
              last_seen: mongoUser.lastSeen ? new Date(mongoUser.lastSeen).toISOString() : new Date().toISOString(),
              created_at: mongoUser.createdAt ? new Date(mongoUser.createdAt).toISOString() : new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            if (profileError.code === '23505') { // Duplicate key
              console.log(`⏭️ Profil déjà existant pour ${mongoUser.name}`);
            } else {
              console.error(`❌ Erreur création profil ${mongoUser.name}:`, profileError);
            }
          } else {
            console.log(`✅ Profil créé pour ${mongoUser.name || mongoUser.username}`);
          }
          
        } catch (error) {
          console.error(`❌ Erreur création profil ${mongoUser.name}:`, error);
        }
      } else {
        console.log(`⚠️ Aucun utilisateur Supabase trouvé pour ${mongoUser.name} (${userEmail})`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Récupération des utilisateurs et création des profils terminée');
    
  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs:', error);
  }
}

async function updateAllRelationsWithCorrectIds() {
  console.log('🔗 Mise à jour de toutes les relations avec les bons IDs...');
  
  try {
    // 1. Mettre à jour les creator_id des pistes
    console.log('   📝 Mise à jour des creator_id des pistes...');
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, creator_id');
    
    if (tracksError) {
      console.error('❌ Erreur récupération pistes:', tracksError);
    } else {
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
              console.log(`   ✅ Creator_id mis à jour pour piste ${track.id}: ${track.creator_id} → ${newCreatorId}`);
            }
          } else {
            console.log(`   ⚠️ Pas de correspondance trouvée pour creator_id: ${track.creator_id}`);
          }
        }
      }
    }
    
    // 2. Mettre à jour les user_id et track_id des commentaires
    console.log('   💬 Mise à jour des relations des commentaires...');
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, user_id, track_id');
    
    if (commentsError) {
      console.error('❌ Erreur récupération commentaires:', commentsError);
    } else {
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
            console.log(`   ✅ Relations mises à jour pour commentaire ${comment.id}:`, updates);
          }
        }
      }
    }
    
    // 3. Mettre à jour les sender_id des messages
    console.log('   💬 Mise à jour des sender_id des messages...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id');
    
    if (messagesError) {
      console.error('❌ Erreur récupération messages:', messagesError);
    } else {
      for (const message of messages) {
        if (message.sender_id) {
          // Chercher l'utilisateur correspondant dans le mapping
          let newSenderId = null;
          for (const [mongoId, supabaseId] of idMapping.entries()) {
            if (mongoId === message.sender_id) {
              newSenderId = supabaseId;
              break;
            }
          }
          
          if (newSenderId) {
            const { error: updateError } = await supabase
              .from('messages')
              .update({ sender_id: newSenderId })
              .eq('id', message.id);
            
            if (updateError) {
              console.error(`❌ Erreur mise à jour sender_id pour message ${message.id}:`, updateError);
            } else {
              console.log(`   ✅ Sender_id mis à jour pour message ${message.id}: ${message.sender_id} → ${newSenderId}`);
            }
          } else {
            console.log(`   ⚠️ Pas de correspondance trouvée pour sender_id: ${message.sender_id}`);
          }
        }
      }
    }
    
    console.log('✅ Toutes les relations mises à jour avec les bons IDs');
    
  } catch (error) {
    console.error('❌ Erreur mise à jour relations:', error);
  }
}

async function createFinalReport() {
  console.log('📊 Création du rapport final de migration...');
  
  try {
    console.log('📋 RAPPORT FINAL DE MIGRATION');
    console.log('==============================');
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
    console.log(`🎯 Type: MIGRATION_COMPLÈTE_CORRIGÉE`);
    console.log(`👥 Utilisateurs migrés: ${idMapping.size}`);
    console.log('');
    console.log('📋 Mapping des IDs MongoDB → Supabase:');
    for (const [mongoId, supabaseId] of idMapping.entries()) {
      console.log(`   ${mongoId} → ${supabaseId}`);
    }
    console.log('');
    console.log('✅ MIGRATION COMPLÈTE CORRIGÉE !');
    console.log('================================');
    console.log('');
    console.log('📋 Prochaines étapes :');
    console.log('1. Vérifier les profils créés: npm run compare:migration');
    console.log('2. Tester l\'authentification avec les mots de passe existants');
    console.log('3. Vérifier toutes les relations');
    console.log('4. Basculement complet vers Supabase');
    
  } catch (error) {
    console.error('❌ Erreur création rapport:', error);
  }
}

async function main() {
  console.log('🔧 CORRECTION FINALE DE LA MIGRATION');
  console.log('=====================================');
  console.log('🎯 Objectif: Récupérer les IDs existants et créer les profils');
  console.log('');
  
  try {
    // 1. Récupérer les utilisateurs existants et créer les profils
    await getExistingUsersAndCreateProfiles();
    console.log('');
    
    // 2. Mettre à jour toutes les relations avec les bons IDs
    await updateAllRelationsWithCorrectIds();
    console.log('');
    
    // 3. Créer le rapport final
    await createFinalReport();
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    process.exit(1);
  }
}

// Lancer la correction
if (require.main === module) {
  main();
}

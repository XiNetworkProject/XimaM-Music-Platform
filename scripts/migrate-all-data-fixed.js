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
  
  // Générer un UUID valide et le stocker
  const uuid = uuidv4();
  idMapping.set(mongoId, uuid);
  return uuid;
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
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: supabaseId,
          name: user.name || user.username || '',
          email: user.email || '',
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
      
      if (insertError) {
        console.error(`❌ Erreur insertion utilisateur ${user.name}:`, insertError);
      } else {
        console.log(`✅ Utilisateur ${user.name || user.username} migré avec UUID: ${supabaseId}`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des utilisateurs terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration utilisateurs:', error);
  }
}

async function migrateConversations() {
  console.log('🔄 Migration des conversations...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const conversations = await db.collection('conversations').find({}).toArray();
    
    console.log(`📊 ${conversations.length} conversations trouvées dans MongoDB`);
    
    for (const conversation of conversations) {
      const supabaseId = generateValidUUID(conversation._id.toString());
      
      console.log(`➕ Migration conversation...`);
      
      const { error: insertError } = await supabase
        .from('conversations')
        .insert({
          id: supabaseId,
          name: conversation.name || '',
          is_group: conversation.isGroup || false,
          created_at: conversation.createdAt ? new Date(conversation.createdAt).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`❌ Erreur insertion conversation:`, insertError);
      } else {
        console.log(`✅ Conversation migrée avec UUID: ${supabaseId}`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des conversations terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration conversations:', error);
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
      const senderId = message.sender || message.senderId;
      const conversationId = message.conversation || message.conversationId;
      
      console.log(`➕ Migration message...`);
      
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          id: supabaseId,
          content: message.content || '',
          sender_id: senderId ? generateValidUUID(senderId.toString()) : null,
          conversation_id: conversationId ? generateValidUUID(conversationId.toString()) : null,
          is_read: message.isRead || false,
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

async function migrateSubscriptions() {
  console.log('🔄 Migration des abonnements...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const subscriptions = await db.collection('subscriptions').find({}).toArray();
    
    console.log(`📊 ${subscriptions.length} abonnements trouvés dans MongoDB`);
    
    for (const subscription of subscriptions) {
      const supabaseId = generateValidUUID(subscription._id.toString());
      const userId = subscription.user || subscription.userId;
      
      console.log(`➕ Migration abonnement...`);
      
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          id: supabaseId,
          user_id: userId ? generateValidUUID(userId.toString()) : null,
          stripe_subscription_id: subscription.stripeSubscriptionId || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          stripe_customer_id: subscription.stripeCustomerId || `cus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: subscription.status || 'active',
          plan_type: subscription.planType || subscription.plan || 'basic',
          current_period_start: subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toISOString() : null,
          current_period_end: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString() : null,
          created_at: subscription.createdAt ? new Date(subscription.createdAt).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`❌ Erreur insertion abonnement:`, insertError);
      } else {
        console.log(`✅ Abonnement migré avec UUID: ${supabaseId}`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des abonnements terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration abonnements:', error);
  }
}

async function migratePayments() {
  console.log('🔄 Migration des paiements...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const payments = await db.collection('payments').find({}).toArray();
    
    console.log(`📊 ${payments.length} paiements trouvés dans MongoDB`);
    
    for (const payment of payments) {
      const supabaseId = generateValidUUID(payment._id.toString());
      const userId = payment.user || payment.userId;
      
      console.log(`➕ Migration paiement...`);
      
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          id: supabaseId,
          user_id: userId ? generateValidUUID(userId.toString()) : null,
          stripe_payment_intent_id: payment.stripePaymentIntentId || `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: payment.amount || 0,
          currency: payment.currency || 'eur',
          status: payment.status || 'pending',
          created_at: payment.createdAt ? new Date(payment.createdAt).toISOString() : new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`❌ Erreur insertion paiement:`, insertError);
      } else {
        console.log(`✅ Paiement migré avec UUID: ${supabaseId}`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des paiements terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration paiements:', error);
  }
}

async function updateTrackRelations() {
  console.log('🔄 Mise à jour des relations des pistes...');
  
  try {
    // Mettre à jour les creator_id des pistes avec les nouveaux UUIDs
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
    
    console.log('✅ Relations des pistes mises à jour');
    
  } catch (error) {
    console.error('❌ Erreur mise à jour relations pistes:', error);
  }
}

async function updateCommentRelations() {
  console.log('🔄 Mise à jour des relations des commentaires...');
  
  try {
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
        // Chercher l'utilisateur correspondant dans le mapping
        for (const [mongoId, supabaseId] of idMapping.entries()) {
          if (mongoId === comment.user_id) {
            updates.user_id = supabaseId;
            break;
          }
        }
      }
      
      if (comment.track_id) {
        // Chercher la piste correspondante dans le mapping
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
    
    console.log('✅ Relations des commentaires mises à jour');
    
  } catch (error) {
    console.error('❌ Erreur mise à jour relations commentaires:', error);
  }
}

async function main() {
  console.log('🚀 Migration COMPLÈTE MongoDB → Supabase (CORRIGÉE)');
  console.log('⚠️  ATTENTION: Cette migration convertit les IDs MongoDB en UUIDs valides');
  console.log('');
  
  try {
    // Migration dans l'ordre logique
    await migrateUsers();
    console.log('');
    
    await migrateConversations();
    console.log('');
    
    await migrateMessages();
    console.log('');
    
    await migrateSubscriptions();
    console.log('');
    
    await migratePayments();
    console.log('');
    
    // Mise à jour des relations
    await updateTrackRelations();
    console.log('');
    
    await updateCommentRelations();
    console.log('');
    
    console.log('🎉 Migration COMPLÈTE terminée avec succès !');
    console.log('');
    console.log('📋 Mapping des IDs :');
    for (const [mongoId, supabaseId] of idMapping.entries()) {
      console.log(`   ${mongoId} → ${supabaseId}`);
    }
    console.log('');
    console.log('📋 Prochaines étapes :');
    console.log('1. Vérifier toutes les données migrées dans Supabase');
    console.log('2. Tester l\'application complète avec Supabase');
    console.log('3. Configurer NextAuth pour utiliser Supabase');
    console.log('4. Basculement complet vers Supabase');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration complète:', error);
    process.exit(1);
  }
}

// Lancer la migration
if (require.main === module) {
  main();
}

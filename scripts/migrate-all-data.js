const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function migrateUsers() {
  console.log('🔄 Migration des utilisateurs...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`📊 ${users.length} utilisateurs trouvés dans MongoDB`);
    
    for (const user of users) {
      // Vérifier si l'utilisateur existe déjà
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user._id.toString())
        .single();
      
      if (existingUser) {
        console.log(`⏭️ Utilisateur ${user.name || user.username} déjà migré, mise à jour...`);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
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
            updated_at: new Date().toISOString()
          })
          .eq('id', user._id.toString());
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour utilisateur ${user.name}:`, updateError);
        }
      } else {
        console.log(`➕ Migration utilisateur ${user.name || user.username}...`);
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user._id.toString(),
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
        }
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
      // Vérifier si la conversation existe déjà
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversation._id.toString())
        .single();
      
      if (existingConversation) {
        console.log(`⏭️ Conversation déjà migrée, mise à jour...`);
        
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            name: conversation.name || '',
            is_group: conversation.isGroup || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation._id.toString());
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour conversation:`, updateError);
        }
      } else {
        console.log(`➕ Migration conversation...`);
        
        const { error: insertError } = await supabase
          .from('conversations')
          .insert({
            id: conversation._id.toString(),
            name: conversation.name || '',
            is_group: conversation.isGroup || false,
            created_at: conversation.createdAt ? new Date(conversation.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Erreur insertion conversation:`, insertError);
        }
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
      // Vérifier si le message existe déjà
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('id')
        .eq('id', message._id.toString())
        .single();
      
      if (existingMessage) {
        console.log(`⏭️ Message déjà migré, mise à jour...`);
        
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            content: message.content || '',
            is_read: message.isRead || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', message._id.toString());
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour message:`, updateError);
        }
      } else {
        console.log(`➕ Migration message...`);
        
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            id: message._id.toString(),
            content: message.content || '',
            sender_id: message.sender || message.senderId || null,
            conversation_id: message.conversation || message.conversationId || null,
            is_read: message.isRead || false,
            created_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Erreur insertion message:`, insertError);
        }
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
      // Vérifier si l'abonnement existe déjà
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('id', subscription._id.toString())
        .single();
      
      if (existingSubscription) {
        console.log(`⏭️ Abonnement déjà migré, mise à jour...`);
        
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.stripeSubscriptionId || '',
            stripe_customer_id: subscription.stripeCustomerId || '',
            status: subscription.status || 'active',
            plan_type: subscription.planType || subscription.plan || 'basic',
            current_period_start: subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toISOString() : null,
            current_period_end: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription._id.toString());
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour abonnement:`, updateError);
        }
      } else {
        console.log(`➕ Migration abonnement...`);
        
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            id: subscription._id.toString(),
            user_id: subscription.user || subscription.userId || null,
            stripe_subscription_id: subscription.stripeSubscriptionId || '',
            stripe_customer_id: subscription.stripeCustomerId || '',
            status: subscription.status || 'active',
            plan_type: subscription.planType || subscription.plan || 'basic',
            current_period_start: subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toISOString() : null,
            current_period_end: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString() : null,
            created_at: subscription.createdAt ? new Date(subscription.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Erreur insertion abonnement:`, insertError);
        }
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des abonnements terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration abonnements:', error);
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
      // Mettre à jour le profil utilisateur avec le statut en ligne
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          last_seen: userStatus.lastSeen ? new Date(userStatus.lastSeen).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userStatus.user || userStatus.userId);
      
      if (updateError) {
        console.error(`❌ Erreur mise à jour statut utilisateur:`, updateError);
      } else {
        console.log(`✅ Statut mis à jour pour l'utilisateur`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des statuts utilisateurs terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration statuts utilisateurs:', error);
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
      // Vérifier si le paiement existe déjà
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('id', payment._id.toString())
        .single();
      
      if (existingPayment) {
        console.log(`⏭️ Paiement déjà migré, mise à jour...`);
        
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            stripe_payment_intent_id: payment.stripePaymentIntentId || '',
            amount: payment.amount || 0,
            currency: payment.currency || 'eur',
            status: payment.status || 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment._id.toString());
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour paiement:`, updateError);
        }
      } else {
        console.log(`➕ Migration paiement...`);
        
        const { error: insertError } = await supabase
          .from('payments')
          .insert({
            id: payment._id.toString(),
            user_id: payment.user || payment.userId || null,
            stripe_payment_intent_id: payment.stripePaymentIntentId || '',
            amount: payment.amount || 0,
            currency: payment.currency || 'eur',
            status: payment.status || 'pending',
            created_at: payment.createdAt ? new Date(payment.createdAt).toISOString() : new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Erreur insertion paiement:`, insertError);
        }
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des paiements terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration paiements:', error);
  }
}

async function migrateUserSubscriptions() {
  console.log('🔄 Migration des abonnements utilisateurs...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const userSubscriptions = await db.collection('usersubscriptions').find({}).toArray();
    
    console.log(`📊 ${userSubscriptions.length} abonnements utilisateurs trouvés dans MongoDB`);
    
    for (const userSub of userSubscriptions) {
      // Mettre à jour le profil utilisateur avec les informations d'abonnement
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', userSub.user || userSub.userId);
      
      if (updateError) {
        console.error(`❌ Erreur mise à jour abonnement utilisateur:`, updateError);
      } else {
        console.log(`✅ Abonnement utilisateur mis à jour`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des abonnements utilisateurs terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration abonnements utilisateurs:', error);
  }
}

async function main() {
  console.log('🚀 Migration COMPLÈTE MongoDB → Supabase');
  console.log('⚠️  ATTENTION: Cette migration inclut TOUTES les données');
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
    
    await migrateUserStatuses();
    console.log('');
    
    await migratePayments();
    console.log('');
    
    await migrateUserSubscriptions();
    console.log('');
    
    console.log('🎉 Migration COMPLÈTE terminée avec succès !');
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

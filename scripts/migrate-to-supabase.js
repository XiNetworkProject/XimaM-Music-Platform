const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

// Initialiser Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateUsers() {
  console.log('🔄 Migration des utilisateurs...');
  
  try {
    const mongoClient = await MongoClient.connect(MONGODB_URI);
    const db = mongoClient.db();
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`📊 ${users.length} utilisateurs trouvés`);
    
    for (const user of users) {
      // Créer l'utilisateur dans Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'temp_password_123', // L'utilisateur devra changer
        email_confirm: true,
        user_metadata: {
          name: user.name,
          username: user.username
        }
      });
      
      if (authError) {
        console.error(`❌ Erreur création auth pour ${user.email}:`, authError.message);
        continue;
      }
      
      // Insérer les données utilisateur dans la table profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          avatar: user.avatar || null,
          banner: user.banner || null,
          bio: user.bio || '',
          location: user.location || '',
          website: user.website || '',
          social_links: user.socialLinks || {},
          is_verified: user.isVerified || false,
          is_artist: user.isArtist || false,
          artist_name: user.artistName || '',
          genre: user.genre || [],
          total_plays: user.totalPlays || 0,
          total_likes: user.totalLikes || 0,
          last_seen: user.lastSeen || new Date(),
          preferences: user.preferences || {},
          created_at: user.createdAt || new Date(),
          updated_at: user.updatedAt || new Date()
        });
      
      if (profileError) {
        console.error(`❌ Erreur insertion profil pour ${user.email}:`, profileError.message);
      } else {
        console.log(`✅ Utilisateur migré: ${user.email}`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des utilisateurs terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration utilisateurs:', error);
  }
}

async function migrateTracks() {
  console.log('🔄 Migration des pistes...');
  
  try {
    const mongoClient = await MongoClient.connect(MONGODB_URI);
    const db = mongoClient.db();
    const tracks = await db.collection('tracks').find({}).toArray();
    
    console.log(`📊 ${tracks.length} pistes trouvées`);
    
    for (const track of tracks) {
      const { error } = await supabase
        .from('tracks')
        .insert({
          id: track._id.toString(),
          title: track.title,
          description: track.description || '',
          audio_url: track.audioUrl,
          cover_url: track.coverUrl || null,
          duration: track.duration || 0,
          genre: track.genre || [],
          creator_id: track.creator?.toString() || null,
          plays: track.plays || 0,
          likes: track.likes || 0,
          is_featured: track.isFeatured || false,
          is_public: track.isPublic !== false,
          created_at: track.createdAt || new Date(),
          updated_at: track.updatedAt || new Date()
        });
      
      if (error) {
        console.error(`❌ Erreur insertion piste ${track.title}:`, error.message);
      } else {
        console.log(`✅ Piste migrée: ${track.title}`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des pistes terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration pistes:', error);
  }
}

async function migratePlaylists() {
  console.log('🔄 Migration des playlists...');
  
  try {
    const mongoClient = await MongoClient.connect(MONGODB_URI);
    const db = mongoClient.db();
    const playlists = await db.collection('playlists').find({}).toArray();
    
    console.log(`📊 ${playlists.length} playlists trouvées`);
    
    for (const playlist of playlists) {
      const { error } = await supabase
        .from('playlists')
        .insert({
          id: playlist._id.toString(),
          name: playlist.name,
          description: playlist.description || '',
          cover_url: playlist.coverUrl || null,
          creator_id: playlist.creator?.toString() || null,
          is_public: playlist.isPublic !== false,
          created_at: playlist.createdAt || new Date(),
          updated_at: playlist.updatedAt || new Date()
        });
      
      if (error) {
        console.error(`❌ Erreur insertion playlist ${playlist.name}:`, error.message);
      } else {
        console.log(`✅ Playlist migrée: ${playlist.name}`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des playlists terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration playlists:', error);
  }
}

async function migrateComments() {
  console.log('🔄 Migration des commentaires...');
  
  try {
    const mongoClient = await MongoClient.connect(MONGODB_URI);
    const db = mongoClient.db();
    const comments = await db.collection('comments').find({}).toArray();
    
    console.log(`📊 ${comments.length} commentaires trouvés`);
    
    for (const comment of comments) {
      const { error } = await supabase
        .from('comments')
        .insert({
          id: comment._id.toString(),
          content: comment.content,
          user_id: comment.user?.toString() || null,
          track_id: comment.track?.toString() || null,
          parent_id: comment.parent?.toString() || null,
          likes: comment.likes || 0,
          created_at: comment.createdAt || new Date(),
          updated_at: comment.updatedAt || new Date()
        });
      
      if (error) {
        console.error(`❌ Erreur insertion commentaire:`, error.message);
      } else {
        console.log(`✅ Commentaire migré: ${comment.content.substring(0, 50)}...`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des commentaires terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration commentaires:', error);
  }
}

async function migrateMessages() {
  console.log('🔄 Migration des messages...');
  
  try {
    const mongoClient = await MongoClient.connect(MONGODB_URI);
    const db = mongoClient.db();
    const messages = await db.collection('messages').find({}).toArray();
    
    console.log(`📊 ${messages.length} messages trouvés`);
    
    for (const message of messages) {
      const { error } = await supabase
        .from('messages')
        .insert({
          id: message._id.toString(),
          content: message.content,
          sender_id: message.sender?.toString() || null,
          conversation_id: message.conversation?.toString() || null,
          is_read: message.isRead || false,
          created_at: message.createdAt || new Date(),
          updated_at: message.updatedAt || new Date()
        });
      
      if (error) {
        console.error(`❌ Erreur insertion message:`, error.message);
      } else {
        console.log(`✅ Message migré: ${message.content.substring(0, 50)}...`);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des messages terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration messages:', error);
  }
}

async function main() {
  console.log('🚀 Début de la migration MongoDB → Supabase');
  console.log('==========================================');
  
  try {
    await migrateUsers();
    await migrateTracks();
    await migratePlaylists();
    await migrateComments();
    await migrateMessages();
    
    console.log('🎉 Migration terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

main();

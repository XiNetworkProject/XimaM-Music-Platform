const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function migrateTracks() {
  console.log('🔄 Migration des pistes audio...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const tracks = await db.collection('tracks').find({}).toArray();
    
    console.log(`📊 ${tracks.length} pistes trouvées dans MongoDB`);
    
    for (const track of tracks) {
      // Vérifier si la piste existe déjà dans Supabase
      const { data: existingTrack } = await supabase
        .from('tracks')
        .select('id')
        .eq('id', track._id.toString())
        .single();
      
      if (existingTrack) {
        console.log(`⏭️ Piste ${track.title} déjà migrée, mise à jour...`);
        
        // Mettre à jour la piste existante
        const { error: updateError } = await supabase
          .from('tracks')
          .update({
            title: track.title,
            description: track.description || '',
            audio_url: track.audioUrl || track.audio_url,
            cover_url: track.coverUrl || track.cover_url,
            duration: Math.round(track.duration || 0), // Convertir en entier
            genre: Array.isArray(track.genre) ? track.genre : [], // S'assurer que c'est un tableau
            plays: track.plays || 0,
            likes: Array.isArray(track.likes) ? track.likes.length : (track.likes || 0),
            is_featured: track.isFeatured || false,
            is_public: track.isPublic !== false,
            updated_at: new Date().toISOString()
          })
          .eq('id', track._id.toString());
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour piste ${track.title}:`, updateError);
        }
      } else {
        console.log(`➕ Migration piste ${track.title}...`);
        
        // Insérer la nouvelle piste
        const { error: insertError } = await supabase
          .from('tracks')
          .insert({
            id: track._id.toString(),
            title: track.title,
            description: track.description || '',
            audio_url: track.audioUrl || track.audio_url,
            cover_url: track.coverUrl || track.cover_url,
            duration: Math.round(track.duration || 0), // Convertir en entier
            genre: Array.isArray(track.genre) ? track.genre : [], // S'assurer que c'est un tableau
            creator_id: null, // Sera mis à jour plus tard
            plays: track.plays || 0,
            likes: Array.isArray(track.likes) ? track.likes.length : (track.likes || 0),
            is_featured: track.isFeatured || false,
            is_public: track.isPublic !== false,
            created_at: track.createdAt ? new Date(track.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Erreur insertion piste ${track.title}:`, insertError);
        }
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
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const playlists = await db.collection('playlists').find({}).toArray();
    
    console.log(`📊 ${playlists.length} playlists trouvées dans MongoDB`);
    
    for (const playlist of playlists) {
      // Vérifier si la playlist existe déjà
      const { data: existingPlaylist } = await supabase
        .from('playlists')
        .select('id')
        .eq('id', playlist._id.toString())
        .single();
      
      if (existingPlaylist) {
        console.log(`⏭️ Playlist ${playlist.name} déjà migrée, mise à jour...`);
        
        const { error: updateError } = await supabase
          .from('playlists')
          .update({
            name: playlist.name,
            description: playlist.description || '',
            cover_url: playlist.coverUrl || playlist.cover_url,
            is_public: playlist.isPublic !== false,
            updated_at: new Date().toISOString()
          })
          .eq('id', playlist._id.toString());
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour playlist ${playlist.name}:`, updateError);
        }
      } else {
        console.log(`➕ Migration playlist ${playlist.name}...`);
        
        const { error: insertError } = await supabase
          .from('playlists')
          .insert({
            id: playlist._id.toString(),
            name: playlist.name,
            description: playlist.description || '',
            cover_url: playlist.coverUrl || playlist.cover_url,
            creator_id: null, // Sera mis à jour plus tard
            is_public: playlist.isPublic !== false,
            created_at: playlist.createdAt ? new Date(playlist.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Erreur insertion playlist ${playlist.name}:`, insertError);
        }
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
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const comments = await db.collection('comments').find({}).toArray();
    
    console.log(`📊 ${comments.length} commentaires trouvés dans MongoDB`);
    
    for (const comment of comments) {
      // Vérifier si le commentaire existe déjà
      const { data: existingComment } = await supabase
        .from('comments')
        .select('id')
        .eq('id', comment._id.toString())
        .single();
      
      if (existingComment) {
        console.log(`⏭️ Commentaire déjà migré, mise à jour...`);
        
        const { error: updateError } = await supabase
          .from('comments')
          .update({
            content: comment.content,
            likes: comment.likes || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', comment._id.toString());
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour commentaire:`, updateError);
        }
      } else {
        console.log(`➕ Migration commentaire...`);
        
        const { error: insertError } = await supabase
          .from('comments')
          .insert({
            id: comment._id.toString(),
            content: comment.content,
            user_id: null, // Sera mis à jour plus tard
            track_id: comment.track || comment.trackId || comment.track_id,
            parent_id: comment.parentId || comment.parent_id || null,
            likes: Array.isArray(comment.likes) ? comment.likes.length : (comment.likes || 0),
            created_at: comment.createdAt ? new Date(comment.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Erreur insertion commentaire:`, insertError);
        }
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration des commentaires terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration commentaires:', error);
  }
}

async function main() {
  console.log('🚀 Début de la migration des données MongoDB → Supabase');
  console.log('⚠️  ATTENTION: Cette migration ne touche PAS aux utilisateurs existants');
  console.log('');
  
  try {
    // Migration des données dans l'ordre
    await migrateTracks();
    console.log('');
    
    await migratePlaylists();
    console.log('');
    
    await migrateComments();
    console.log('');
    
    console.log('🎉 Migration des données terminée avec succès !');
    console.log('');
    console.log('📋 Prochaines étapes :');
    console.log('1. Vérifier les données migrées dans Supabase');
    console.log('2. Mettre à jour les relations (creator_id, user_id)');
    console.log('3. Tester l\'application avec Supabase');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

// Lancer la migration
if (require.main === module) {
  main();
}

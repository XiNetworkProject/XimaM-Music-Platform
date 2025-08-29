const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function migrateUsersFinal() {
  console.log('🔄 Migration FINALE des utilisateurs...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`📊 ${users.length} utilisateurs trouvés dans MongoDB`);
    
    for (const user of users) {
      const supabaseId = uuidv4();
      
      console.log(`➕ Migration utilisateur ${user.name || user.username}...`);
      
      try {
        // Créer l'utilisateur dans auth.users (contournement de la contrainte)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email || `${user.username || user.name}@ximam.com`,
          password: 'tempPassword123!', // Mot de passe temporaire
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
        
        // Utiliser l'ID retourné par createUser
        const userId = authData?.user?.id || supabaseId;
        
        // Maintenant insérer dans profiles
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
          console.log(`✅ Utilisateur ${user.name || user.username} migré avec UUID: ${supabaseId}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur migration utilisateur ${user.name}:`, error);
      }
    }
    
    await mongoClient.close();
    console.log('✅ Migration FINALE des utilisateurs terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration finale utilisateurs:', error);
  }
}

async function main() {
  console.log('🚀 Migration FINALE des utilisateurs MongoDB → Supabase');
  console.log('⚠️  ATTENTION: Cette migration contourne la contrainte auth.users');
  console.log('');
  
  try {
    await migrateUsersFinal();
    console.log('');
    console.log('🎉 Migration FINALE terminée !');
    console.log('');
    console.log('📋 Prochaines étapes :');
    console.log('1. Vérifier les utilisateurs migrés dans Supabase');
    console.log('2. Tester l\'authentification avec Supabase');
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

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialiser Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testComments() {
  console.log('🔍 Test de la table comments dans Supabase...');
  
  try {
    // 1. Vérifier l'existence de la table
    console.log('📋 Vérification de l\'existence de la table...');
    const { data: tableTest, error: tableError } = await supabase
      .from('comments')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Erreur accès table comments:', tableError);
      return;
    }
    
    console.log('✅ Table comments accessible');
    
    // 2. Compter le nombre total de commentaires
    const { count, error: countError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erreur comptage commentaires:', countError);
    } else {
      console.log(`📊 Nombre total de commentaires: ${count}`);
    }
    
    // 3. Récupérer quelques commentaires avec leurs détails
    console.log('📝 Récupération des détails des commentaires...');
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        track_id,
        parent_id,
        likes
      `)
      .limit(5);
    
    if (commentsError) {
      console.error('❌ Erreur récupération commentaires:', commentsError);
    } else {
      console.log(`✅ ${comments.length} commentaires récupérés:`);
      comments.forEach((comment, index) => {
        console.log(`  ${index + 1}. ID: ${comment.id}`);
        console.log(`     Content: ${comment.content?.substring(0, 50)}...`);
        console.log(`     User ID: ${comment.user_id || 'NULL'}`);
        console.log(`     Track ID: ${comment.track_id || 'NULL'}`);
        console.log(`     Likes: ${comment.likes}`);
        console.log(`     Created: ${comment.created_at}`);
        console.log('');
      });
    }
    
    // 4. Vérifier les relations avec profiles
    if (comments && comments.length > 0) {
      const userIds = comments.map(c => c.user_id).filter(id => id);
      if (userIds.length > 0) {
        console.log('👥 Vérification des relations avec profiles...');
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, username, name')
          .in('id', userIds);
        
        if (usersError) {
          console.error('❌ Erreur récupération profiles:', usersError);
        } else {
          console.log(`✅ ${users.length} profiles trouvés pour les commentaires`);
          users.forEach(user => {
            console.log(`  - ${user.username} (${user.name})`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Lancer le test
testComments();

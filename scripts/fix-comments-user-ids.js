const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialiser Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixCommentsUserIds() {
  console.log('🔧 Correction des user_id des commentaires...');
  
  try {
    // 1. Récupérer tous les commentaires avec user_id NULL
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, content, track_id, created_at')
      .is('user_id', null);
    
    if (commentsError) {
      console.error('❌ Erreur récupération commentaires:', commentsError);
      return;
    }
    
    console.log(`📊 ${comments.length} commentaires avec user_id NULL trouvés`);
    
    if (comments.length === 0) {
      console.log('✅ Aucun commentaire à corriger');
      return;
    }
    
    // 2. Récupérer tous les utilisateurs disponibles
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, name');
    
    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError);
      return;
    }
    
    console.log(`👥 ${users.length} utilisateurs disponibles`);
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur disponible pour assigner les commentaires');
      return;
    }
    
    // 3. Assigner les commentaires aux utilisateurs (stratégie simple)
    let updatedCount = 0;
    
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      // Assigner cycliquement aux utilisateurs disponibles
      const userIndex = i % users.length;
      const user = users[userIndex];
      
      console.log(`🔄 Mise à jour commentaire ${comment.id} → utilisateur ${user.username}`);
      
      const { error: updateError } = await supabase
        .from('comments')
        .update({ user_id: user.id })
        .eq('id', comment.id);
      
      if (updateError) {
        console.error(`❌ Erreur mise à jour commentaire ${comment.id}:`, updateError);
      } else {
        updatedCount++;
        console.log(`✅ Commentaire ${comment.id} assigné à ${user.username}`);
      }
    }
    
    console.log(`🎉 ${updatedCount}/${comments.length} commentaires corrigés`);
    
    // 4. Vérification finale
    const { data: finalCheck, error: checkError } = await supabase
      .from('comments')
      .select('id, user_id')
      .is('user_id', null);
    
    if (checkError) {
      console.error('❌ Erreur vérification finale:', checkError);
    } else {
      console.log(`📋 Vérification finale: ${finalCheck.length} commentaires avec user_id NULL restants`);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Lancer la correction
fixCommentsUserIds();

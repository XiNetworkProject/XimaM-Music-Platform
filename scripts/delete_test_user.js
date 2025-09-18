// scripts/delete_test_user.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteTestUser() {
  try {
    console.log('🔍 Recherche de l\'utilisateur test...');
    
    // Rechercher l'utilisateur par email
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@example.com');
    
    if (searchError) {
      console.error('❌ Erreur lors de la recherche:', searchError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ Aucun utilisateur trouvé avec l\'email "test@example.com"');
      return;
    }
    
    const testUser = users[0];
    console.log('✅ Utilisateur trouvé:', {
      id: testUser.id,
      email: testUser.email,
      subscription_plan: testUser.subscription_plan,
      created_at: testUser.created_at
    });
    
    // Supprimer les données associées dans l'ordre
    console.log('🗑️ Suppression des données associées...');
    
    // 1. Supprimer les likes
    const { error: likesError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', testUser.id);
    
    if (likesError) {
      console.error('❌ Erreur suppression likes:', likesError);
    } else {
      console.log('✅ Likes supprimés');
    }
    
    // 2. Supprimer les commentaires
    const { error: commentsError } = await supabase
      .from('comments')
      .delete()
      .eq('user_id', testUser.id);
    
    if (commentsError) {
      console.error('❌ Erreur suppression commentaires:', commentsError);
    } else {
      console.log('✅ Commentaires supprimés');
    }
    
    // 3. Supprimer les écoutes
    const { error: playsError } = await supabase
      .from('plays')
      .delete()
      .eq('user_id', testUser.id);
    
    if (playsError) {
      console.error('❌ Erreur suppression écoutes:', playsError);
    } else {
      console.log('✅ Écoutes supprimées');
    }
    
    // 4. Supprimer les tracks de l'utilisateur
    const { error: tracksError } = await supabase
      .from('tracks')
      .delete()
      .eq('artist_id', testUser.id);
    
    if (tracksError) {
      console.error('❌ Erreur suppression tracks:', tracksError);
    } else {
      console.log('✅ Tracks supprimées');
    }
    
    // 5. Supprimer les générations IA
    const { error: aiGenerationsError } = await supabase
      .from('ai_generations')
      .delete()
      .eq('user_id', testUser.id);
    
    if (aiGenerationsError) {
      console.error('❌ Erreur suppression générations IA:', aiGenerationsError);
    } else {
      console.log('✅ Générations IA supprimées');
    }
    
    // 6. Supprimer les playlists
    const { error: playlistsError } = await supabase
      .from('playlists')
      .delete()
      .eq('user_id', testUser.id);
    
    if (playlistsError) {
      console.error('❌ Erreur suppression playlists:', playlistsError);
    } else {
      console.log('✅ Playlists supprimées');
    }
    
    // 7. Supprimer les follows
    const { error: followsError } = await supabase
      .from('follows')
      .delete()
      .or(`follower_id.eq.${testUser.id},following_id.eq.${testUser.id}`);
    
    if (followsError) {
      console.error('❌ Erreur suppression follows:', followsError);
    } else {
      console.log('✅ Follows supprimés');
    }
    
    // 8. Supprimer les notifications
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', testUser.id);
    
    if (notificationsError) {
      console.error('❌ Erreur suppression notifications:', notificationsError);
    } else {
      console.log('✅ Notifications supprimées');
    }
    
    // 9. Supprimer les sessions
    const { error: sessionsError } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', testUser.id);
    
    if (sessionsError) {
      console.error('❌ Erreur suppression sessions:', sessionsError);
    } else {
      console.log('✅ Sessions supprimées');
    }
    
    // 10. Supprimer les comptes
    const { error: accountsError } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', testUser.id);
    
    if (accountsError) {
      console.error('❌ Erreur suppression comptes:', accountsError);
    } else {
      console.log('✅ Comptes supprimés');
    }
    
    // 11. Enfin, supprimer l'utilisateur
    console.log('🗑️ Suppression de l\'utilisateur...');
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', testUser.id);
    
    if (userError) {
      console.error('❌ Erreur suppression utilisateur:', userError);
    } else {
      console.log('✅ Utilisateur supprimé avec succès !');
      console.log('📋 Résumé de la suppression:');
      console.log(`   - Email: ${testUser.email}`);
      console.log(`   - ID: ${testUser.id}`);
      console.log(`   - Plan: ${testUser.subscription_plan}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
deleteTestUser().then(() => {
  console.log('🏁 Script terminé');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

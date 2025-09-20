/**
 * Transfère les uploads (tracks, ai_tracks) d'un utilisateur source vers un utilisateur cible,
 * puis supprime le compte source (profils + utilisateur auth) en toute sécurité.
 *
 * Prérequis:
 * - Variables d'env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (dans .env.local ou env système)
 * - @supabase/supabase-js installé (déjà présent dans le projet)
 *
 * Utilisation (PowerShell/Terminal):
 *   node scripts/transfer_uploads_and_delete_user.js vermeulenmaxime50 ximamoff
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const [,, SOURCE_USERNAME_ARG, DEST_USERNAME_ARG] = process.argv;

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Variables SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes.');
    process.exit(1);
  }

  if (!SOURCE_USERNAME_ARG || !DEST_USERNAME_ARG) {
    console.error('❌ Usage: node scripts/transfer_uploads_and_delete_user.js <source_username> <dest_username>');
    process.exit(1);
  }

  const sourceUsername = SOURCE_USERNAME_ARG.replace(/^@/, '');
  const destUsername = DEST_USERNAME_ARG.replace(/^@/, '');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  // Récupérer profils
  const { data: srcProfiles, error: srcErr } = await supabase
    .from('profiles')
    .select('id, username, name')
    .eq('username', sourceUsername)
    .limit(1);
  if (srcErr || !srcProfiles || srcProfiles.length === 0) {
    console.error('❌ Utilisateur source introuvable:', sourceUsername, srcErr);
    process.exit(1);
  }
  const src = srcProfiles[0];

  const { data: dstProfiles, error: dstErr } = await supabase
    .from('profiles')
    .select('id, username, name')
    .eq('username', destUsername)
    .limit(1);
  if (dstErr || !dstProfiles || dstProfiles.length === 0) {
    console.error('❌ Utilisateur cible introuvable:', destUsername, dstErr);
    process.exit(1);
  }
  const dst = dstProfiles[0];

  console.log(`🔄 Transfert de ${sourceUsername} (${src.id}) → ${destUsername} (${dst.id})`);

  // 1) tracks: creator_id / artist_id
  try {
    const { error: updTracks1 } = await supabase
      .from('tracks')
      .update({ creator_id: dst.id })
      .eq('creator_id', src.id);
    if (updTracks1) throw updTracks1;

    // Si la colonne artist_id existe, on tente (ignore si erreur de colonne)
    const { error: updTracks2 } = await supabase
      .from('tracks')
      .update({ artist_id: dst.id })
      .eq('artist_id', src.id);
    if (updTracks2 && !/column .* does not exist/i.test(updTracks2.message || '')) {
      throw updTracks2;
    }
    console.log('✅ Tracks transférés (creator_id/artist_id)');
  } catch (e) {
    console.error('❌ Erreur transfert tracks:', e);
    process.exit(1);
  }

  // 2) ai_tracks: user_id (si table présente)
  try {
    const { error: updAi } = await supabase
      .from('ai_tracks')
      .update({ user_id: dst.id })
      .eq('user_id', src.id);
    if (updAi && !/relation .* does not exist|table .* does not exist/i.test(updAi.message || '')) {
      throw updAi;
    }
    console.log('✅ AI tracks transférés (si table présente)');
  } catch (e) {
    console.warn('⚠️ ai_tracks non transférés (table absente?):', e.message || e);
  }

  // 3) playlists (si propriétaire par user_id)
  try {
    const { error: updPlaylists } = await supabase
      .from('playlists')
      .update({ user_id: dst.id })
      .eq('user_id', src.id);
    if (updPlaylists && !/relation .* does not exist|table .* does not exist/i.test(updPlaylists.message || '')) {
      throw updPlaylists;
    }
    console.log('✅ Playlists transférées (si table présente)');
  } catch (e) {
    console.warn('⚠️ playlists non transférées (table absente?):', e.message || e);
  }

  // 4) Suppression du profil source (app) puis du compte auth
  try {
    const { error: delProfile } = await supabase
      .from('profiles')
      .delete()
      .eq('id', src.id);
    if (delProfile) throw delProfile;
    console.log('✅ Profil app supprimé');
  } catch (e) {
    console.error('❌ Erreur suppression profil app:', e);
    process.exit(1);
  }

  // Supprimer l'utilisateur auth (GoTrue)
  try {
    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(src.id);
    if (delAuthErr) throw delAuthErr;
    console.log('✅ Utilisateur auth supprimé');
  } catch (e) {
    console.warn('⚠️ Impossible de supprimer l’utilisateur auth via API (vérifier service role):', e.message || e);
  }

  console.log('🎉 Transfert terminé.');
}

main().catch((e) => {
  console.error('❌ Erreur inattendue:', e);
  process.exit(1);
});



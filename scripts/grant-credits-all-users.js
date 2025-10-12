// Créditer tous les utilisateurs d'un bonus (ex: 50 crédits)
// Usage: node scripts/grant-credits-all-users.js 50

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  try {
    const amount = parseInt(process.argv[2] || '50', 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      console.error('❌ Montant invalide. Exemple: node scripts/grant-credits-all-users.js 50');
      process.exit(1);
    }

    console.log(`🚀 Crédit de ${amount} crédits à tous les utilisateurs...`);
    // Récupérer tous les profils
    const { data: profiles, error } = await supabase.from('profiles').select('id').limit(100000);
    if (error) throw error;

    let success = 0;
    for (const p of profiles || []) {
      try {
        await supabase.rpc('ai_add_credits', { p_user_id: p.id, p_amount: amount });
        success++;
      } catch (e) {
        console.warn('⚠️ Échec crédit user:', p.id, e?.message || e);
      }
    }
    console.log(`✅ Terminé. Utilisateurs crédités: ${success}/${profiles?.length || 0}`);
  } catch (e) {
    console.error('❌ Erreur:', e?.message || e);
    process.exit(1);
  }
})();



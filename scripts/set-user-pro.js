// Mettre un utilisateur en plan Pro avec essai jusqu'au 31 décembre 2025
// Usage: node scripts/set-user-pro.js vdbcedric59@gmail.com

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Variables manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  try {
    const email = process.argv[2] || 'vdbcedric59@gmail.com';
    const { data: user, error } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
    if (error) throw error;
    if (!user?.id) { console.error('❌ Profil introuvable pour', email); process.exit(1); }

    const trialEnd = new Date('2025-12-31T23:59:59.000Z').toISOString();
    await supabase.from('profiles').update({
      plan: 'pro',
      subscription_status: 'trial',
      subscription_current_period_end: trialEnd,
    }).eq('id', user.id);

    // Créditer les crédits mensuels du plan Pro
    await supabase.rpc('ai_add_credits', { p_user_id: user.id, p_amount: 360 });
    console.log(`✅ ${email} mis en plan Pro (trial jusqu'au 31/12/2025) et crédité de 360 crédits.`);
  } catch (e) {
    console.error('❌ Erreur:', e?.message || e);
    process.exit(1);
  }
})();



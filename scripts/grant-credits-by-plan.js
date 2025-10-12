// Créditer tous les utilisateurs selon leur plan (monthlyCredits)
// Utilise la fonction SQL public.ai_grant_monthly_plan_credits()

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
    console.log('🚀 Crédit mensuel par plan (script) ...');
    const planToCredits = {
      starter: 120,
      pro: 360,
      enterprise: 1200,
      free: 0
    };

    const { data: profiles, error } = await supabase.from('profiles').select('id, plan').limit(100000);
    if (error) throw error;

    let success = 0;
    for (const p of profiles || []) {
      const plan = (p.plan || 'free').toLowerCase();
      const amount = planToCredits[plan] ?? 0;
      if (amount > 0) {
        try {
          await supabase.rpc('ai_add_credits', { p_user_id: p.id, p_amount: amount });
          success++;
        } catch (e) {
          console.warn('⚠️ Échec crédit plan:', p.id, plan, e?.message || e);
        }
      }
    }
    console.log(`✅ Terminé. Utilisateurs crédités: ${success}/${profiles?.length || 0}`);
  } catch (e) {
    console.error('❌ Erreur:', e?.message || e);
    process.exit(1);
  }
})();



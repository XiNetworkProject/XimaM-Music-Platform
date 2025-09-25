// scripts/reset_ai_quota_and_generations.js
// Usage: node scripts/reset_ai_quota_and_generations.js "email@example.com"

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  try {
    const email = process.argv[2];
    if (!email) {
      console.error('❌ Fournissez un email: node scripts/reset_ai_quota_and_generations.js "email@example.com"');
      process.exit(1);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error('❌ Variables manquantes: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`🔍 Recherche utilisateur: ${email}`);
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const user = list.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error('❌ Utilisateur introuvable');
      process.exit(1);
    }

    console.log(`✅ Utilisateur: ${user.id}`);

    // 1) Réinitialiser user_quotas (si utilisé ailleurs)
    await admin.from('user_quotas')
      .update({ used_this_month: 0, reset_date: new Date().toISOString() })
      .eq('user_id', user.id);

    // 2) Mettre à zéro le compteur visible par l'API /api/ai/quota
    // Cette API compte les entrées ai_generations.status='completed' du mois en cours
    const start = new Date();
    start.setDate(1); start.setHours(0,0,0,0);

    console.log('🔄 Requalifie les générations du mois courant en status="void"…');
    const { data: updated, error: updErr } = await admin
      .from('ai_generations')
      .update({ status: 'void' })
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .select('id');

    if (updErr) throw updErr;
    console.log(`✅ Générations requalifiées: ${updated ? updated.length : 0}`);

    console.log('🎉 Quota IA effectif réinitialisé pour cet utilisateur.');
  } catch (e) {
    console.error('❌ Erreur:', e.message || e);
    process.exit(1);
  }
}

main();

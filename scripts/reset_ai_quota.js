// scripts/reset_ai_quota.js
// Usage: node scripts/reset_ai_quota.js "email@example.com"

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  try {
    const email = process.argv[2];
    if (!email) {
      console.error('❌ Fournissez un email: node scripts/reset_ai_quota.js "email@example.com"');
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

    console.log(`🔍 Recherche de l'utilisateur: ${email}`);
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const user = list.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error('❌ Utilisateur introuvable');
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.id}`);

    console.log('🔄 Réinitialisation du quota IA...');
    const { data: updated, error: updErr } = await admin
      .from('user_quotas')
      .update({ used_this_month: 0, remaining: admin.rpc ? undefined : undefined, reset_date: new Date().toISOString() })
      .eq('user_id', user.id)
      .select('*');

    if (updErr) throw updErr;

    if (!updated || updated.length === 0) {
      console.warn('⚠️ Aucune ligne mise à jour. Assurez-vous que la ligne existe dans public.user_quotas');
    } else {
      console.log('✅ Quota remis à zéro:', updated[0]);
    }
  } catch (e) {
    console.error('❌ Erreur:', e.message || e);
    process.exit(1);
  }
}

main();

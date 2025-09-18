const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createUsersTable() {
  console.log('🚀 Création de la table users...\n');

  try {
    // 1. Créer la table users avec une requête directe
    console.log('📄 Création de la table...');
    const { error: createError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (createError && createError.code === 'PGRST205') {
      console.log('❌ Table users n\'existe pas, création manuelle requise');
      console.log('\n📋 Instructions :');
      console.log('1. Allez sur https://supabase.com');
      console.log('2. Ouvrez votre projet');
      console.log('3. Allez dans "SQL Editor"');
      console.log('4. Exécutez ce code :');
      console.log(`
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    subscription_plan VARCHAR(20) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'creator', 'pro', 'enterprise')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.users (id, email, subscription_plan, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'free' as subscription_plan,
    au.created_at,
    au.updated_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;
      `);
      return;
    }

    // 2. Vérifier que la table existe
    console.log('🔍 Vérification de la table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, subscription_plan')
      .limit(5);

    if (usersError) {
      console.error('❌ Erreur:', usersError);
      return;
    }

    console.log(`✅ Table users existe !`);
    console.log(`📊 ${users.length} utilisateurs trouvés:`);
    users.forEach(user => {
      console.log(`   - ${user.email} (Plan: ${user.subscription_plan})`);
    });

    // 3. Test de l'endpoint
    console.log('\n🧪 Test de l\'endpoint quota...');
    try {
      const testResponse = await fetch('http://localhost:3000/api/ai/quota');
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Endpoint quota fonctionne !');
        console.log(`   📊 Plan: ${testData.plan}, Utilisé: ${testData.used}/${testData.total}`);
      } else {
        const errorData = await testResponse.json();
        console.log(`⚠️ Endpoint quota: ${errorData.error}`);
      }
    } catch (e) {
      console.log('⚠️ Application non lancée ou endpoint non accessible');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  createUsersTable();
}

module.exports = { createUsersTable };

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAIMigration() {
  console.log('🚀 Début de la migration AI Generations...');
  
  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'create_ai_generations_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Fichier SQL lu avec succès');
    
    // Exécuter les commandes SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Erreur lors de l\'exécution SQL:', error);
      
      // Fallback: exécuter les commandes une par une
      console.log('🔄 Tentative d\'exécution manuelle...');
      await executeSQLManually();
    } else {
      console.log('✅ Migration AI Generations terminée avec succès !');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

async function executeSQLManually() {
  const commands = [
    // Création de la table
    `CREATE TABLE IF NOT EXISTS ai_generations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      audio_url TEXT NOT NULL,
      prompt TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 30,
      model VARCHAR(50) NOT NULL DEFAULT 'audiocraft',
      style VARCHAR(50),
      quality VARCHAR(20) DEFAULT '256kbps',
      status VARCHAR(20) DEFAULT 'pending',
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Index
    `CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);`,
    
    // Trigger
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';`,
    
    `CREATE TRIGGER update_ai_generations_updated_at 
        BEFORE UPDATE ON ai_generations 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();`,
    
    // RLS
    `ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;`,
    
    // Politiques
    `DROP POLICY IF EXISTS "Users can view own ai generations" ON ai_generations;`,
    `CREATE POLICY "Users can view own ai generations" ON ai_generations
        FOR SELECT USING (auth.uid() = user_id);`,
    
    `DROP POLICY IF EXISTS "Users can create own ai generations" ON ai_generations;`,
    `CREATE POLICY "Users can create own ai generations" ON ai_generations
        FOR INSERT WITH CHECK (auth.uid() = user_id);`,
    
    `DROP POLICY IF EXISTS "Users can update own ai generations" ON ai_generations;`,
    `CREATE POLICY "Users can update own ai generations" ON ai_generations
        FOR UPDATE USING (auth.uid() = user_id);`,
    
    `DROP POLICY IF EXISTS "Users can delete own ai generations" ON ai_generations;`,
    `CREATE POLICY "Users can delete own ai generations" ON ai_generations
        FOR DELETE USING (auth.uid() = user_id);`,
    
    // Fonctions
    `CREATE OR REPLACE FUNCTION get_monthly_generations_count(user_uuid UUID)
    RETURNS INTEGER AS $$
    BEGIN
        RETURN (
            SELECT COUNT(*)
            FROM ai_generations
            WHERE user_id = user_uuid
            AND created_at >= date_trunc('month', NOW())
        );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;`,
    
    `CREATE OR REPLACE FUNCTION check_user_quota(user_uuid UUID)
    RETURNS BOOLEAN AS $$
    DECLARE
        user_plan VARCHAR(20);
        current_usage INTEGER;
        max_generations INTEGER;
    BEGIN
        -- Récupérer le plan de l'utilisateur
        SELECT subscription_plan INTO user_plan
        FROM users
        WHERE id = user_uuid;
        
        -- Compter les générations du mois
        SELECT get_monthly_generations_count(user_uuid) INTO current_usage;
        
        -- Définir les limites selon le plan
        CASE user_plan
            WHEN 'free' THEN max_generations := 10;
            WHEN 'starter' THEN max_generations := 50;
            WHEN 'creator' THEN max_generations := 200;
            WHEN 'pro' THEN max_generations := 1000;
            WHEN 'enterprise' THEN max_generations := 9999;
            ELSE max_generations := 10;
        END CASE;
        
        RETURN current_usage < max_generations;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;`
  ];
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    console.log(`📝 Exécution de la commande ${i + 1}/${commands.length}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: command });
      if (error) {
        console.warn(`⚠️  Avertissement pour la commande ${i + 1}:`, error.message);
      }
    } catch (error) {
      console.warn(`⚠️  Avertissement pour la commande ${i + 1}:`, error.message);
    }
  }
  
  console.log('✅ Migration manuelle terminée !');
}

// Vérifier que la table existe
async function verifyMigration() {
  console.log('🔍 Vérification de la migration...');
  
  try {
    const { data, error } = await supabase
      .from('ai_generations')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur lors de la vérification:', error);
      return false;
    }
    
    console.log('✅ Table ai_generations accessible');
    
    // Vérifier les politiques RLS
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'ai_generations' });
    
    if (policiesError) {
      console.warn('⚠️  Impossible de vérifier les politiques RLS');
    } else {
      console.log(`✅ ${policies?.length || 0} politiques RLS configurées`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('🎵 Migration AI Generations pour Synaura');
  console.log('=====================================');
  
  await runAIMigration();
  
  // Vérification
  const success = await verifyMigration();
  
  if (success) {
    console.log('\n🎉 Migration terminée avec succès !');
    console.log('📋 Prochaines étapes :');
    console.log('   1. Tester l\'interface /ai-generator');
    console.log('   2. Implémenter AudioCraft');
    console.log('   3. Configurer Cloudinary');
    console.log('   4. Tester les quotas utilisateur');
  } else {
    console.log('\n❌ Migration échouée');
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAIMigration, verifyMigration };

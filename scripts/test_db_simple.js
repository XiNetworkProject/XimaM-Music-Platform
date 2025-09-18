// Test simple de la base de données
const { createClient } = require('@supabase/supabase-js');

// Utiliser les variables d'environnement du système
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

console.log('🔍 Test de connexion Supabase...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? '✅ Présente' : '❌ Manquante');

if (!supabaseKey || supabaseKey === 'your-service-role-key') {
  console.log('❌ Clé Supabase manquante. Vérifiez votre fichier .env');
  console.log('📝 Exemple de .env:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 Test de connexion...');
    
    // Test simple - essayer de récupérer une ligne
    const { data, error } = await supabase
      .from('ai_generations')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Erreur de connexion:', error.message);
      return;
    }

    console.log('✅ Connexion réussie!');
    console.log('📊 Données récupérées:', data);

    // Essayer de récupérer la structure
    const { data: structure, error: structureError } = await supabase
      .from('ai_generations')
      .select('*')
      .limit(1);

    if (structureError) {
      console.error('❌ Erreur structure:', structureError.message);
      return;
    }

    if (structure && structure.length > 0) {
      console.log('📊 Structure de la table:');
      Object.keys(structure[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof structure[0][key]}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

testConnection();

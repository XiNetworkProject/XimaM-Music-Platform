/**
 * Script pour lister tous les utilisateurs de Synaura
 * 
 * Usage : node scripts/list-users.js
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.local non trouvé');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes dans .env.local');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log('👥 Liste des utilisateurs Synaura\n');
  console.log('═'.repeat(100) + '\n');

  try {
    // Récupérer tous les utilisateurs
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, username, email, is_verified, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.log('ℹ️  Aucun utilisateur trouvé');
      return;
    }

    console.log(`📊 Total : ${profiles.length} utilisateur(s)\n`);

    // Afficher le tableau
    console.log('┌─────┬──────────────────────┬──────────────────────┬─────────────────────────────────┬──────────┬─────────────────────┐');
    console.log('│ N°  │ Nom                  │ Username             │ Email                           │ Vérifié  │ Créé le             │');
    console.log('├─────┼──────────────────────┼──────────────────────┼─────────────────────────────────┼──────────┼─────────────────────┤');

    profiles.forEach((user, index) => {
      const num = String(index + 1).padEnd(3);
      const name = (user.name || 'N/A').substring(0, 20).padEnd(20);
      const username = (user.username || 'N/A').substring(0, 20).padEnd(20);
      const email = (user.email || 'N/A').substring(0, 31).padEnd(31);
      const verified = (user.is_verified ? '✅ Oui' : '❌ Non').padEnd(8);
      const createdAt = new Date(user.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).padEnd(19);

      console.log(`│ ${num} │ ${name} │ ${username} │ ${email} │ ${verified} │ ${createdAt} │`);
    });

    console.log('└─────┴──────────────────────┴──────────────────────┴─────────────────────────────────┴──────────┴─────────────────────┘');
    
    console.log('\n📈 Statistiques :');
    console.log(`   - Utilisateurs vérifiés : ${profiles.filter(u => u.is_verified).length}`);
    console.log(`   - Utilisateurs non vérifiés : ${profiles.filter(u => !u.is_verified).length}`);
    
    const now = new Date();
    const last24h = profiles.filter(u => (now - new Date(u.created_at)) < 24 * 60 * 60 * 1000).length;
    const last7d = profiles.filter(u => (now - new Date(u.created_at)) < 7 * 24 * 60 * 60 * 1000).length;
    
    console.log(`   - Inscrits dans les 24h : ${last24h}`);
    console.log(`   - Inscrits dans les 7 jours : ${last7d}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

listUsers();


/**
 * Script pour mettre à jour le nom d'un utilisateur
 * 
 * Usage : node scripts/update-user-name.js <username> <nouveau_nom>
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

async function updateUserName(username, newName) {
  console.log(`🔄 Mise à jour du nom pour @${username}...\n`);

  try {
    // Trouver l'utilisateur (insensible à la casse)
    const { data: user, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .single();

    if (findError || !user) {
      console.error(`❌ Utilisateur @${username} non trouvé`);
      process.exit(1);
    }

    console.log(`📋 Utilisateur trouvé :`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Nom actuel: ${user.name}`);
    console.log(`   - Username: ${user.username}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`\n➡️  Nouveau nom: ${newName}\n`);

    // Mettre à jour le nom
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      process.exit(1);
    }

    console.log('✅ Nom mis à jour avec succès !');
    console.log(`\n📋 Informations mises à jour :`);
    console.log(`   - Nom: ${updated.name}`);
    console.log(`   - Username: ${updated.username}`);
    console.log(`   - Email: ${updated.email}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Arguments de ligne de commande
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage : node scripts/update-user-name.js <username> <nouveau_nom>');
  console.log('Exemple : node scripts/update-user-name.js trivelen "Cedric"');
  process.exit(1);
}

const username = args[0];
const newName = args.slice(1).join(' ');

updateUserName(username, newName);


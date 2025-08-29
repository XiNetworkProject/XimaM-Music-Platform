// Configuration temporaire pour la migration
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Vérifier les variables d'environnement
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ximam'
  }
};

// Vérifier la configuration
console.log('🔧 Configuration de migration :');
console.log('✅ Supabase URL:', config.supabase.url ? 'Configuré' : '❌ Manquant');
console.log('✅ Supabase Anon Key:', config.supabase.anonKey ? 'Configuré' : '❌ Manquant');
console.log('✅ Supabase Service Key:', config.supabase.serviceKey ? 'Configuré' : '❌ Manquant');
console.log('✅ MongoDB URI:', config.mongodb.uri ? 'Configuré' : '❌ Manquant');

// Exporter la configuration
module.exports = config;

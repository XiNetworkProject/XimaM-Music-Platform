const path = require('path');
const fs = require('fs');

console.log('🔍 DÉBOGAGE DE LA CONFIGURATION NEXTAUTH');
console.log('=========================================');

// Charger manuellement .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#')) {
        const value = valueParts.join('=').trim();
        if (value) {
          envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    
    Object.assign(process.env, envVars);
    console.log('✅ Fichier .env.local chargé');
  } else {
    console.log('⚠️  Fichier .env.local non trouvé');
  }
}

loadEnvFile();

// Vérifier les variables critiques
console.log('\n🔧 VÉRIFICATION DES VARIABLES CRITIQUES:');
console.log('==========================================');

const criticalVars = {
  'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
  'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
};

let hasIssues = false;

Object.entries(criticalVars).forEach(([key, value]) => {
  if (value) {
    if (key === 'NEXTAUTH_SECRET') {
      console.log(`✅ ${key}: Configuré (${value.substring(0, 10)}...)`);
    } else if (key.includes('SUPABASE_URL')) {
      console.log(`✅ ${key}: Configuré (${value.substring(0, 20)}...)`);
    } else if (key.includes('SUPABASE_ANON_KEY')) {
      console.log(`✅ ${key}: Configuré (${value.substring(0, 20)}...)`);
    } else if (key.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.log(`✅ ${key}: Configuré (${value.substring(0, 20)}...)`);
    } else {
      console.log(`✅ ${key}: Configuré`);
    }
  } else {
    console.log(`❌ ${key}: MANQUANT`);
    hasIssues = true;
  }
});

if (hasIssues) {
  console.log('\n⚠️  PROBLÈMES DÉTECTÉS:');
  console.log('========================');
  console.log('• Certaines variables critiques sont manquantes');
  console.log('• Cela peut causer l\'erreur 401');
  console.log('• Vérifiez votre fichier .env.local');
} else {
  console.log('\n✅ TOUTES LES VARIABLES CRITIQUES SONT CONFIGURÉES');
}

// Vérifier la configuration NextAuth
console.log('\n📋 VÉRIFICATION DE LA CONFIGURATION NEXTAUTH:');
console.log('==============================================');

const authOptionsPath = path.join(__dirname, '..', 'lib', 'authOptions.ts');
if (fs.existsSync(authOptionsPath)) {
  console.log('✅ Fichier authOptions.ts trouvé');
  
  const authContent = fs.readFileSync(authOptionsPath, 'utf8');
  
  // Vérifier les éléments critiques
  const checks = [
    { name: 'CredentialsProvider', found: authContent.includes('CredentialsProvider') },
    { name: 'supabase.auth.signInWithPassword', found: authContent.includes('supabase.auth.signInWithPassword') },
    { name: 'Table profiles', found: authContent.includes('from(\'profiles\')') },
    { name: 'Session callback', found: authContent.includes('async session') },
    { name: 'JWT callback', found: authContent.includes('async jwt') }
  ];
  
  checks.forEach(check => {
    if (check.found) {
      console.log(`   ✅ ${check.name}: Configuré`);
    } else {
      console.log(`   ❌ ${check.name}: Manquant`);
    }
  });
  
} else {
  console.log('❌ Fichier authOptions.ts non trouvé');
}

// Vérifier la route API
console.log('\n🔗 VÉRIFICATION DE LA ROUTE API:');
console.log('==================================');

const apiRoutePath = path.join(__dirname, '..', 'app', 'api', 'auth', '[...nextauth]', 'route.ts');
if (fs.existsSync(apiRoutePath)) {
  console.log('✅ Route API NextAuth trouvée');
  
  const routeContent = fs.readFileSync(apiRoutePath, 'utf8');
  
  if (routeContent.includes('NextAuth(authOptions)')) {
    console.log('   ✅ Handler NextAuth configuré');
  } else {
    console.log('   ❌ Handler NextAuth mal configuré');
  }
  
  if (routeContent.includes('export { handler as GET, handler as POST }')) {
    console.log('   ✅ Exports GET/POST configurés');
  } else {
    console.log('   ❌ Exports GET/POST manquants');
  }
  
} else {
  console.log('❌ Route API NextAuth non trouvée');
}

// Recommandations
console.log('\n💡 RECOMMANDATIONS:');
console.log('====================');

if (!hasIssues) {
  console.log('1. ✅ Configuration NextAuth correcte');
  console.log('2. 🔄 Redémarrez votre serveur Next.js');
  console.log('3. 🧪 Testez la connexion dans le navigateur');
  console.log('4. 📊 Vérifiez les logs du serveur');
  console.log('5. 🔍 L\'erreur 401 peut venir d\'ailleurs');
} else {
  console.log('1. ❌ Variables d\'environnement manquantes');
  console.log('2. 🔧 Complétez votre fichier .env.local');
  console.log('3. 🔄 Redémarrez votre serveur Next.js');
  console.log('4. 🧪 Testez à nouveau');
}

console.log('\n🎯 PROCHAINES ÉTAPES:');
console.log('======================');
console.log('• Si tout est configuré, le problème est dans la logique');
console.log('• Vérifiez les logs de votre serveur Next.js');
console.log('• Testez avec un vrai utilisateur et mot de passe');
console.log('• Vérifiez que Supabase est accessible');

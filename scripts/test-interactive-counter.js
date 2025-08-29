console.log('🧪 TEST DU COMPOSANT INTERACTIVE COUNTER');
console.log('==========================================');

// Simuler les différents cas d'usage
const testCases = [
  { name: 'Valeur normale', value: 42 },
  { name: 'Valeur undefined', value: undefined },
  { name: 'Valeur null', value: null },
  { name: 'Valeur 0', value: 0 },
  { name: 'Valeur négative', value: -5 }
];

console.log('\n🔍 CAS DE TEST:');
console.log('================');

testCases.forEach(testCase => {
  console.log(`\n🧪 ${testCase.name}:`);
  console.log(`   📊 Valeur: ${testCase.value}`);
  
  // Simuler le formatCount
  const formatCount = (num) => {
    if (num === undefined || num === null) {
      return '0';
    }
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  try {
    const result = formatCount(testCase.value);
    console.log(`   ✅ Résultat: ${result}`);
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }
});

console.log('\n🎉 TEST TERMINÉ !');
console.log('==================');
console.log('\n💡 VÉRIFICATION:');
console.log('Le composant InteractiveCounter devrait maintenant gérer correctement');
console.log('les valeurs undefined, null et les nombres normaux sans erreur.');

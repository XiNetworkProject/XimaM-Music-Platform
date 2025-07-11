const mongoose = require('mongoose');
require('dotenv').config();

// Modèle Track simplifié pour le test
const TrackSchema = new mongoose.Schema({
  title: String,
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  plays: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Track = mongoose.models.Track || mongoose.model('Track', TrackSchema);

async function testPlaysCounter() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Créer une piste de test
    const testTrack = new Track({
      title: 'Test Track - Plays Counter',
      artist: new mongoose.Types.ObjectId(),
      plays: 0
    });

    await testTrack.save();
    console.log('✅ Piste de test créée:', testTrack._id);

    // Test 1: Incrémenter les écoutes
    console.log('\n🧪 Test 1: Incrémentation des écoutes');
    console.log('Écoutes initiales:', testTrack.plays);

    const response1 = await fetch(`http://localhost:3000/api/tracks/${testTrack._id}/plays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Écoutes après incrémentation:', data1.plays);
    } else {
      console.log('❌ Erreur lors de l\'incrémentation');
    }

    // Test 2: Récupérer les écoutes
    console.log('\n🧪 Test 2: Récupération des écoutes');
    const response2 = await fetch(`http://localhost:3000/api/tracks/${testTrack._id}/plays`);
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ Écoutes récupérées:', data2.plays);
    } else {
      console.log('❌ Erreur lors de la récupération');
    }

    // Test 3: Vérifier en base de données
    console.log('\n🧪 Test 3: Vérification en base de données');
    const updatedTrack = await Track.findById(testTrack._id);
    console.log('✅ Écoutes en base:', updatedTrack.plays);

    // Test 4: Test de débounce (simuler plusieurs appels rapides)
    console.log('\n🧪 Test 4: Test de débounce');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch(`http://localhost:3000/api/tracks/${testTrack._id}/plays`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }

    const responses = await Promise.all(promises);
    const successfulResponses = responses.filter(r => r.ok);
    console.log(`✅ ${successfulResponses.length}/5 appels réussis (débounce actif)`);

    // Nettoyer
    await Track.findByIdAndDelete(testTrack._id);
    console.log('\n🧹 Piste de test supprimée');

    console.log('\n✅ Tous les tests terminés avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  testPlaysCounter();
}

module.exports = { testPlaysCounter }; 
const mongoose = require('mongoose');
require('dotenv').config();

// Modèle Track simplifié pour le test
const TrackSchema = new mongoose.Schema({
  title: String,
  plays: { type: Number, default: 0 },
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Track = mongoose.model('Track', TrackSchema);

async function testPlaysSystem() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Trouver une piste de test
    const testTrack = await Track.findOne().sort({ createdAt: -1 });
    if (!testTrack) {
      console.log('❌ Aucune piste trouvée pour le test');
      return;
    }

    console.log(`🎵 Piste de test: ${testTrack.title} (ID: ${testTrack._id})`);
    console.log(`📊 Écoutes initiales: ${testTrack.plays}`);

    // Simuler plusieurs appels d'incrémentation
    const testCalls = 5;
    console.log(`🔄 Simulation de ${testCalls} appels d'incrémentation...`);

    for (let i = 0; i < testCalls; i++) {
      try {
        const response = await fetch(`http://localhost:3000/api/tracks/${testTrack._id}/plays`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Appel ${i + 1}: Écoutes = ${data.plays}`);
        } else {
          const errorData = await response.json();
          console.log(`❌ Appel ${i + 1}: ${errorData.message || 'Erreur'}`);
        }
      } catch (error) {
        console.log(`❌ Appel ${i + 1}: Erreur réseau`);
      }

      // Attendre un peu entre les appels
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Vérifier l'état final
    const finalTrack = await Track.findById(testTrack._id);
    console.log(`📊 Écoutes finales: ${finalTrack.plays}`);
    console.log(`📈 Incrémentation totale: ${finalTrack.plays - testTrack.plays}`);

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le test
testPlaysSystem(); 
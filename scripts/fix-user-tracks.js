#!/usr/bin/env node

/**
 * Script pour corriger les tracks existantes qui ne sont pas dans le tableau tracks de l'utilisateur
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Modèles
const User = require('../models/User.js');
const Track = require('../models/Track.js');

async function fixUserTracks() {
  console.log('🔧 Correction des tracks utilisateur...\n');

  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer tous les utilisateurs
    const users = await User.find({});
    console.log(`📊 ${users.length} utilisateurs trouvés`);

    let totalFixed = 0;

    for (const user of users) {
      console.log(`\n👤 Traitement de ${user.username}...`);
      
      // Récupérer toutes les tracks de cet utilisateur
      const userTracks = await Track.find({ artist: user._id });
      console.log(`   🎵 ${userTracks.length} tracks trouvées pour cet utilisateur`);
      
      // Vérifier quelles tracks ne sont pas dans le tableau tracks de l'utilisateur
      const missingTracks = userTracks.filter(track => 
        !user.tracks.includes(track._id)
      );
      
      if (missingTracks.length > 0) {
        console.log(`   ⚠️  ${missingTracks.length} tracks manquantes dans le tableau utilisateur`);
        
        // Ajouter les tracks manquantes
        const trackIds = missingTracks.map(track => track._id);
        await User.findByIdAndUpdate(user._id, {
          $addToSet: { tracks: { $each: trackIds } }
        });
        
        console.log(`   ✅ ${missingTracks.length} tracks ajoutées au tableau utilisateur`);
        totalFixed += missingTracks.length;
        
        // Afficher les détails des tracks ajoutées
        missingTracks.forEach(track => {
          console.log(`      - ${track.title} (${track._id})`);
        });
      } else {
        console.log(`   ✅ Toutes les tracks sont déjà dans le tableau utilisateur`);
      }
    }

    console.log(`\n🎉 Correction terminée !`);
    console.log(`📊 Total des tracks corrigées : ${totalFixed}`);

    // Vérification finale
    console.log('\n🔍 Vérification finale...');
    const finalUsers = await User.find({}).populate('tracks', 'title');
    
    for (const user of finalUsers) {
      const trackCount = await Track.countDocuments({ artist: user._id });
      console.log(`   ${user.username}: ${user.tracks.length} tracks dans le tableau / ${trackCount} tracks en base`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Déconnecté de MongoDB');
  }
}

// Exécuter le script
if (require.main === module) {
  fixUserTracks().catch(console.error);
}

module.exports = { fixUserTracks }; 
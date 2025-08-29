const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION AUTOMATIQUE DU PROFIL');
console.log('====================================');

const profileFilePath = path.join(__dirname, '..', 'app', 'profile', '[username]', 'page.tsx');

async function fixProfileIssues() {
  try {
    console.log('\n📁 Lecture du fichier profil...');
    
    if (!fs.existsSync(profileFilePath)) {
      console.log('❌ Fichier profil non trouvé');
      return;
    }
    
    let content = fs.readFileSync(profileFilePath, 'utf8');
    console.log('✅ Fichier profil lu');
    
    let changesMade = 0;
    
    // 1. Corriger track.likes.length -> track.likes
    console.log('\n🔧 Correction 1: track.likes.length -> track.likes');
    const likesLengthRegex = /track\.likes\.length/g;
    if (likesLengthRegex.test(content)) {
      content = content.replace(likesLengthRegex, 'track.likes');
      changesMade++;
      console.log('   ✅ track.likes.length corrigé');
    } else {
      console.log('   ℹ️  Aucune occurrence de track.likes.length trouvée');
    }
    
    // 2. Corriger track.isFeatured -> track.is_featured
    console.log('\n🔧 Correction 2: track.isFeatured -> track.is_featured');
    const isFeaturedRegex = /track\.isFeatured/g;
    if (isFeaturedRegex.test(content)) {
      content = content.replace(isFeaturedRegex, 'track.is_featured');
      changesMade++;
      console.log('   ✅ track.isFeatured corrigé');
    } else {
      console.log('   ℹ️  Aucune occurrence de track.isFeatured trouvée');
    }
    
    // 3. Corriger track.coverUrl -> track.cover_url (si pas déjà fait)
    console.log('\n🔧 Correction 3: Vérification des covers');
    const coverUrlRegex = /track\.coverUrl(?!\s*\|\|)/g;
    if (coverUrlRegex.test(content)) {
      content = content.replace(coverUrlRegex, 'track.cover_url || track.coverUrl');
      changesMade++;
      console.log('   ✅ track.coverUrl corrigé');
    } else {
      console.log('   ℹ️  Covers déjà corrigés');
    }
    
    // 4. Corriger track.audioUrl -> track.audio_url (si pas déjà fait)
    console.log('\n🔧 Correction 4: Vérification des URLs audio');
    const audioUrlRegex = /track\.audioUrl(?!\s*\|\|)/g;
    if (audioUrlRegex.test(content)) {
      content = content.replace(audioUrlRegex, 'track.audio_url || track.audioUrl');
      changesMade++;
      console.log('   ✅ track.audioUrl corrigé');
    } else {
      console.log('   ℹ️  URLs audio déjà corrigées');
    }
    
    // 5. Corriger playlist.likes.length -> playlist.likes
    console.log('\n🔧 Correction 5: playlist.likes.length -> playlist.likes');
    const playlistLikesRegex = /playlist\.likes\.length/g;
    if (playlistLikesRegex.test(content)) {
      content = content.replace(playlistLikesRegex, 'playlist.likes');
      changesMade++;
      console.log('   ✅ playlist.likes.length corrigé');
    } else {
      console.log('   ℹ️  Aucune occurrence de playlist.likes.length trouvée');
    }
    
    // 6. Vérifier la cohérence des propriétés
    console.log('\n🔍 Vérification de la cohérence:');
    
    // Vérifier que les bonnes propriétés sont utilisées
    const hasCorrectProperties = content.includes('track.cover_url') && 
                                content.includes('track.audio_url') && 
                                content.includes('track.is_featured');
    
    if (hasCorrectProperties) {
      console.log('   ✅ Propriétés cohérentes avec l\'API');
    } else {
      console.log('   ⚠️  Certaines propriétés peuvent ne pas être cohérentes');
    }
    
    // Écrire les modifications
    if (changesMade > 0) {
      fs.writeFileSync(profileFilePath, content, 'utf8');
      console.log(`\n💾 ${changesMade} correction(s) appliquée(s) et sauvegardée(s)`);
    } else {
      console.log('\n✅ Aucune correction nécessaire - Le fichier est déjà correct');
    }
    
    console.log('\n🎉 CORRECTION TERMINÉE !');
    console.log('==========================');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
  }
}

// Exécuter la correction
fixProfileIssues().catch(console.error);

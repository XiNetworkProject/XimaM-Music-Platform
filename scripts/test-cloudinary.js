// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

const { v2: cloudinary } = require('cloudinary');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testCloudinary() {
  console.log('=== TEST CLOUDINARY CONFIGURATION ===');
  
  // Vérifier les variables d'environnement
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Présent' : '❌ Manquant');
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Présent' : '❌ Manquant');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Présent' : '❌ Manquant');
  
  // Tester la connexion Cloudinary
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Connexion Cloudinary réussie:', result);
  } catch (error) {
    console.error('❌ Erreur connexion Cloudinary:', error.message);
  }
  
  // Tester l'upload d'une image simple
  try {
    console.log('Test upload image...');
    const uploadResult = await cloudinary.uploader.upload(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      {
        folder: 'ximam/test',
        public_id: 'test-upload'
      }
    );
    console.log('✅ Upload test réussi:', uploadResult.secure_url);
    
    // Nettoyer le fichier de test
    await cloudinary.uploader.destroy(uploadResult.public_id);
    console.log('✅ Fichier de test supprimé');
  } catch (error) {
    console.error('❌ Erreur upload test:', error.message);
  }
  
  // Test spécifique pour le dossier ximam/avatars
  try {
    console.log('\nTest upload dans ximam/avatars...');
    const avatarUploadResult = await cloudinary.uploader.upload(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      {
        folder: 'ximam/avatars',
        public_id: 'test-avatar-upload'
      }
    );
    console.log('✅ Upload avatar test réussi:', avatarUploadResult.secure_url);
    
    // Nettoyer le fichier de test
    await cloudinary.uploader.destroy(avatarUploadResult.public_id);
    console.log('✅ Fichier avatar test supprimé');
  } catch (error) {
    console.error('❌ Erreur upload avatar test:', error.message);
    console.error('Détails erreur:', error);
  }
  
  console.log('=== FIN TEST CLOUDINARY ===');
}

testCloudinary().catch(console.error); 
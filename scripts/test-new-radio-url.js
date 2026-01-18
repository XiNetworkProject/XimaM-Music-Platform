const https = require('https');

async function testNewRadioUrl() {
  const newUrl = 'https://stream.mixx-party.fr/listen/mixx_party/radio.mp3';
  const metadataUrl = 'https://rocket.streamradio.fr/status-json.xsl';
  
  console.log('🔍 Test de la nouvelle URL de la radio Mixx Party...');
  console.log(`📻 URL de streaming: ${newUrl}`);
  console.log(`📊 URL des métadonnées: ${metadataUrl}`);
  
  // Test de l'URL de streaming
  console.log('\n🔗 Test de l\'URL de streaming...');
  try {
    const streamResponse = await fetch(newUrl, { method: 'HEAD' });
    console.log(`✅ URL de streaming accessible: ${streamResponse.status} ${streamResponse.statusText}`);
    
    if (streamResponse.headers.get('content-type')) {
      console.log(`📁 Type de contenu: ${streamResponse.headers.get('content-type')}`);
    }
  } catch (error) {
    console.log(`❌ Erreur URL de streaming: ${error.message}`);
  }
  
  // Test de l'URL des métadonnées
  console.log('\n🔗 Test de l\'URL des métadonnées...');
  try {
    const metadataResponse = await fetch(metadataUrl);
    console.log(`✅ URL des métadonnées accessible: ${metadataResponse.status} ${metadataResponse.statusText}`);
    
    if (metadataResponse.ok) {
      const data = await metadataResponse.text();
      console.log(`📊 Taille de la réponse: ${data.length} caractères`);
      
      // Essayer de parser le JSON
      try {
        const jsonData = JSON.parse(data);
        console.log('✅ Métadonnées JSON valides');
        if (jsonData.icestats && jsonData.icestats.source) {
          console.log(`🎵 Titre actuel: ${jsonData.icestats.source.title || 'N/A'}`);
          console.log(`👤 Artiste: ${jsonData.icestats.source.artist || 'N/A'}`);
          console.log(`👥 Auditeurs: ${jsonData.icestats.source.listeners || 'N/A'}`);
        }
      } catch (jsonError) {
        console.log('⚠️  Réponse reçue mais pas au format JSON attendu');
        console.log(`📝 Début de la réponse: ${data.substring(0, 200)}...`);
      }
    }
  } catch (error) {
    console.log(`❌ Erreur URL des métadonnées: ${error.message}`);
  }
  
  console.log('\n✨ Test terminé !');
}

testNewRadioUrl();

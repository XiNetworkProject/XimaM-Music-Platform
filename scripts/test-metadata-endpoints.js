async function testMetadataEndpoints() {
  const baseUrl = 'https://rocket.streamradio.fr';
  const streamPath = '/stream/mixxparty';
  
  const possibleEndpoints = [
    '/status-json.xsl',
    '/status.xsl',
    '/status.json',
    '/stats',
    '/admin/stats',
    '/admin/stats.json',
    '/admin/stats.xml',
    '/icecast-status',
    '/icecast-status.json',
    '/icecast-status.xml',
    '/stream/mixxparty/status',
    '/stream/mixxparty/status.json',
    '/stream/mixxparty/stats',
    '/stream/mixxparty/stats.json'
  ];
  
  console.log('🔍 Test des différents endpoints de métadonnées...');
  console.log(`📻 Base URL: ${baseUrl}`);
  console.log(`🎵 Stream: ${baseUrl}${streamPath}`);
  
  for (const endpoint of possibleEndpoints) {
    const fullUrl = baseUrl + endpoint;
    console.log(`\n🔗 Test: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, { 
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log(`   Content-Type: ${contentType || 'N/A'}`);
        
        if (contentType && contentType.includes('json')) {
          try {
            const data = await response.text();
            console.log(`   ✅ JSON valide (${data.length} caractères)`);
            
            // Essayer de parser
            const jsonData = JSON.parse(data);
            if (jsonData.icestats && jsonData.icestats.source) {
              console.log(`   🎵 Titre: ${jsonData.icestats.source.title || 'N/A'}`);
              console.log(`   👤 Artiste: ${jsonData.icestats.source.artist || 'N/A'}`);
            }
          } catch (e) {
            console.log(`   ⚠️  Réponse reçue mais JSON invalide`);
          }
        } else if (contentType && contentType.includes('xml')) {
          console.log(`   📄 XML reçu`);
        } else {
          console.log(`   📝 Autre format`);
        }
      } else if (response.status === 403) {
        console.log(`   🔒 Accès interdit - endpoint protégé`);
      } else if (response.status === 404) {
        console.log(`   ❌ Endpoint non trouvé`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }
  }
  
  console.log('\n✨ Test des endpoints terminé !');
}

testMetadataEndpoints();

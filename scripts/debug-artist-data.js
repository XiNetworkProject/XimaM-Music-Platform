const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugArtistData() {
  try {
    console.log('🔍 Débogage des données artistes et pistes...');
    
    // Test 1: Vérifier les profils existants
    console.log('\n📋 Test 1: Profils existants...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Erreur profils:', profilesError);
      return;
    }
    
    console.log('✅ Profils trouvés:', profiles.length);
    if (profiles && profiles.length > 0) {
      console.log('🔍 Colonnes disponibles:', Object.keys(profiles[0]));
      console.log('');
    }
    
    profiles.forEach(profile => {
      console.log(`  - ID: ${profile.id}`);
      console.log(`    Username: ${profile.username || 'N/A'}`);
      console.log(`    Name: ${profile.name || 'N/A'}`);
      console.log(`    Avatar: ${profile.avatar || 'N/A'}`);
      console.log(`    Artist: ${profile.is_artist || 'N/A'}`);
      console.log(`    Artist Name: ${profile.artist_name || 'N/A'}`);
      console.log('');
    });
    
    // Test 2: Vérifier les pistes existantes
    console.log('\n📋 Test 2: Pistes existantes...');
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, title, creator_id, genre, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (tracksError) {
      console.error('❌ Erreur pistes:', tracksError);
      return;
    }
    
    console.log('✅ Pistes trouvées:', tracks.length);
    tracks.forEach(track => {
      console.log(`  - ID: ${track.id}`);
      console.log(`    Title: ${track.title}`);
      console.log(`    Creator ID: ${track.creator_id}`);
      console.log(`    Genre: ${track.genre}`);
      console.log('');
    });
    
    // Test 3: Vérifier la liaison tracks -> profiles
    console.log('\n📋 Test 3: Liaison tracks -> profiles...');
    if (tracks && tracks.length > 0) {
      const creatorIds = Array.from(new Set(tracks.map(track => track.creator_id)));
      console.log('🔗 Creator IDs uniques:', creatorIds);
      
      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, username, name, avatar, is_artist, artist_name')
        .in('id', creatorIds);
      
      if (creatorsError) {
        console.error('❌ Erreur créateurs:', creatorsError);
        return;
      }
      
      console.log('✅ Créateurs trouvés:', creators.length);
      creators.forEach(creator => {
        console.log(`  - ID: ${creator.id}`);
        console.log(`    Username: ${creator.username}`);
        console.log(`    Name: ${creator.name}`);
        console.log(`    Artist: ${creator.is_artist}`);
        console.log(`    Artist Name: ${creator.artist_name}`);
        console.log('');
      });
      
      // Test 4: Simulation du formatage des pistes
      console.log('\n📋 Test 4: Simulation formatage pistes...');
      const creatorsMap = new Map(creators.map(creator => [creator.id, creator]));
      
      tracks.forEach(track => {
        const creator = creatorsMap.get(track.creator_id);
        console.log(`🎵 Piste: ${track.title}`);
        console.log(`  Creator ID: ${track.creator_id}`);
        console.log(`  Creator trouvé: ${creator ? 'OUI' : 'NON'}`);
        if (creator) {
          console.log(`  Nom: ${creator.name || creator.username || 'N/A'}`);
          console.log(`  Username: ${creator.username || 'N/A'}`);
          console.log(`  Artist Name: ${creator.artist_name || creator.name || creator.username || 'N/A'}`);
        } else {
          console.log(`  ❌ PROBLÈME: Creator non trouvé pour ID ${track.creator_id}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

debugArtistData();

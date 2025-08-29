require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseStructure() {
  try {
    console.log('🔍 Test de la structure de la base de données...\n');

    // 1. Vérifier la table profiles
    console.log('1. Table profiles:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);
    
    if (profilesError) {
      console.error('❌ Erreur profiles:', profilesError);
    } else {
      console.log(`✅ ${profiles.length} profils trouvés`);
      if (profiles.length > 0) {
        console.log('   Exemple de profil:', {
          id: profiles[0].id,
          username: profiles[0].username,
          email: profiles[0].email
        });
      }
    }

    // 2. Vérifier la table tracks
    console.log('\n2. Table tracks:');
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .limit(3);
    
    if (tracksError) {
      console.error('❌ Erreur tracks:', tracksError);
    } else {
      console.log(`✅ ${tracks.length} tracks trouvés`);
      if (tracks.length > 0) {
        console.log('   Exemple de track:', {
          id: tracks[0].id,
          title: tracks[0].title,
          creator_id: tracks[0].creator_id,
          artist_id: tracks[0].artist_id // Vérifier si cette colonne existe encore
        });
      }
    }

    // 3. Tester la relation tracks -> profiles
    console.log('\n3. Relation tracks -> profiles:');
    const { data: tracksWithProfiles, error: relationError } = await supabase
      .from('tracks')
      .select(`
        *,
        profiles!tracks_creator_id_fkey (
          id,
          username,
          name,
          avatar
        )
      `)
      .limit(3);
    
    if (relationError) {
      console.error('❌ Erreur relation tracks->profiles:', relationError);
    } else {
      console.log(`✅ ${tracksWithProfiles.length} tracks avec profils récupérés`);
      if (tracksWithProfiles.length > 0) {
        console.log('   Exemple de relation:', {
          trackId: tracksWithProfiles[0].id,
          trackTitle: tracksWithProfiles[0].title,
          creatorId: tracksWithProfiles[0].creator_id,
          profile: tracksWithProfiles[0].profiles
        });
      }
    }

    // 4. Vérifier les contraintes de clés étrangères
    console.log('\n4. Vérification des contraintes:');
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_foreign_keys');
    
    if (constraintsError) {
      console.log('⚠️ Impossible de récupérer les contraintes (fonction RPC non disponible)');
    } else {
      console.log('✅ Contraintes récupérées:', constraints);
    }

    // 5. Vérifier la structure des colonnes
    console.log('\n5. Structure des colonnes tracks:');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_info', { table_name: 'tracks' });
    
    if (columnsError) {
      console.log('⚠️ Impossible de récupérer la structure des colonnes (fonction RPC non disponible)');
    } else {
      console.log('✅ Structure des colonnes:', columns);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testDatabaseStructure();

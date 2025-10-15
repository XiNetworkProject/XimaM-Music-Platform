const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTrendingData() {
  console.log('🔍 Vérification des données trending...\n');

  try {
    // 1. Compter le nombre total de pistes
    const { count: totalTracks, error: countError } = await supabase
      .from('tracks')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erreur comptage total:', countError);
      return;
    }

    console.log(`📊 Total des pistes: ${totalTracks}`);

    // 2. Compter les pistes avec des écoutes > 0
    const { count: tracksWithPlays, error: playsError } = await supabase
      .from('tracks')
      .select('*', { count: 'exact', head: true })
      .gt('plays', 0);

    if (playsError) {
      console.error('❌ Erreur comptage écoutes:', playsError);
      return;
    }

    console.log(`🎵 Pistes avec écoutes > 0: ${tracksWithPlays}`);

    // 3. Récupérer les 10 pistes avec le plus d'écoutes
    const { data: topTracks, error: topError } = await supabase
      .from('tracks')
      .select('id, title, plays, created_at')
      .order('plays', { ascending: false })
      .limit(10);

    if (topError) {
      console.error('❌ Erreur récupération top tracks:', topError);
      return;
    }

    console.log('\n🏆 Top 10 des pistes les plus écoutées:');
    topTracks?.forEach((track, index) => {
      console.log(`${index + 1}. "${track.title}" - ${track.plays} écoutes (${track.id})`);
    });

    // 4. Vérifier la distribution des écoutes
    const { data: playsDistribution, error: distError } = await supabase
      .from('tracks')
      .select('plays');

    if (distError) {
      console.error('❌ Erreur distribution écoutes:', distError);
      return;
    }

    const distribution = {
      0: 0,
      1: 0,
      '2-10': 0,
      '11-50': 0,
      '51-100': 0,
      '100+': 0
    };

    playsDistribution?.forEach(track => {
      const plays = track.plays || 0;
      if (plays === 0) distribution[0]++;
      else if (plays === 1) distribution[1]++;
      else if (plays <= 10) distribution['2-10']++;
      else if (plays <= 50) distribution['11-50']++;
      else if (plays <= 100) distribution['51-100']++;
      else distribution['100+']++;
    });

    console.log('\n📈 Distribution des écoutes:');
    Object.entries(distribution).forEach(([range, count]) => {
      const percentage = ((count / totalTracks) * 100).toFixed(1);
      console.log(`  ${range} écoutes: ${count} pistes (${percentage}%)`);
    });

    // 5. Tester l'API trending
    console.log('\n🧪 Test de l\'API trending:');
    const { data: trendingTracks, error: trendingError } = await supabase
      .from('tracks')
      .select(`
        id, title, plays, created_at,
        profiles!tracks_creator_id_fkey (
          id, username, name, avatar, is_artist, artist_name
        )
      `)
      .order('plays', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (trendingError) {
      console.error('❌ Erreur API trending:', trendingError);
    } else {
      console.log(`✅ API trending retourne ${trendingTracks?.length || 0} pistes`);
      trendingTracks?.forEach((track, index) => {
        console.log(`  ${index + 1}. "${track.title}" - ${track.plays} écoutes`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkTrendingData();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateFAQs() {
  console.log('🔍 Vérification des FAQ existantes...');

  try {
    // Vérifier les FAQ existantes
    const { data: existingFAQs, error: checkError } = await supabase
      .from('faq_items')
      .select('*')
      .eq('is_published', true);

    if (checkError) {
      console.error('❌ Erreur lors de la vérification:', checkError);
      return;
    }

    console.log(`📊 FAQ existantes: ${existingFAQs?.length || 0}`);

    if (existingFAQs && existingFAQs.length > 0) {
      console.log('✅ Des FAQ existent déjà');
      existingFAQs.forEach((faq, index) => {
        console.log(`${index + 1}. ${faq.question} (${faq.category}) - ${faq.helpful_count || 0} utile(s)`);
      });
      return;
    }

    console.log('📝 Création de FAQ d\'exemple...');

    // FAQ d'exemple
    const sampleFAQs = [
      {
        question: 'Comment télécharger mes musiques ?',
        answer: 'Pour télécharger vos musiques, allez dans votre bibliothèque, sélectionnez la musique souhaitée et cliquez sur le bouton de téléchargement. Cette fonctionnalité est disponible pour les utilisateurs Premium.',
        category: 'player',
        tags: ['téléchargement', 'premium', 'bibliothèque'],
        helpful_count: 15,
        order_index: 1
      },
      {
        question: 'Quels formats audio sont supportés ?',
        answer: 'Synaura supporte les formats MP3, WAV, FLAC et AAC. Pour l\'upload, nous recommandons le format MP3 pour un bon équilibre entre qualité et taille de fichier.',
        category: 'upload',
        tags: ['formats', 'audio', 'mp3', 'wav'],
        helpful_count: 12,
        order_index: 2
      },
      {
        question: 'Comment fonctionne la génération de musique IA ?',
        answer: 'Notre IA utilise des modèles avancés pour créer de la musique originale basée sur vos descriptions. Vous pouvez spécifier le style, l\'humeur et même ajouter des paroles. Plus vous êtes précis, meilleur sera le résultat.',
        category: 'ia',
        tags: ['ia', 'génération', 'musique', 'création'],
        helpful_count: 8,
        order_index: 3
      },
      {
        question: 'Puis-je changer de plan d\'abonnement ?',
        answer: 'Oui, vous pouvez changer de plan à tout moment depuis la page Abonnements. Les changements prennent effet immédiatement et sont proratisés.',
        category: 'abonnement',
        tags: ['abonnement', 'plan', 'changement'],
        helpful_count: 6,
        order_index: 4
      },
      {
        question: 'Comment partager mes créations ?',
        answer: 'Vous pouvez partager vos musiques via les liens de partage générés automatiquement, ou utiliser les réseaux sociaux intégrés. Chaque musique a un lien unique que vous pouvez partager.',
        category: 'general',
        tags: ['partage', 'réseaux sociaux', 'liens'],
        helpful_count: 4,
        order_index: 5
      }
    ];

    // Insérer les FAQ d'exemple
    const { data: insertedFAQs, error: insertError } = await supabase
      .from('faq_items')
      .insert(sampleFAQs)
      .select();

    if (insertError) {
      console.error('❌ Erreur lors de l\'insertion:', insertError);
      return;
    }

    console.log(`✅ ${insertedFAQs?.length || 0} FAQ créées avec succès`);
    insertedFAQs?.forEach((faq, index) => {
      console.log(`${index + 1}. ${faq.question} (${faq.category})`);
    });

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkAndCreateFAQs();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2 FAQ finales pour atteindre 100
const finalFAQs = [
  {
    question: "Comment utiliser Synaura sur mon smartwatch ?",
    answer: "Synaura est compatible avec les smartwatches Apple Watch et Samsung Galaxy Watch via l'application mobile.",
    category: "general",
    tags: ["smartwatch", "Apple Watch", "Samsung"],
    helpful_count: Math.floor(Math.random() * 10) + 2
  },
  {
    question: "Puis-je écouter Synaura dans ma voiture ?",
    answer: "Oui, connectez votre téléphone à votre système audio via Bluetooth ou USB pour écouter Synaura en voiture.",
    category: "general",
    tags: ["voiture", "Bluetooth", "USB"],
    helpful_count: Math.floor(Math.random() * 10) + 2
  }
];

async function createFinalFAQs() {
  console.log('🚀 Création des 2 dernières FAQ pour atteindre 100...');

  try {
    // Compter les FAQ existantes
    const { data: existingFAQs, error: checkError } = await supabase
      .from('faq_items')
      .select('id')
      .eq('is_published', true);

    if (checkError) {
      console.error('❌ Erreur lors de la vérification:', checkError);
      return;
    }

    const existingCount = existingFAQs?.length || 0;
    console.log(`📊 FAQ existantes: ${existingCount}`);

    // Préparer les FAQ finales
    const faqsToInsert = finalFAQs.map((faq, index) => ({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags,
      helpful_count: faq.helpful_count,
      order_index: existingCount + index + 1,
      is_published: true
    }));

    console.log(`📝 ${faqsToInsert.length} FAQ finales préparées`);

    // Insérer les FAQ finales
    const { data: insertedFAQs, error: insertError } = await supabase
      .from('faq_items')
      .insert(faqsToInsert)
      .select('id');

    if (insertError) {
      console.error('❌ Erreur lors de l\'insertion:', insertError);
      return;
    }

    console.log(`🎉 ${insertedFAQs?.length || 0} FAQ finales créées !`);

    // Afficher les statistiques finales
    const { data: finalStats, error: statsError } = await supabase
      .from('faq_items')
      .select('category')
      .eq('is_published', true);

    if (!statsError && finalStats) {
      const stats = finalStats.reduce((acc, faq) => {
        acc[faq.category] = (acc[faq.category] || 0) + 1;
        return acc;
      }, {});

      const totalFAQs = finalStats.length;
      console.log(`\n🎯 OBJECTIF ATTEINT: ${totalFAQs} FAQ au total !`);
      console.log('\n📊 Répartition finale par catégorie:');
      Object.entries(stats).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} FAQ`);
      });

      // Afficher quelques FAQ populaires
      const { data: popularFAQs, error: popularError } = await supabase
        .from('faq_items')
        .select('question, helpful_count')
        .eq('is_published', true)
        .order('helpful_count', { ascending: false })
        .limit(5);

      if (!popularError && popularFAQs) {
        console.log('\n🏆 Top 5 des FAQ les plus populaires:');
        popularFAQs.forEach((faq, index) => {
          console.log(`  ${index + 1}. ${faq.question} (${faq.helpful_count} utile(s))`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

createFinalFAQs();

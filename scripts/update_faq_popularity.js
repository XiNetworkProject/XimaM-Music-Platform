const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateFAQPopularity() {
  console.log('📊 Mise à jour de la popularité des FAQ...');

  try {
    // Récupérer toutes les FAQ
    const { data: faqs, error: fetchError } = await supabase
      .from('faq_items')
      .select('*')
      .eq('is_published', true);

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des FAQ:', fetchError);
      return;
    }

    if (!faqs || faqs.length === 0) {
      console.log('ℹ️ Aucune FAQ trouvée');
      return;
    }

    console.log(`📝 ${faqs.length} FAQ trouvées`);

    // Mettre à jour les compteurs de popularité
    const updates = faqs.map((faq, index) => {
      // Assigner des compteurs réalistes basés sur l'index
      const helpfulCount = Math.max(0, 15 - index * 2); // De 15 à 1
      
      return supabase
        .from('faq_items')
        .update({ helpful_count: helpfulCount })
        .eq('id', faq.id);
    });

    // Exécuter toutes les mises à jour
    const results = await Promise.all(updates);
    
    // Vérifier les erreurs
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('❌ Erreurs lors des mises à jour:', errors);
      return;
    }

    console.log('✅ Popularité des FAQ mise à jour');

    // Afficher les FAQ mises à jour
    const { data: updatedFAQs, error: updatedError } = await supabase
      .from('faq_items')
      .select('question, category, helpful_count')
      .eq('is_published', true)
      .order('helpful_count', { ascending: false });

    if (!updatedError && updatedFAQs) {
      console.log('\n📊 FAQ par popularité:');
      updatedFAQs.forEach((faq, index) => {
        console.log(`${index + 1}. ${faq.question} (${faq.category}) - ${faq.helpful_count} utile(s)`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

updateFAQPopularity();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addLyricsFAQs() {
  try {
    console.log('🎵 Ajout des FAQ sur les paroles...');
    
    const lyricsFAQs = [
      {
        question: "Comment ajouter des paroles à ma musique lors de l'upload ?",
        answer: "Lors de l'upload de votre musique, dans l'étape 2 'Informations de la piste', vous trouverez un champ 'Paroles (optionnel)'. Vous pouvez y saisir les paroles de votre musique. Ce champ est complètement optionnel et peut être rempli plus tard.",
        category: "upload",
        tags: ["paroles", "upload", "musique", "texte"],
        order_index: 1
      },
      {
        question: "Quels formats de paroles sont supportés dans le player ?",
        answer: "Le player supporte deux formats de paroles :\n\n1. **Paroles LRC avec timestamps** : Format `[mm:ss.ms]` pour une synchronisation précise\n   Exemple : `[00:12.50]Première ligne des paroles`\n\n2. **Paroles simples** : Texte brut sans timestamps, synchronisé automatiquement sur la durée de la musique",
        category: "player",
        tags: ["paroles", "player", "synchronisation", "format", "LRC"],
        order_index: 2
      },
      {
        question: "Comment fonctionne la synchronisation des paroles dans le TikTokPlayer ?",
        answer: "Le TikTokPlayer synchronise automatiquement les paroles avec la musique :\n\n- **Paroles LRC** : Synchronisation précise avec les timestamps `[mm:ss.ms]`\n- **Paroles simples** : Distribution automatique sur la durée totale de la musique\n- **Affichage desktop** : Panneau latéral avec scroll automatique vers la ligne active\n- **Affichage mobile** : Bottom sheet accessible via le bouton 'Paroles'",
        category: "player",
        tags: ["paroles", "synchronisation", "tiktok-player", "desktop", "mobile"],
        order_index: 3
      },
      {
        question: "Puis-je modifier les paroles après l'upload ?",
        answer: "Actuellement, les paroles sont ajoutées uniquement lors de l'upload. Cette fonctionnalité sera disponible dans une future mise à jour pour permettre la modification des paroles après publication.",
        category: "upload",
        tags: ["paroles", "modification", "édition", "upload"],
        order_index: 4
      },
      {
        question: "Les paroles sont-elles visibles par tous les utilisateurs ?",
        answer: "Oui, les paroles sont publiques et visibles par tous les utilisateurs qui écoutent votre musique dans le TikTokPlayer. Elles apparaissent automatiquement si elles ont été ajoutées lors de l'upload.",
        category: "general",
        tags: ["paroles", "visibilité", "public", "partage"],
        order_index: 5
      },
      {
        question: "Comment créer des paroles LRC avec timestamps ?",
        answer: "Pour créer des paroles LRC synchronisées :\n\n1. **Format** : `[mm:ss.ms]` où `mm` = minutes, `ss` = secondes, `ms` = millisecondes\n2. **Exemple** : `[00:12.50]Première ligne`\n3. **Outils recommandés** : LRC Editor, ou éditeurs de texte avec calculs manuels\n4. **Précision** : Les timestamps doivent correspondre exactement aux moments dans la musique",
        category: "technique",
        tags: ["paroles", "LRC", "timestamps", "synchronisation", "format"],
        order_index: 6
      },
      {
        question: "Pourquoi mes paroles ne s'affichent pas dans le player ?",
        answer: "Si vos paroles ne s'affichent pas, vérifiez :\n\n1. **Ajout lors de l'upload** : Les paroles ont été saisies dans l'étape 2\n2. **Format correct** : Paroles LRC ou texte simple valide\n3. **Actualisation** : Rechargez la page après l'upload\n4. **Support** : Le TikTokPlayer doit être ouvert pour voir les paroles\n\nSi le problème persiste, contactez le support.",
        category: "technique",
        tags: ["paroles", "problème", "affichage", "dépannage", "support"],
        order_index: 7
      },
      {
        question: "Y a-t-il une limite de caractères pour les paroles ?",
        answer: "Il n'y a pas de limite stricte de caractères pour les paroles, mais nous recommandons :\n\n- **Paroles simples** : Maximum 2000 caractères pour une bonne lisibilité\n- **Paroles LRC** : Maximum 5000 caractères pour éviter les problèmes de performance\n- **Optimisation** : Des paroles trop longues peuvent ralentir le chargement du player",
        category: "technique",
        tags: ["paroles", "limite", "caractères", "performance", "optimisation"],
        order_index: 8
      }
    ];

    // Vérifier si les FAQ existent déjà
    for (const faq of lyricsFAQs) {
      const { data: existing } = await supabase
        .from('faq_items')
        .select('id')
        .eq('question', faq.question)
        .single();

      if (existing) {
        console.log(`⚠️ FAQ déjà existante : "${faq.question}"`);
        continue;
      }

      // Insérer la FAQ
      const { data, error } = await supabase
        .from('faq_items')
        .insert(faq)
        .select()
        .single();

      if (error) {
        console.error(`❌ Erreur lors de l'ajout de la FAQ "${faq.question}":`, error);
      } else {
        console.log(`✅ FAQ ajoutée : "${faq.question}"`);
      }
    }

    console.log('🎉 FAQ sur les paroles ajoutées avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le script
addLyricsFAQs().then(() => {
  console.log('🎵 Script terminé');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

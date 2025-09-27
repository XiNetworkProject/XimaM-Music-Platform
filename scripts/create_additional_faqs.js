const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// FAQ supplémentaires par catégories
const additionalFAQs = {
  player: [
    {
      question: "Comment créer une playlist collaborative ?",
      answer: "Créez une playlist et invitez d'autres utilisateurs via le bouton 'Collaborer' dans les paramètres de la playlist.",
      tags: ["collaborative", "invitation", "partage"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment synchroniser mes playlists entre appareils ?",
      answer: "Vos playlists sont automatiquement synchronisées quand vous vous connectez avec le même compte.",
      tags: ["synchronisation", "appareils", "compte"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment utiliser les raccourcis clavier ?",
      answer: "Espace = Play/Pause, Flèches = Précédent/Suivant, Ctrl+↑/↓ = Volume, M = Muet.",
      tags: ["raccourcis", "clavier", "contrôles"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment voir l'historique de lecture ?",
      answer: "Allez dans votre bibliothèque et cliquez sur 'Historique' pour voir vos dernières écoutes.",
      tags: ["historique", "écoutes", "récent"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment activer le mode hors ligne ?",
      answer: "Téléchargez vos musiques préférées pour les écouter sans connexion internet.",
      tags: ["hors ligne", "téléchargement", "offline"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    }
  ],

  upload: [
    {
      question: "Comment optimiser la qualité audio avant upload ?",
      answer: "Utilisez un convertisseur audio pour normaliser le volume et optimiser le bitrate à 320 kbps.",
      tags: ["optimisation", "qualité", "convertisseur"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Puis-je uploader des podcasts ?",
      answer: "Oui, Synaura accepte les podcasts au format MP3. Assurez-vous d'avoir les droits nécessaires.",
      tags: ["podcasts", "droits", "format"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment gérer les métadonnées de mes fichiers ?",
      answer: "Utilisez des outils comme MP3Tag pour nettoyer et organiser les métadonnées avant l'upload.",
      tags: ["métadonnées", "MP3Tag", "organisation"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Que faire si mon fichier est trop volumineux ?",
      answer: "Compressez votre fichier ou passez à un plan supérieur avec des limites plus élevées.",
      tags: ["taille", "compression", "plan"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment uploader des albums complets ?",
      answer: "Uploadez chaque piste individuellement et utilisez les mêmes tags pour les regrouper.",
      tags: ["album", "pistes", "regroupement"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    }
  ],

  ia: [
    {
      question: "Comment créer de la musique pour un projet spécifique ?",
      answer: "Utilisez des prompts détaillés incluant le genre, l'humeur, la durée et le contexte d'usage.",
      tags: ["projet", "prompts", "détails"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Puis-je générer de la musique pour des vidéos ?",
      answer: "Oui, générez de la musique instrumentale et ajustez la durée selon vos besoins vidéo.",
      tags: ["vidéo", "instrumental", "durée"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment améliorer la qualité des générations ?",
      answer: "Utilisez des références musicales précises, décrivez les instruments et l'arrangement souhaité.",
      tags: ["qualité", "références", "instruments"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Puis-je générer des jingles publicitaires ?",
      answer: "Oui, spécifiez 'jingles', 'court', 'accrocheur' dans votre prompt pour des créations publicitaires.",
      tags: ["jingles", "publicité", "court"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment générer de la musique de relaxation ?",
      answer: "Utilisez des termes comme 'ambient', 'calme', 'méditation', 'nature' dans vos prompts.",
      tags: ["relaxation", "ambient", "méditation"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    }
  ],

  abonnement: [
    {
      question: "Y a-t-il des réductions étudiantes ?",
      answer: "Oui, nous offrons 50% de réduction pour les étudiants avec une carte étudiante valide.",
      tags: ["étudiants", "réduction", "carte"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Puis-je suspendre mon abonnement temporairement ?",
      answer: "Oui, vous pouvez suspendre jusqu'à 3 mois par an sans perdre vos données.",
      tags: ["suspension", "temporaire", "données"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment obtenir une facture ?",
      answer: "Toutes vos factures sont disponibles dans la section Facturation de votre compte.",
      tags: ["facture", "facturation", "compte"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Que se passe-t-il si mon paiement échoue ?",
      answer: "Vous avez 7 jours pour mettre à jour votre moyen de paiement avant la suspension du service.",
      tags: ["paiement", "échec", "suspension"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Puis-je avoir plusieurs comptes avec un seul abonnement ?",
      answer: "Non, chaque compte nécessite son propre abonnement pour des raisons de sécurité.",
      tags: ["comptes", "multiple", "sécurité"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    }
  ],

  technique: [
    {
      question: "Comment résoudre les problèmes de synchronisation ?",
      answer: "Déconnectez-vous, videz le cache du navigateur et reconnectez-vous.",
      tags: ["synchronisation", "cache", "déconnexion"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "L'application ne fonctionne pas sur Safari",
      answer: "Assurez-vous d'avoir Safari 14+ et activez JavaScript. Essayez Chrome ou Firefox en alternative.",
      tags: ["Safari", "JavaScript", "navigateur"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment activer le mode développeur ?",
      answer: "Appuyez sur Ctrl+Shift+D pour accéder aux outils de développement et au mode debug.",
      tags: ["développeur", "debug", "outils"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Mes téléchargements sont corrompus",
      answer: "Vérifiez votre connexion internet et réessayez. Contactez le support si le problème persiste.",
      tags: ["téléchargements", "corruption", "connexion"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment désactiver les animations ?",
      answer: "Allez dans Paramètres > Accessibilité et désactivez 'Animations réduites'.",
      tags: ["animations", "accessibilité", "performance"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    }
  ],

  general: [
    {
      question: "Comment gérer ma confidentialité ?",
      answer: "Allez dans Paramètres > Confidentialité pour contrôler qui peut voir vos activités.",
      tags: ["confidentialité", "paramètres", "visibilité"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment activer l'authentification à deux facteurs ?",
      answer: "Allez dans Paramètres > Sécurité et activez l'authentification 2FA avec votre téléphone.",
      tags: ["2FA", "sécurité", "authentification"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment importer mes playlists depuis Spotify ?",
      answer: "Utilisez notre outil d'importation dans Paramètres > Importation pour migrer vos playlists.",
      tags: ["importation", "Spotify", "migration"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment participer au programme beta ?",
      answer: "Inscrivez-vous sur notre page beta pour tester les nouvelles fonctionnalités en avant-première.",
      tags: ["beta", "test", "nouvelles fonctionnalités"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    },
    {
      question: "Comment devenir ambassadeur Synaura ?",
      answer: "Partagez Synaura sur les réseaux sociaux et contactez-nous pour rejoindre notre programme d'ambassadeurs.",
      tags: ["ambassadeur", "partage", "réseaux sociaux"],
      helpful_count: Math.floor(Math.random() * 15) + 3
    }
  ]
};

async function createAdditionalFAQs() {
  console.log('🚀 Création de FAQ supplémentaires...');

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

    // Préparer toutes les FAQ supplémentaires
    const allFAQs = [];
    let orderIndex = existingCount + 1;

    Object.entries(additionalFAQs).forEach(([category, faqs]) => {
      faqs.forEach(faq => {
        allFAQs.push({
          question: faq.question,
          answer: faq.answer,
          category,
          tags: faq.tags,
          helpful_count: faq.helpful_count,
          order_index: orderIndex++,
          is_published: true
        });
      });
    });

    console.log(`📝 ${allFAQs.length} FAQ supplémentaires préparées`);

    // Insérer toutes les FAQ
    const { data: insertedFAQs, error: insertError } = await supabase
      .from('faq_items')
      .insert(allFAQs)
      .select('id');

    if (insertError) {
      console.error('❌ Erreur lors de l\'insertion:', insertError);
      return;
    }

    console.log(`🎉 ${insertedFAQs?.length || 0} FAQ supplémentaires créées !`);

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
      console.log(`\n📊 Statistiques finales (${totalFAQs} FAQ au total):`);
      Object.entries(stats).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} FAQ`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

createAdditionalFAQs();

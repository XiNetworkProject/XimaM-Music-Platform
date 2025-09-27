const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// FAQ par catégories
const faqCategories = {
  player: [
    {
      question: "Comment mettre en pause une musique ?",
      answer: "Cliquez sur le bouton pause au centre du player ou utilisez la barre d'espace de votre clavier.",
      tags: ["pause", "lecture", "clavier"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment passer à la musique suivante ?",
      answer: "Utilisez le bouton suivant (flèche droite) dans le player ou la flèche droite de votre clavier.",
      tags: ["suivant", "navigation", "clavier"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment régler le volume ?",
      answer: "Utilisez le slider de volume dans le player ou les touches de volume de votre système.",
      tags: ["volume", "son", "réglage"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment activer le mode répétition ?",
      answer: "Cliquez sur le bouton de répétition dans le player pour répéter la musique actuelle ou toute la playlist.",
      tags: ["répétition", "playlist", "mode"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment activer le mode aléatoire ?",
      answer: "Cliquez sur le bouton shuffle dans le player pour mélanger l'ordre de lecture.",
      tags: ["aléatoire", "shuffle", "mélange"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment voir les paroles d'une chanson ?",
      answer: "Les paroles s'affichent automatiquement dans le player si elles sont disponibles pour la musique.",
      tags: ["paroles", "lyrics", "affichage"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment ajouter une musique aux favoris ?",
      answer: "Cliquez sur le cœur dans le player ou utilisez le menu contextuel de la musique.",
      tags: ["favoris", "cœur", "sauvegarde"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment créer une playlist ?",
      answer: "Allez dans votre bibliothèque, cliquez sur 'Nouvelle playlist' et donnez-lui un nom.",
      tags: ["playlist", "création", "bibliothèque"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment partager une musique ?",
      answer: "Utilisez le bouton de partage dans le player ou le menu contextuel pour obtenir un lien.",
      tags: ["partage", "lien", "réseaux sociaux"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment télécharger une musique ?",
      answer: "Le téléchargement est disponible pour les abonnements Pro et Enterprise via le menu du player.",
      tags: ["téléchargement", "pro", "enterprise"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    }
  ],
  
  upload: [
    {
      question: "Quels formats audio puis-je uploader ?",
      answer: "Synaura accepte les formats MP3, WAV, FLAC, M4A et AAC jusqu'à 500 MB selon votre plan.",
      tags: ["formats", "upload", "taille"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment uploader une musique ?",
      answer: "Allez dans la section Upload, sélectionnez votre fichier audio et remplissez les informations.",
      tags: ["upload", "fichier", "informations"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Puis-je uploader plusieurs musiques en même temps ?",
      answer: "Actuellement, l'upload se fait une musique à la fois pour garantir la qualité.",
      tags: ["multiple", "simultané", "qualité"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Que faire si mon upload échoue ?",
      answer: "Vérifiez la taille du fichier, votre connexion internet et réessayez. Contactez le support si le problème persiste.",
      tags: ["échec", "connexion", "support"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment ajouter une pochette d'album ?",
      answer: "Lors de l'upload, vous pouvez ajouter une image de couverture. Formats acceptés : JPG, PNG, WebP.",
      tags: ["pochette", "image", "couverture"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Mes musiques sont-elles protégées par des droits d'auteur ?",
      answer: "Synaura vérifie automatiquement les droits d'auteur via AudD pour éviter les violations.",
      tags: ["droits d'auteur", "protection", "AudD"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment supprimer une musique uploadée ?",
      answer: "Allez dans votre bibliothèque, sélectionnez la musique et utilisez l'option 'Supprimer'.",
      tags: ["supprimer", "bibliothèque", "gestion"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Puis-je modifier les informations d'une musique ?",
      answer: "Oui, vous pouvez modifier le titre, l'artiste et les tags depuis votre bibliothèque.",
      tags: ["modifier", "informations", "métadonnées"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Quelle est la qualité audio recommandée ?",
      answer: "Nous recommandons 320 kbps MP3 ou FLAC pour une qualité optimale.",
      tags: ["qualité", "bitrate", "recommandation"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment organiser mes musiques par genre ?",
      answer: "Utilisez les tags lors de l'upload ou modifiez-les ensuite pour organiser vos musiques.",
      tags: ["genre", "tags", "organisation"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    }
  ],

  ia: [
    {
      question: "Comment générer de la musique avec l'IA ?",
      answer: "Allez dans le Générateur IA, décrivez votre musique souhaitée et cliquez sur 'Générer'.",
      tags: ["génération", "IA", "description"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Quels modèles IA sont disponibles ?",
      answer: "Suno V4.5 (gratuit), V4.5+ (Starter/Pro) et V5 Beta (Pro/Enterprise).",
      tags: ["modèles", "Suno", "versions"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Combien de temps prend une génération ?",
      answer: "Entre 30 secondes et 2 minutes selon la complexité et le modèle utilisé.",
      tags: ["temps", "durée", "génération"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Puis-je générer de la musique instrumentale ?",
      answer: "Oui, cochez l'option 'Instrumental' dans le générateur pour créer de la musique sans voix.",
      tags: ["instrumental", "sans voix", "option"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment améliorer mes prompts de génération ?",
      answer: "Soyez spécifique sur le style, l'humeur, les instruments et ajoutez des références musicales.",
      tags: ["prompts", "amélioration", "conseils"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Puis-je générer des paroles personnalisées ?",
      answer: "Oui, vous pouvez inclure des paroles dans votre prompt ou laisser l'IA les créer.",
      tags: ["paroles", "personnalisées", "création"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Où trouver mes musiques générées ?",
      answer: "Elles apparaissent dans votre Bibliothèque IA et sont automatiquement sauvegardées.",
      tags: ["bibliothèque IA", "sauvegarde", "localisation"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Puis-je utiliser mes générations commercialement ?",
      answer: "Oui, vous êtes propriétaire des musiques générées et pouvez les utiliser librement.",
      tags: ["commercial", "droits", "propriété"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment fonctionne le mode Custom ?",
      answer: "Le mode Custom vous permet de régler des paramètres avancés comme le style, la bizarrerie et l'influence.",
      tags: ["custom", "paramètres", "avancé"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Que sont les tags d'inspiration ?",
      answer: "Les tags suggérés par l'IA basés sur vos générations précédentes pour vous aider à créer.",
      tags: ["tags", "inspiration", "suggestions"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    }
  ],

  abonnement: [
    {
      question: "Quels sont les différents plans d'abonnement ?",
      answer: "Gratuit, Starter (5€/mois), Pro (15€/mois) et Enterprise (30€/mois) avec des fonctionnalités différentes.",
      tags: ["plans", "prix", "fonctionnalités"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment changer de plan ?",
      answer: "Allez dans Abonnements, sélectionnez votre nouveau plan et suivez les instructions de paiement.",
      tags: ["changement", "upgrade", "paiement"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Puis-je annuler mon abonnement ?",
      answer: "Oui, vous pouvez annuler à tout moment depuis la page Abonnements. L'accès reste jusqu'à la fin de la période.",
      tags: ["annulation", "résiliation", "accès"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Que se passe-t-il si je downgrade ?",
      answer: "Vos limites seront ajustées au prochain cycle de facturation. Vos données restent intactes.",
      tags: ["downgrade", "limites", "données"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment fonctionne la période d'essai ?",
      answer: "Les nouveaux utilisateurs ont 7 jours d'essai gratuit pour tester toutes les fonctionnalités Pro.",
      tags: ["essai", "gratuit", "nouveaux"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Puis-je payer annuellement ?",
      answer: "Oui, les paiements annuels offrent 2 mois gratuits par rapport au paiement mensuel.",
      tags: ["annuel", "réduction", "économies"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Quels moyens de paiement sont acceptés ?",
      answer: "Carte bancaire, PayPal, Apple Pay et Google Pay via Stripe.",
      tags: ["paiement", "cartes", "PayPal"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment obtenir un remboursement ?",
      answer: "Les remboursements sont possibles dans les 14 jours suivant l'achat. Contactez le support.",
      tags: ["remboursement", "14 jours", "support"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Y a-t-il des frais cachés ?",
      answer: "Non, le prix affiché est le prix final. Aucun frais supplémentaire.",
      tags: ["frais", "transparence", "prix"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Puis-je partager mon abonnement ?",
      answer: "Non, chaque compte nécessite son propre abonnement pour des raisons de sécurité.",
      tags: ["partage", "sécurité", "compte"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    }
  ],

  technique: [
    {
      question: "Le player ne fonctionne pas sur mobile",
      answer: "Vérifiez que JavaScript est activé et que vous utilisez un navigateur récent. Essayez de recharger la page.",
      tags: ["mobile", "player", "JavaScript"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment résoudre les problèmes de son ?",
      answer: "Vérifiez le volume de votre système, les paramètres du navigateur et testez avec d'autres sites.",
      tags: ["son", "volume", "navigateur"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "L'application se charge lentement",
      answer: "Vérifiez votre connexion internet et essayez de vider le cache de votre navigateur.",
      tags: ["lent", "connexion", "cache"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Je ne reçois pas les emails de confirmation",
      answer: "Vérifiez vos spams et assurez-vous que l'adresse email est correcte.",
      tags: ["email", "confirmation", "spam"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment activer les notifications ?",
      answer: "Autorisez les notifications dans les paramètres de votre navigateur et de l'application.",
      tags: ["notifications", "autorisation", "paramètres"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "L'upload ne fonctionne pas",
      answer: "Vérifiez la taille du fichier, le format et votre connexion internet.",
      tags: ["upload", "fichier", "connexion"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment synchroniser mes données ?",
      answer: "Vos données sont automatiquement synchronisées. Déconnectez-vous et reconnectez-vous si nécessaire.",
      tags: ["synchronisation", "données", "connexion"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "L'application ne se met pas à jour",
      answer: "Rechargez la page (Ctrl+F5) pour obtenir la dernière version.",
      tags: ["mise à jour", "rechargement", "version"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment contacter le support technique ?",
      answer: "Utilisez le formulaire de contact ou envoyez un email à support@synaura.com.",
      tags: ["support", "contact", "aide"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "Oui, nous utilisons un chiffrement SSL et respectons le RGPD pour protéger vos données.",
      tags: ["sécurité", "SSL", "RGPD"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    }
  ],

  general: [
    {
      question: "Comment créer un compte ?",
      answer: "Cliquez sur 'S'inscrire', remplissez le formulaire et confirmez votre email.",
      tags: ["compte", "inscription", "email"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment supprimer mon compte ?",
      answer: "Allez dans Paramètres > Compte > Supprimer le compte. Cette action est irréversible.",
      tags: ["suppression", "compte", "irréversible"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment modifier mon profil ?",
      answer: "Allez dans Paramètres > Profil pour modifier votre nom, avatar et informations.",
      tags: ["profil", "modification", "avatar"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment suivre d'autres utilisateurs ?",
      answer: "Visitez le profil d'un utilisateur et cliquez sur 'Suivre' pour voir ses activités.",
      tags: ["suivre", "utilisateurs", "profil"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment utiliser le mode sombre ?",
      answer: "Allez dans Paramètres > Apparence et sélectionnez 'Mode sombre'.",
      tags: ["mode sombre", "apparence", "paramètres"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment changer la langue ?",
      answer: "Allez dans Paramètres > Langue et sélectionnez votre langue préférée.",
      tags: ["langue", "paramètres", "préférences"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment désactiver les notifications ?",
      answer: "Allez dans Paramètres > Notifications pour personnaliser vos préférences.",
      tags: ["notifications", "désactiver", "préférences"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment exporter mes données ?",
      answer: "Contactez le support pour obtenir un export de vos données personnelles.",
      tags: ["export", "données", "RGPD"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment signaler un problème ?",
      answer: "Utilisez le formulaire de contact ou le bouton 'Signaler' sur les contenus inappropriés.",
      tags: ["signaler", "problème", "contact"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    },
    {
      question: "Comment participer à la communauté ?",
      answer: "Rejoignez le forum, participez aux discussions et partagez vos créations.",
      tags: ["communauté", "forum", "participation"],
      helpful_count: Math.floor(Math.random() * 20) + 5
    }
  ]
};

async function createHundredFAQs() {
  console.log('🚀 Création de 100 FAQ variées...');

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

    // Préparer toutes les FAQ
    const allFAQs = [];
    let orderIndex = existingCount + 1;

    Object.entries(faqCategories).forEach(([category, faqs]) => {
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

    console.log(`📝 ${allFAQs.length} FAQ préparées`);

    // Insérer par lots de 20 pour éviter les limites
    const batchSize = 20;
    let insertedCount = 0;

    for (let i = 0; i < allFAQs.length; i += batchSize) {
      const batch = allFAQs.slice(i, i + batchSize);
      
      const { data: insertedFAQs, error: insertError } = await supabase
        .from('faq_items')
        .insert(batch)
        .select('id');

      if (insertError) {
        console.error(`❌ Erreur lors de l'insertion du lot ${Math.floor(i/batchSize) + 1}:`, insertError);
        continue;
      }

      insertedCount += insertedFAQs?.length || 0;
      console.log(`✅ Lot ${Math.floor(i/batchSize) + 1} inséré: ${insertedFAQs?.length || 0} FAQ`);
    }

    console.log(`🎉 ${insertedCount} FAQ créées avec succès !`);

    // Afficher les statistiques par catégorie
    const { data: categoryStats, error: statsError } = await supabase
      .from('faq_items')
      .select('category')
      .eq('is_published', true);

    if (!statsError && categoryStats) {
      const stats = categoryStats.reduce((acc, faq) => {
        acc[faq.category] = (acc[faq.category] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📊 Statistiques par catégorie:');
      Object.entries(stats).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} FAQ`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

createHundredFAQs();

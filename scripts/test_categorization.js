const { categorizePost, suggestTags } = require('./lib/postCategorization');

// Tests de catégorisation
const testPosts = [
  {
    title: "Comment télécharger de la musique ?",
    content: "Je ne sais pas comment faire pour télécharger mes fichiers audio sur la plateforme. Pouvez-vous m'aider ?"
  },
  {
    title: "Suggestion: Améliorer le player",
    content: "Il serait bien d'ajouter une fonctionnalité de lecture en arrière-plan sur mobile. Ce serait une amélioration importante pour l'expérience utilisateur."
  },
  {
    title: "Bug: L'application plante",
    content: "L'app crash quand j'essaie de jouer une musique. Voici les étapes pour reproduire le problème..."
  },
  {
    title: "Partage d'expérience",
    content: "J'ai découvert cette plateforme récemment et je voulais partager mon expérience avec la communauté."
  },
  {
    title: "Problème avec l'API",
    content: "Je rencontre une erreur 500 quand j'appelle l'endpoint /api/tracks. Le JSON retourné est malformé."
  }
];

console.log('🧪 Tests de catégorisation automatique\n');

testPosts.forEach((post, index) => {
  const category = categorizePost(post.title, post.content);
  const tags = suggestTags(post.title, post.content);
  
  console.log(`Test ${index + 1}:`);
  console.log(`Titre: "${post.title}"`);
  console.log(`Contenu: "${post.content.substring(0, 50)}..."`);
  console.log(`Catégorie suggérée: ${category}`);
  console.log(`Tags suggérés: ${tags.join(', ')}`);
  console.log('---');
});

// Test simple de catégorisation
function categorizePost(title, content) {
  const text = `${title} ${content}`.toLowerCase();
  
  const questionKeywords = [
    'comment', 'comment faire', 'comment utiliser', 'comment ça marche',
    'pourquoi', 'pourquoi ça', 'pourquoi ne', 'pourquoi ne pas',
    'aide', 'besoin d\'aide', 'peux-tu m\'aider', 'pouvez-vous m\'aider',
    'problème', 'difficulté', 'bloqué', 'ne fonctionne pas', 'ne marche pas',
    'erreur', 'message d\'erreur', 'ça plante', 'crash', 'bug',
    '?', 'question', 'demande'
  ];
  
  const suggestionKeywords = [
    'suggestion', 'idée', 'proposition', 'amélioration', 'améliorer',
    'feature', 'fonctionnalité', 'nouvelle fonctionnalité', 'ajouter',
    'pourrait', 'serait bien', 'ce serait bien', 'il faudrait',
    'je propose', 'je suggère', 'je pense que', 'il serait'
  ];
  
  const bugKeywords = [
    'bug', 'erreur', 'problème', 'ne fonctionne pas', 'ne marche pas',
    'crash', 'plante', 'bloque', 'lent', 'ralentit',
    'message d\'erreur', 'exception', 'exception non gérée',
    'contenu non disponible', 'impossible de', 'ne peut pas'
  ];
  
  const questionScore = questionKeywords.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
  
  const suggestionScore = suggestionKeywords.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
  
  const bugScore = bugKeywords.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
  
  const questionBonus = (text.match(/\?/g) || []).length;
  const finalQuestionScore = questionScore + questionBonus;
  
  const scores = {
    question: finalQuestionScore,
    suggestion: suggestionScore,
    bug: bugScore,
    general: 0
  };
  
  const maxScore = Math.max(...Object.values(scores));
  
  if (maxScore === 0) {
    if (title.toLowerCase().includes('?')) return 'question';
    if (content.length < 50) return 'general';
    return 'general';
  }
  
  const category = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
  return category || 'general';
}

// Tests
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
  }
];

console.log('🧪 Tests de catégorisation automatique\n');

testPosts.forEach((post, index) => {
  const category = categorizePost(post.title, post.content);
  
  console.log(`Test ${index + 1}:`);
  console.log(`Titre: "${post.title}"`);
  console.log(`Contenu: "${post.content.substring(0, 50)}..."`);
  console.log(`Catégorie suggérée: ${category}`);
  console.log('---');
});

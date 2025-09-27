// Fonction pour catégoriser automatiquement un post basé sur son contenu
export function categorizePost(title: string, content: string): 'question' | 'suggestion' | 'bug' | 'general' {
  const text = `${title} ${content}`.toLowerCase();
  
  // Mots-clés pour chaque catégorie
  const questionKeywords = [
    'comment', 'comment faire', 'comment utiliser', 'comment ça marche', 'comment configurer',
    'pourquoi', 'pourquoi ça', 'pourquoi ne', 'pourquoi ne pas',
    'comment résoudre', 'comment corriger', 'comment installer',
    'aide', 'besoin d\'aide', 'peux-tu m\'aider', 'pouvez-vous m\'aider',
    'problème', 'difficulté', 'bloqué', 'ne fonctionne pas', 'ne marche pas',
    'erreur', 'message d\'erreur', 'ça plante', 'crash', 'bug',
    '?', 'question', 'demande', 'incompréhension'
  ];
  
  const suggestionKeywords = [
    'suggestion', 'idée', 'proposition', 'amélioration', 'améliorer',
    'feature', 'fonctionnalité', 'nouvelle fonctionnalité', 'ajouter',
    'pourrait', 'serait bien', 'ce serait bien', 'il faudrait',
    'je propose', 'je suggère', 'je pense que', 'il serait',
    'amélioration', 'optimisation', 'performance', 'rapidité',
    'interface', 'design', 'ui', 'ux', 'expérience utilisateur'
  ];
  
  const bugKeywords = [
    'bug', 'erreur', 'problème', 'ne fonctionne pas', 'ne marche pas',
    'crash', 'plante', 'bloque', 'lent', 'ralentit',
    'message d\'erreur', 'exception', 'exception non gérée',
    'contenu non disponible', 'impossible de', 'ne peut pas',
    'dysfonctionnement', 'malfonction', 'défaillance',
    'reproduction', 'étapes pour reproduire', 'comment reproduire'
  ];
  
  const generalKeywords = [
    'discussion', 'avis', 'opinion', 'pensée', 'réflexion',
    'partage', 'partager', 'expérience', 'témoignage',
    'communauté', 'utilisateurs', 'membres',
    'général', 'divers', 'autre', 'misc', 'miscellanées'
  ];
  
  // Compter les occurrences de chaque catégorie
  const questionScore = questionKeywords.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
  
  const suggestionScore = suggestionKeywords.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
  
  const bugScore = bugKeywords.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
  
  const generalScore = generalKeywords.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
  
  // Bonus pour les questions (présence de ?)
  const questionBonus = (text.match(/\?/g) || []).length;
  const finalQuestionScore = questionScore + questionBonus;
  
  // Bonus pour les bugs (mots techniques)
  const technicalWords = ['api', 'json', 'http', 'https', 'url', 'endpoint', 'database', 'sql', 'query'];
  const technicalBonus = technicalWords.reduce((score, word) => {
    return score + (text.includes(word) ? 1 : 0);
  }, 0);
  const finalBugScore = bugScore + technicalBonus;
  
  // Déterminer la catégorie avec le score le plus élevé
  const scores = {
    question: finalQuestionScore,
    suggestion: suggestionScore,
    bug: finalBugScore,
    general: generalScore
  };
  
  const maxScore = Math.max(...Object.values(scores));
  
  // Si aucun score significatif, utiliser des règles de fallback
  if (maxScore === 0) {
    // Si le titre contient un ?, c'est probablement une question
    if (title.toLowerCase().includes('?')) {
      return 'question';
    }
    // Si le contenu est très court, c'est probablement général
    if (content.length < 50) {
      return 'general';
    }
    // Par défaut, général
    return 'general';
  }
  
  // Retourner la catégorie avec le score le plus élevé
  const category = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
  return (category as 'question' | 'suggestion' | 'bug' | 'general') || 'general';
}

// Fonction pour suggérer des tags basés sur le contenu
export function suggestTags(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const suggestedTags: string[] = [];
  
  // Tags techniques
  if (text.includes('api') || text.includes('endpoint')) suggestedTags.push('api');
  if (text.includes('audio') || text.includes('musique') || text.includes('son')) suggestedTags.push('audio');
  if (text.includes('upload') || text.includes('télécharger')) suggestedTags.push('upload');
  if (text.includes('player') || text.includes('lecteur')) suggestedTags.push('player');
  if (text.includes('ia') || text.includes('ai') || text.includes('intelligence artificielle')) suggestedTags.push('ia');
  if (text.includes('abonnement') || text.includes('subscription') || text.includes('premium')) suggestedTags.push('abonnement');
  if (text.includes('mobile') || text.includes('app') || text.includes('téléphone')) suggestedTags.push('mobile');
  if (text.includes('desktop') || text.includes('ordinateur') || text.includes('pc')) suggestedTags.push('desktop');
  if (text.includes('performance') || text.includes('rapidité') || text.includes('vitesse')) suggestedTags.push('performance');
  if (text.includes('ui') || text.includes('interface') || text.includes('design')) suggestedTags.push('ui');
  if (text.includes('bug') || text.includes('erreur') || text.includes('problème')) suggestedTags.push('bug');
  if (text.includes('suggestion') || text.includes('amélioration') || text.includes('feature')) suggestedTags.push('suggestion');
  
  // Limiter à 5 tags maximum
  return suggestedTags.slice(0, 5);
}

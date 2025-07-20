// Système de modération de contenu pour filtrer les insultes et contenu inapproprié

interface ModerationResult {
  isClean: boolean;
  score: number;
  flags: string[];
  suggestions: string[];
  censoredText?: string;
}

class ContentModerator {
  private insultWords: Set<string>;
  private warningWords: Set<string>;
  private spamPatterns: RegExp[];
  private urlPattern: RegExp;

  constructor() {
    // Liste d'insultes en français (complète avec dérivées)
    this.insultWords = new Set([
      // Insultes de base
      'con', 'connard', 'connasse', 'putain', 'merde', 'salope', 'salopard',
      'enculé', 'enculée', 'fils de pute', 'fils de putain', 'nique', 'niquer',
      'bite', 'couille', 'chatte', 'cul', 'foutre', 'branler', 'branleur',
      'pédé', 'pd', 'gouine', 'tapette', 'pédale', 'enfoiré', 'enfoirée',
      'batard', 'bâtard', 'bâtarde', 'batarde', 'chienne', 'chier', 'chie',
      'dégage', 'dégagez', 'va te faire', 'va te faire foutre', 'va chier',
      'ta gueule', 'ferme ta gueule', 'ferme la', 'ta mère', 'ta race',
      'nazi', 'facho', 'fasciste', 'raciste', 'xénophobe', 'homophobe',
      'antisémite', 'islamophobe', 'sexiste', 'misogyne', 'transphobe',
      
      // Dérivées et variations
      'connard', 'connards', 'connasse', 'connasses', 'conne', 'connes',
      'putain', 'putains', 'pute', 'putes', 'putass', 'putasses',
      'merde', 'merdes', 'merdique', 'merdiques', 'merdier', 'merdiers',
      'salope', 'salopes', 'salopard', 'salopards', 'saloperie', 'saloperies',
      'enculé', 'enculés', 'enculée', 'enculées', 'enculer', 'encule',
      'fils de pute', 'fils de putain', 'fille de pute', 'fille de putain',
      'nique', 'niques', 'niquer', 'niquez', 'niquent', 'niqué', 'niquée',
      'bite', 'bites', 'bitte', 'bittes', 'couille', 'couilles', 'couillon',
      'chatte', 'chattes', 'cul', 'culs', 'foutre', 'foutres', 'foutra',
      'branler', 'branle', 'branles', 'branleur', 'branleurs', 'branleuse',
      'pédé', 'pédés', 'pd', 'gouine', 'gouines', 'tapette', 'tapettes',
      'pédale', 'pédales', 'enfoiré', 'enfoirés', 'enfoirée', 'enfoirées',
      'batard', 'batards', 'bâtard', 'bâtards', 'bâtarde', 'bâtardes',
      'chienne', 'chiennes', 'chier', 'chie', 'chies', 'chient', 'chié',
      'dégage', 'dégages', 'dégagez', 'va te faire', 'va te faire foutre',
      'va chier', 'ta gueule', 'ferme ta gueule', 'ferme la', 'ta mère',
      'ta race', 'nazi', 'nazis', 'facho', 'fachos', 'fasciste', 'fascistes',
      'raciste', 'racistes', 'xénophobe', 'xénophobes', 'homophobe', 'homophobes',
      'antisémite', 'antisémites', 'islamophobe', 'islamophobes',
      'sexiste', 'sexistes', 'misogyne', 'misogynes', 'transphobe', 'transphobes',
      
      // Variations avec accents et orthographes alternatives
      'con', 'cons', 'conne', 'connes', 'connard', 'connards', 'connasse', 'connasses',
      'putain', 'putains', 'pute', 'putes', 'putass', 'putasses',
      'merde', 'merdes', 'merdique', 'merdiques', 'merdier', 'merdiers',
      'salope', 'salopes', 'salopard', 'salopards', 'saloperie', 'saloperies',
      'enculé', 'enculés', 'enculée', 'enculées', 'enculer', 'encule', 'encules',
      'fils de pute', 'fils de putain', 'fille de pute', 'fille de putain',
      'nique', 'niques', 'niquer', 'niquez', 'niquent', 'niqué', 'niquée', 'niquées',
      'bite', 'bites', 'bitte', 'bittes', 'couille', 'couilles', 'couillon', 'couillons',
      'chatte', 'chattes', 'cul', 'culs', 'foutre', 'foutres', 'foutra',
      'branler', 'branle', 'branles', 'branleur', 'branleurs', 'branleuse', 'branleuses',
      'pédé', 'pédés', 'pd', 'gouine', 'gouines', 'tapette', 'tapettes',
      'pédale', 'pédales', 'enfoiré', 'enfoirés', 'enfoirée', 'enfoirées',
      'batard', 'batards', 'bâtard', 'bâtards', 'bâtarde', 'bâtardes',
      'chienne', 'chiennes', 'chier', 'chie', 'chies', 'chient', 'chié', 'chiée',
      'dégage', 'dégages', 'dégagez', 'va te faire', 'va te faire foutre',
      'va chier', 'ta gueule', 'ferme ta gueule', 'ferme la', 'ta mère',
      'ta race', 'nazi', 'nazis', 'facho', 'fachos', 'fasciste', 'fascistes',
      'raciste', 'racistes', 'xénophobe', 'xénophobes', 'homophobe', 'homophobes',
      'antisémite', 'antisémites', 'islamophobe', 'islamophobes',
      'sexiste', 'sexistes', 'misogyne', 'misogynes', 'transphobe', 'transphobes',
      
      // Expressions composées
      'fils de pute', 'fils de putain', 'fille de pute', 'fille de putain',
      'va te faire foutre', 'va te faire enculer', 'va te faire voir',
      'ta gueule', 'ferme ta gueule', 'ferme la', 'ta mère', 'ta race',
      'ta mère la pute', 'ta mère la putain', 'ta mère la salope',
      'nique ta mère', 'nique ta race', 'nique ta gueule',
      'enculé de ta mère', 'enculé de ta race', 'enculé de ta gueule',
      'fils de ta mère', 'fille de ta mère', 'enfant de ta mère',
      
      // Variations phonétiques et argotiques
      'con', 'cons', 'conne', 'connes', 'connard', 'connards', 'connasse', 'connasses',
      'putain', 'putains', 'pute', 'putes', 'putass', 'putasses', 'ptn', 'ptn',
      'merde', 'merdes', 'merdique', 'merdiques', 'merdier', 'merdiers', 'md',
      'salope', 'salopes', 'salopard', 'salopards', 'saloperie', 'saloperies',
      'enculé', 'enculés', 'enculée', 'enculées', 'enculer', 'encule', 'encules',
      'fils de pute', 'fils de putain', 'fille de pute', 'fille de putain',
      'nique', 'niques', 'niquer', 'niquez', 'niquent', 'niqué', 'niquée', 'niquées',
      'bite', 'bites', 'bitte', 'bittes', 'couille', 'couilles', 'couillon', 'couillons',
      'chatte', 'chattes', 'cul', 'culs', 'foutre', 'foutres', 'foutra',
      'branler', 'branle', 'branles', 'branleur', 'branleurs', 'branleuse', 'branleuses',
      'pédé', 'pédés', 'pd', 'gouine', 'gouines', 'tapette', 'tapettes',
      'pédale', 'pédales', 'enfoiré', 'enfoirés', 'enfoirée', 'enfoirées',
      'batard', 'batards', 'bâtard', 'bâtards', 'bâtarde', 'bâtardes',
      'chienne', 'chiennes', 'chier', 'chie', 'chies', 'chient', 'chié', 'chiée',
      'dégage', 'dégages', 'dégagez', 'va te faire', 'va te faire foutre',
      'va chier', 'ta gueule', 'ferme ta gueule', 'ferme la', 'ta mère',
      'ta race', 'nazi', 'nazis', 'facho', 'fachos', 'fasciste', 'fascistes',
      'raciste', 'racistes', 'xénophobe', 'xénophobes', 'homophobe', 'homophobes',
      'antisémite', 'antisémites', 'islamophobe', 'islamophobes',
      'sexiste', 'sexistes', 'misogyne', 'misogynes', 'transphobe', 'transphobes',
      
      // Mots avec caractères spéciaux pour contourner
      'c0n', 'c0nnard', 'c0nnasse', 'put@in', 'm3rde', 's@lope', 's@lopard',
      'encul3', 'encul33', 'fils d3 put3', 'n1que', 'n1quer', 'b1te', 'c0uille',
      'ch@tte', 'cul', 'f0utre', 'br@nler', 'br@nleur', 'p3d3', 'g0uine',
      't@pette', 'p3d@le', 'enf0ir3', 'enf0ir33', 'b@tard', 'ch1enne',
      'd3g@ge', 'v@ t3 f@ire', 't@ gu3ule', 't@ m3re', 't@ r@ce',
      'n@zi', 'f@cho', 'f@sciste', 'r@ciste', 'x3nophobe', 'h0mophobe',
      '@ntis3mite', 'isl@mophobe', 's3xiste', 'mis0gyne', 'tr@nsphobe'
    ]);

    // Mots d'avertissement (moins graves mais à surveiller)
    this.warningWords = new Set([
      'idiot', 'imbécile', 'stupide', 'débile', 'crétin', 'abruti',
      'bouffon', 'clown', 'rigolo', 'marrant', 'drôle', 'amusant',
      'nul', 'nulle', 'pourri', 'pourrie', 'merdique', 'merdique',
      'chiant', 'chiant', 'emmerdant', 'emmerdant', 'relou', 'relou',
      'casse-couilles', 'casse-couille', 'casse-burnes', 'casse-burnes'
    ]);

    // Patterns de spam
    this.spamPatterns = [
      /(.)\1{4,}/g, // Caractères répétés (ex: aaaaaa)
      /[A-Z]{10,}/g, // TROP DE MAJUSCULES
      /[!]{3,}/g, // Trop de points d'exclamation
      /[?]{3,}/g, // Trop de points d'interrogation
      /\b(spam|pub|publicité|cliquez|visitez|achetez|promo|offre|gratuit)\b/gi,
    ];

    // Pattern pour détecter les URLs
    this.urlPattern = /https?:\/\/[^\s]+/g;
  }

  // Analyser le contenu et retourner un score de modération
  analyzeContent(text: string): ModerationResult {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    let score = 0;
    const flags: string[] = [];
    const suggestions: string[] = [];

    // Vérifier les insultes
    const foundInsults = words.filter(word => this.insultWords.has(word));
    if (foundInsults.length > 0) {
      score += foundInsults.length * 10;
      flags.push('insultes');
      suggestions.push('Évitez les insultes et le langage offensant');
    }

    // Vérifier les mots d'avertissement
    const foundWarnings = words.filter(word => this.warningWords.has(word));
    if (foundWarnings.length > 0) {
      score += foundWarnings.length * 3;
      flags.push('langage inapproprié');
      suggestions.push('Utilisez un langage plus respectueux');
    }

    // Vérifier le spam
    let spamScore = 0;
    this.spamPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        spamScore += matches.length;
      }
    });

    if (spamScore > 0) {
      score += spamScore * 2;
      flags.push('spam');
      suggestions.push('Évitez les caractères répétés et le spam');
    }

    // Vérifier les URLs (non autorisées dans les commentaires)
    const urls = text.match(this.urlPattern);
    if (urls) {
      score += urls.length * 5;
      flags.push('liens non autorisés');
      suggestions.push('Les liens ne sont pas autorisés dans les commentaires');
    }

    // Vérifier la longueur
    if (text.length < 3) {
      score += 5;
      flags.push('trop court');
      suggestions.push('Votre commentaire est trop court');
    }

    if (text.length > 1000) {
      score += 5;
      flags.push('trop long');
      suggestions.push('Votre commentaire est trop long (max 1000 caractères)');
    }

    // Vérifier les caractères spéciaux excessifs
    const specialChars = (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (specialChars > text.length * 0.3) {
      score += 3;
      flags.push('caractères spéciaux excessifs');
      suggestions.push('Évitez l\'utilisation excessive de caractères spéciaux');
    }

    // Générer le texte censuré si nécessaire
    let censoredText = text;
    if (foundInsults.length > 0) {
      foundInsults.forEach(insult => {
        const regex = new RegExp(`\\b${insult}\\b`, 'gi');
        censoredText = censoredText.replace(regex, '*'.repeat(insult.length));
      });
    }

    return {
      isClean: score < 10,
      score,
      flags,
      suggestions,
      censoredText: score >= 10 ? censoredText : undefined
    };
  }

  // Vérifier si le contenu est acceptable
  isContentAcceptable(text: string): boolean {
    const result = this.analyzeContent(text);
    return result.isClean;
  }

  // Obtenir des suggestions d'amélioration
  getSuggestions(text: string): string[] {
    const result = this.analyzeContent(text);
    return result.suggestions;
  }

  // Censurer le contenu inapproprié
  censorContent(text: string): string {
    const result = this.analyzeContent(text);
    return result.censoredText || text;
  }

  // Ajouter des mots à la liste d'insultes
  addInsultWord(word: string): void {
    this.insultWords.add(word.toLowerCase());
  }

  // Ajouter des mots d'avertissement
  addWarningWord(word: string): void {
    this.warningWords.add(word.toLowerCase());
  }

  // Obtenir les statistiques de modération
  getModerationStats(text: string): {
    totalWords: number;
    insultCount: number;
    warningCount: number;
    spamScore: number;
    urlCount: number;
  } {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    
    const insultCount = words.filter(word => this.insultWords.has(word)).length;
    const warningCount = words.filter(word => this.warningWords.has(word)).length;
    const urls = text.match(this.urlPattern) || [];
    
    let spamScore = 0;
    this.spamPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        spamScore += matches.length;
      }
    });

    return {
      totalWords: words.length,
      insultCount,
      warningCount,
      spamScore,
      urlCount: urls.length
    };
  }
}

// Instance singleton
const contentModerator = new ContentModerator();

export default contentModerator;
export type { ModerationResult }; 
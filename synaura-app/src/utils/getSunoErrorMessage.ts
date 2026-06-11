export function getSunoErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/cr.dit|402|429/i.test(message)) return 'Crédits insuffisants pour lancer cette génération.';
  if (/non authentifi|401/i.test(message)) return 'Le Studio n’a pas pu vérifier ton compte. Réessaie dans un instant.';
  if (/param.tre|invalide|400/i.test(message)) return 'Certains réglages ne sont pas valides. Vérifie le prompt et le style.';
  if (/404|indisponible/i.test(message)) return 'Le service IA est temporairement indisponible.';
  if (/405|limite/i.test(message)) return 'La limite de requêtes est atteinte. Réessaie dans un instant.';
  if (/413|trop long/i.test(message)) return 'Le texte est trop long pour ce modèle.';
  if (/maintenance|455/i.test(message)) return 'Le moteur de génération est momentanément en maintenance.';
  if (/trop|430/i.test(message)) return 'Trop de générations en cours. Attends un instant.';
  return message || 'La génération n’a pas pu démarrer.';
}

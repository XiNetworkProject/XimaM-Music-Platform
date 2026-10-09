export type StudioOperation = 'generation' | 'upload' | 'source' | 'lyrics' | 'style' | 'tool';
export type StudioOutcome = 'pending' | 'success' | 'failed' | 'uncertain' | 'warning' | 'cancelled';
export type StudioFeedback = {
  id: string; kind: StudioOperation; stage: string; state: StudioOutcome;
  startedAt: number; updatedAt: number; message: string; advice?: string;
  code?: string; taskId?: string; acknowledged?: boolean; canCheck?: boolean;
};
export const operationLabels: Record<StudioOperation, string> = { generation: 'Génération musicale', upload: 'Import audio', source: 'Utilisation d’un morceau', lyrics: 'Paroles', style: 'Style musical', tool: 'Outil de création' };
export const outcomeLabels: Record<StudioOutcome, string> = { pending: 'En cours', success: 'Terminé', failed: 'Échec confirmé', uncertain: 'À vérifier', warning: 'Action nécessaire', cancelled: 'Annulé' };
/** Never retain prompts, payloads, file URLs, stacks or credentials in the local journal. */
export function safeFeedbackText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/https?:\/\/\S+/gi, '[lien masqué]').replace(/Bearer\s+\S+/gi, '[secret masqué]')
    .replace(/(?:token|password|secret|api[_-]?key)\s*[:=]\s*\S+/gi, '[secret masqué]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[adresse masquée]').replace(/[A-Za-z0-9_+/=-]{80,}/g, '[identifiant masqué]')
    .split(/\n\s*at\s/)[0].replace(/[<>]/g, '').slice(0, 500);
}
export function feedbackFailure(cause: unknown, options: { status?: number; code?: string; uncertain?: boolean; stage?: string } = {}): Pick<StudioFeedback, 'state' | 'message' | 'advice' | 'code'> {
  const raw = safeFeedbackText(cause instanceof Error ? cause.message : cause);
  const code = safeFeedbackText(options.code || (options.status ? `HTTP_${options.status}` : '')).slice(0, 80);
  const known = `${code} ${raw}`;
  if (cause instanceof Error && cause.name === 'AbortError') return { state: 'cancelled', message: 'Opération annulée.', advice: 'Aucune relance automatique.', code: 'CANCELLED' };
  if (options.stage === 'save' || /SAVE_COMPLETED_FAILED/.test(known)) return { state: 'warning', message: 'Le résultat est disponible, mais son enregistrement n’a pas été confirmé.', advice: 'Vérifiez la bibliothèque avant de relancer. Cela ne signifie pas que la création a échoué.', code: code || 'SAVE_UNCONFIRMED' };
  if (options.uncertain || /Polling timeout:|Failed to fetch|NetworkError|Network request failed/i.test(known)) return { state: 'uncertain', message: raw && !/Failed to fetch|NetworkError/i.test(raw) ? raw : 'La connexion n’a pas permis de confirmer le résultat.', advice: 'Vérifiez le suivi de la demande avant toute nouvelle génération : elle peut encore aboutir. Le débit ou remboursement n’est pas confirmé.', code: code || 'RESULT_UNKNOWN' };
  if (options.status === 401) return { state: 'failed', message: 'Votre session n’est plus valide.', advice: 'Reconnectez-vous, puis reprenez votre brouillon.', code };
  if (options.status === 403) return { state: 'failed', message: raw || 'Cette action n’est pas autorisée.', advice: 'Vérifiez les droits du morceau et les fonctionnalités de votre compte.', code };
  if (options.status === 402) return { state: 'failed', message: raw || 'Le solde de crédits ne permet pas cette action.', advice: 'Consultez votre solde avant de lancer une nouvelle demande.', code };
  if ([429, 430].includes(options.status || 0)) return { state: 'failed', message: raw || 'Trop de demandes rapprochées.', advice: 'Attendez avant de réessayer. Ce message seul ne prouve pas un manque de crédits.', code };
  if (/SENSITIVE_WORD|CONTENT_POLICY|copyright|protected|œuvre protégée|modération/i.test(known)) return { state: 'failed', message: raw && raw !== code ? raw : 'Le fournisseur a refusé le contenu.', advice: 'Vérifiez les droits de l’audio et le contenu des paroles ou du style. Le fournisseur ne précise pas forcément le passage concerné.', code };
  if (options.status === 413) return { state: 'failed', message: raw || 'Le contenu dépasse la taille acceptée.', advice: 'Réduisez la taille du fichier ou la longueur du texte indiqué.', code };
  if (/^[A-Z_]+$/.test(raw) || !raw) return { state: 'failed', message: 'Le service a signalé un échec sans en préciser la cause.', advice: 'Conservez la référence ci-dessous pour demander de l’aide. Aucun remboursement n’est présumé.', code: code || raw || 'UNKNOWN' };
  return { state: 'failed', message: raw, advice: 'Corrigez les éléments indiqués avant de réessayer. Une nouvelle génération reste une action volontaire.', code };
}
export function mergeFeedback(items: StudioFeedback[], next: StudioFeedback, now = Date.now()): StudioFeedback[] {
  const old = items.find(item => item.id === next.id);
  const same = old && old.state === next.state && old.stage === next.stage && old.message === next.message && old.advice === next.advice && old.code === next.code && old.canCheck === next.canCheck && old.taskId === next.taskId;
  if (same) return items;
  return [{ ...next, startedAt: old?.startedAt ?? next.startedAt, acknowledged: false }, ...items.filter(item => item.id !== next.id)]
    .filter(item => now - item.updatedAt < 30 * 86400000).slice(0, 40);
}

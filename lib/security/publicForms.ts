export function cleanPublicText(value: unknown, maxLength: number, multiline = false) {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .replace(/\0/g, '')
    .replace(multiline ? /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0001-\u001F\u007F]/g, '')
    .trim();
  return cleaned.length <= maxLength ? cleaned : '';
}

export function cleanOptionalHttpUrl(value: unknown, maxLength = 2048) {
  if (value == null || value === '') return null;
  const cleaned = cleanPublicText(value, maxLength);
  if (!cleaned) return undefined;
  try {
    const url = new URL(cleaned);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type SupportTicketInput = {
  email: string;
  subject: string;
  message: string;
  url: string | null;
};

export function validateSupportTicket(
  body: Record<string, unknown>,
  allowedSubjects: readonly string[],
): { ok: true; value: SupportTicketInput } | { ok: false; error: string } {
  const email = cleanPublicText(body.email, 254).toLowerCase();
  const subject = cleanPublicText(body.subject, 80);
  const message = cleanPublicText(body.message, 5_000, true);
  const url = cleanOptionalHttpUrl(body.url);

  if (!email || !subject || !message) return { ok: false, error: 'Champs requis manquants.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Adresse email invalide.' };
  if (!allowedSubjects.includes(subject)) return { ok: false, error: 'Sujet invalide.' };
  if (message.length < 10) return { ok: false, error: 'Message trop court (min 10 caracteres).' };
  if (body.url && url === undefined) return { ok: false, error: 'URL invalide.' };
  return { ok: true, value: { email, subject, message, url: url ?? null } };
}

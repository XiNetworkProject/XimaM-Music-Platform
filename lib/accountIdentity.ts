const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const MINIMUM_ACCOUNT_AGE = 15;
export const MOBILE_AUTH_CALLBACK_URL = 'synaura://auth/callback';

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeUsername(value: unknown) {
  if (typeof value !== 'string') return '';
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  return normalized;
}

export function isValidUsername(value: unknown) {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}

export function usernameSeed(value: unknown, fallback = 'membre') {
  const normalized = normalizeUsername(value);
  if (normalized.length >= 3) return normalized;
  const safeFallback = normalizeUsername(fallback);
  return safeFallback.length >= 3 ? safeFallback : 'membre';
}

export function normalizePhoneNumber(value: unknown, defaultCallingCode = '+33') {
  if (typeof value !== 'string') return '';
  let compact = value.trim().replace(/[().\s-]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;
  if (compact.startsWith('0')) compact = `${defaultCallingCode}${compact.slice(1)}`;
  if (!compact.startsWith('+') && /^\d+$/.test(compact)) compact = `${defaultCallingCode}${compact}`;
  return E164_PATTERN.test(compact) ? compact : '';
}

export function parseBirthDate(value: unknown) {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

export function ageOnDate(birthDate: Date, now = new Date()) {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

export function validateBirthDate(value: unknown, now = new Date()) {
  const birthDate = parseBirthDate(value);
  if (!birthDate) return { valid: false as const, error: 'Date de naissance invalide' };
  if (birthDate.getTime() > now.getTime()) {
    return { valid: false as const, error: 'La date de naissance ne peut pas etre dans le futur' };
  }
  if (ageOnDate(birthDate, now) < MINIMUM_ACCOUNT_AGE) {
    return {
      valid: false as const,
      error: `Il faut avoir au moins ${MINIMUM_ACCOUNT_AGE} ans pour creer un compte`,
    };
  }
  return { valid: true as const, value: birthDate.toISOString().slice(0, 10) };
}

export function isAllowedMobileAuthRedirect(value: unknown) {
  return value === MOBILE_AUTH_CALLBACK_URL;
}


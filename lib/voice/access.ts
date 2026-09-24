// Server-selected access policy. Never accept a preview flag or identity from UI.
export type VoiceAccessPolicy = { mode: 'private' | 'public'; userIds: readonly string[] };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function voiceAccessPolicy(env: Record<string, string | undefined>): VoiceAccessPolicy | null {
  const mode = env.SYNAURA_CALLS_ACCESS || 'private';
  if (mode === 'public') return { mode, userIds: [] };
  if (mode !== 'private') return null;
  const raw = (env.SYNAURA_CALLS_TEST_USER_IDS || '').split(',').map(value => value.trim().toLowerCase());
  // No wildcard, email, username, partial ID or silently dropped invalid entry.
  if (raw.some(value => !uuid.test(value))) return null;
  const userIds = Array.from(new Set(raw));
  if (userIds.length < 2 || userIds.length > 8) return null;
  return { mode, userIds };
}

export function voiceUserAllowed(policy: VoiceAccessPolicy | null, userId: string): boolean {
  if (!policy || !uuid.test(userId)) return false;
  return policy.mode === 'public' || policy.userIds.includes(userId.toLowerCase());
}

export function voiceConversationAllowed(policy: VoiceAccessPolicy | null, userIds: readonly string[]): boolean {
  return userIds.length >= 2 && userIds.every(id => voiceUserAllowed(policy, id));
}

export function voiceRoomPrefix(env: Record<string, string | undefined>, policy: VoiceAccessPolicy): string | null {
  const instance = env.SYNAURA_CALLS_INSTANCE || '';
  // Distinct prefix per single-process deployment; never share preview/public.
  if (!/^[a-z][a-z0-9-]{2,31}$/.test(instance) || instance.endsWith('-')) return null;
  return `synaura-voice-${policy.mode}-${instance}-`;
}

export function voiceRoomOwned(prefix: string, room: string): boolean {
  return room.startsWith(prefix) && uuid.test(room.slice(prefix.length));
}

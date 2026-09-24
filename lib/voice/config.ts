import { voiceAccessPolicy, voiceRoomPrefix, type VoiceAccessPolicy } from './access.ts';

export type VoiceConfig = { url: string; serverUrl: string; key: string; secret: string; maxParticipants: number; maxCalls: number; access: VoiceAccessPolicy; roomPrefix: string };
export function voiceConfig(env: Record<string, string | undefined>): VoiceConfig | null {
  if (env.SYNAURA_CALLS_ENABLED !== 'true' || env.SYNAURA_CALLS_SINGLE_PROCESS !== 'true' || env.LIVEKIT_ROOM_AUTO_CREATE_DISABLED !== 'true') return null;
  const access = voiceAccessPolicy(env);
  if (!access) return null;
  const roomPrefix = voiceRoomPrefix(env, access);
  if (!roomPrefix) return null;
  const key = env.LIVEKIT_API_KEY?.trim() || '';
  const secret = env.LIVEKIT_API_SECRET?.trim() || '';
  if (!key || secret.length < 32 || /replace|changeme|example/i.test(secret)) return null;
  try {
    const url = new URL(env.LIVEKIT_URL || '');
    const server = new URL(env.LIVEKIT_SERVER_URL || '');
    const local = (u: URL) => ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    if (url.username || url.password || server.username || server.password || url.search || server.search) return null;
    if (url.protocol !== 'wss:' && !(env.NODE_ENV !== 'production' && local(url) && url.protocol === 'ws:')) return null;
    if (server.protocol !== 'https:' && !(local(server) && server.protocol === 'http:')) return null;
    const maxParticipants = Number(env.SYNAURA_CALLS_MAX_PARTICIPANTS || 8);
    const maxCalls = Number(env.SYNAURA_CALLS_MAX_CONCURRENT || 4);
    if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 24 || !Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 20) return null;
    return { url: url.toString(), serverUrl: server.toString(), key, secret, maxParticipants, maxCalls, access, roomPrefix };
  } catch { return null; }
}

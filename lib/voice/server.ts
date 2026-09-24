import 'server-only';
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { randomUUID } from 'node:crypto';
import { queryDatabase } from '@/lib/postgres';
import { CallError, CallRegistry, type VoiceCall } from './callRegistry';
import { voiceConfig, type VoiceConfig } from './config';
import { voiceConversationAllowed, voiceRoomOwned, voiceUserAllowed } from './access';

async function conversationAccess(conversationId: string, user: string, config: VoiceConfig) {
  if (!voiceUserAllowed(config.access, user)) throw new CallError('Les appels ne sont pas disponibles pour ce compte.', 403);
  const { rows } = await queryDatabase(`SELECT c.name, c.is_group, p.id, p.name AS person_name, p.username
    FROM public.conversations c
    JOIN public.conversation_participants cp ON cp.conversation_id = c.id
    JOIN public.profiles p ON p.id = cp.user_id
    WHERE c.id = $1 AND c.is_active = true AND EXISTS
      (SELECT 1 FROM public.conversation_participants mine WHERE mine.conversation_id = c.id AND mine.user_id = $2)`, [conversationId, user]);
  if (!rows.length) throw new CallError('Cette discussion ne permet pas cet appel.', 403);
  const ids = Array.from(new Set<string>(rows.map(r => String(r.id))));
  if (!voiceConversationAllowed(config.access, ids)) throw new CallError('Cette discussion n’est pas disponible pour le test privé des appels.', 403);
  if (ids.length > config.maxParticipants) throw new CallError(`Les appels sont limités à ${config.maxParticipants} membres pour le moment.`);
  if (!rows[0].is_group && ids.length !== 2) throw new CallError('Discussion privée invalide.', 403);
  const { rows: blocked } = await queryDatabase('SELECT 1 FROM public.user_blocks WHERE blocker_id = ANY($1::uuid[]) AND blocked_id = ANY($1::uuid[]) LIMIT 1', [ids]);
  // Conservative group policy: no call mixing two accounts that blocked each other.
  if (blocked.length) throw new CallError('Cet appel est indisponible avec les accès actuels.', 403);
  if (!rows[0].is_group) {
    const pair = ids.slice().sort();
    const { rows: friends } = await queryDatabase('SELECT 1 FROM public.friendships WHERE user_id = $1 AND friend_id = $2', pair);
    if (!friends.length) throw new CallError('Vous devez être amis pour vous appeler.', 403);
  }
  return { title: rows[0].is_group ? String(rows[0].name || 'Appel de groupe') : 'Appel privé', group: Boolean(rows[0].is_group), people: rows.map(r => ({ id: String(r.id), name: String(r.person_name || r.username || 'Membre').slice(0, 80) })) };
}
function isMissingRoom(error: unknown) { return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'not_found'); }

async function makeService() {
  const config = voiceConfig(process.env);
  if (!config) return null;
  const media = new RoomServiceClient(config.serverUrl, config.key, config.secret, { requestTimeout: 5 });
  const removeRoom = async (room: string) => { try { await media.deleteRoom(room); } catch (e) { if (!isMissingRoom(e)) throw e; } };
  const registry = new CallRegistry({
    access: (id, user) => conversationAccess(id, user, config),
    createRoom: async name => { await media.createRoom({ name, emptyTimeout: 60, departureTimeout: 30, maxParticipants: config.maxParticipants }); },
    deleteRoom: removeRoom,
    removeMember: async (room, id) => { try { await media.removeParticipant(room, id); } catch (e) { if (!isMissingRoom(e)) throw e; } },
    now: Date.now, id: randomUUID, roomPrefix: config.roomPrefix,
  }, config.maxCalls);
  // This namespace is exclusive to the single application process. After a
  // restart, end its orphaned calls; never delete other LiveKit rooms.
  for (const room of await media.listRooms()) if (voiceRoomOwned(config.roomPrefix, room.name)) await removeRoom(room.name);
  const timer = setInterval(() => { void registry.sweep().catch(() => console.error('[voice] maintenance unavailable')); }, 15_000);
  timer.unref();
  return { registry, config, media, removeRoom };
}
type Service = Awaited<ReturnType<typeof makeService>>;
declare global { var __synauraVoiceService: Promise<Service> | undefined; }
export async function getVoiceService() {
  if (!voiceConfig(process.env)) return null;
  if (!globalThis.__synauraVoiceService) globalThis.__synauraVoiceService = makeService().catch(error => { globalThis.__synauraVoiceService = undefined; throw error; });
  return globalThis.__synauraVoiceService;
}
export async function callCredentials(service: NonNullable<Service>, call: VoiceCall, user: string) {
  if (!voiceUserAllowed(service.config.access, user) || !voiceRoomOwned(service.config.roomPrefix, call.room)) throw new CallError('Accès à cet appel refusé.', 403);
  const person = call.members.find(m => m.id === user && m.state === 'joined');
  if (!person || call.status === 'ended') throw new CallError('Accès à cet appel refusé.', 403);
  const token = new AccessToken(service.config.key, service.config.secret, { identity: user, name: person.name, ttl: 30 });
  token.addGrant({ roomJoin: true, room: call.room, canSubscribe: true, canPublish: true, canPublishSources: [TrackSource.MICROPHONE], canPublishData: false, canUpdateOwnMetadata: false });
  return { url: service.config.url, token: await token.toJwt() };
}

// Ephemeral call signalling for the canonical single Next.js process.
// No chat history, media, credentials or microphone data is stored here.
export type VoicePerson = { id: string; name: string };
export type VoiceAccess = { title: string; group: boolean; people: VoicePerson[] };
export type CallMember = VoicePerson & { state: 'invited' | 'joined' | 'declined' | 'left'; device: string | null; seen: number };
export type VoiceCall = { id: string; conversationId: string; room: string; callerId: string; title: string; group: boolean; created: number; status: 'ringing' | 'active' | 'ended'; members: CallMember[]; reason?: string; closed?: boolean };
export class CallError extends Error {
  status: number;
  constructor(message: string, status = 409) { super(message); this.status = status; }
}
export type VoiceDependencies = {
  access: (conversationId: string, userId: string) => Promise<VoiceAccess>;
  createRoom: (room: string) => Promise<void>;
  deleteRoom: (room: string) => Promise<void>;
  removeMember: (room: string, userId: string) => Promise<void>;
  now: () => number;
  id: () => string;
  roomPrefix?: string;
};
export const CALL_RING_MS = 45_000;
export const CALL_LEASE_MS = 45_000;
export const CALL_MAX_MS = 2 * 60 * 60_000;

export class CallRegistry {
  private calls = new Map<string, VoiceCall>();
  private pending: Promise<unknown> = Promise.resolve();
  private deps: VoiceDependencies;
  private capacity: number;
  constructor(deps: VoiceDependencies, capacity = 4) { this.deps = deps; this.capacity = capacity; }
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const task = this.pending.then(work, work);
    this.pending = task.catch(() => undefined);
    return task;
  }
  private busy(user: string, except?: string) {
    return Array.from(this.calls.values()).some(c => c.id !== except && c.status !== 'ended' && c.members.some(m => m.id === user && m.state === 'joined'));
  }
  private async end(call: VoiceCall, reason: string) {
    call.status = 'ended'; call.reason = reason;
    // Retain a tombstone until SFU closure succeeds; sweep retries failures.
    await this.deps.deleteRoom(call.room);
    call.closed = true;
  }
  private async check(call: VoiceCall, user: string) {
    if (call.status === 'ended') throw new CallError('Cet appel est terminé.', 410);
    const access = await this.deps.access(call.conversationId, user);
    const current = new Set(access.people.map(p => p.id));
    if (call.members.some(m => !current.has(m.id))) {
      await this.end(call, 'access-changed');
      throw new CallError('Les accès de cette discussion ont changé.', 403);
    }
    return access;
  }
  start(user: string, conversationId: string, device: string) {
    return this.serial(async () => {
      const existing = Array.from(this.calls.values()).find(c => c.conversationId === conversationId && c.status !== 'ended');
      if (existing) {
        const member = existing.members.find(m => m.id === user);
        if (member?.state === 'joined' && member.device === device) { await this.check(existing, user); return existing; }
        throw new CallError('Un appel est déjà en cours dans cette discussion.');
      }
      if (this.busy(user)) throw new CallError('Tu es déjà dans un appel.');
      if (Array.from(this.calls.values()).filter(c => !c.closed).length >= this.capacity) throw new CallError('Les appels sont occupés. Réessaie dans un instant.', 503);
      const access = await this.deps.access(conversationId, user);
      if (access.people.length < 2) throw new CallError('Il faut au moins deux participants.');
      if (!access.group && access.people.some(p => p.id !== user && this.busy(p.id))) throw new CallError('Cette personne est déjà en appel.');
      const id = this.deps.id();
      const call: VoiceCall = { id, conversationId, room: `${this.deps.roomPrefix || 'synaura-call-'}${id}`, callerId: user, title: access.title, group: access.group, created: this.deps.now(), status: 'ringing', members: access.people.map(p => ({ ...p, state: p.id === user ? 'joined' : 'invited', device: p.id === user ? device : null, seen: this.deps.now() })) };
      // Store before the network operation so a lost CreateRoom response can be cleaned up.
      this.calls.set(id, call);
      try { await this.deps.createRoom(call.room); }
      catch (error) { call.status = 'ended'; call.reason = 'service-unavailable'; throw error; }
      return call;
    });
  }
  action(user: string, id: string, device: string, action: 'join' | 'heartbeat' | 'leave' | 'decline') {
    return this.serial(async () => {
      const call = this.calls.get(id);
      const member = call?.members.find(m => m.id === user);
      if (!call || !member) throw new CallError('Appel introuvable.', 404);
      if (call.status === 'ended') {
        if (action === 'leave' || action === 'decline') return call;
        throw new CallError('Cet appel est terminé.', 410);
      }
      if (member.state === 'joined' && member.device !== device) throw new CallError('Cet appel est ouvert dans un autre onglet ou appareil.');
      if (action === 'leave' || action === 'decline') {
        if (action === 'decline' && member.state === 'joined') throw new CallError('Quitte l’appel pour raccrocher.');
        member.state = action === 'decline' ? 'declined' : 'left'; member.device = null;
        if (!call.group || !call.members.some(m => m.state === 'joined') || (call.status === 'ringing' && !call.members.some(m => m.state === 'invited'))) await this.end(call, action);
        else await this.deps.removeMember(call.room, user);
        return call;
      }
      try { await this.check(call, user); }
      catch (error) {
        if (error instanceof CallError && error.status === 403) await this.end(call, 'access-changed');
        throw error;
      }
      if (action === 'join') {
        if (this.busy(user, id)) throw new CallError('Tu es déjà dans un appel.');
        member.state = 'joined'; member.device = device;
        if (call.members.filter(m => m.state === 'joined').length > 1) call.status = 'active';
      } else if (member.state !== 'joined') throw new CallError('Tu n’as pas rejoint cet appel.', 403);
      member.seen = this.deps.now();
      return call;
    });
  }
  list(user: string) {
    return Array.from(this.calls.values()).filter(c => c.status !== 'ended' && c.members.some(m => m.id === user && (c.group || m.state === 'invited' || m.state === 'joined'))).map(c => this.view(c, user));
  }
  view(call: VoiceCall, user: string) {
    return { id: call.id, conversationId: call.conversationId, title: call.title, group: call.group, callerId: call.callerId, status: call.status, created: call.created, mine: call.members.find(m => m.id === user)?.state, members: call.members.map(({ id, name, state }) => ({ id, name, state })) };
  }
  ownsRoom(room: string) { return Array.from(this.calls.values()).some(c => c.room === room && c.status !== 'ended'); }
  sweep() {
    return this.serial(async () => {
      for (const [id, call] of Array.from(this.calls)) {
        if (call.closed) { this.calls.delete(id); continue; }
        try {
          const now = this.deps.now();
          if (call.status === 'ended') { await this.end(call, call.reason || 'ended'); continue; }
          if (now - call.created > CALL_MAX_MS || (call.status === 'ringing' && now - call.created > CALL_RING_MS)) { await this.end(call, 'timeout'); continue; }
          // Fail closed if access cannot be checked. A later retry cleans up the room.
          try { await this.check(call, call.callerId); }
          catch { await this.end(call, 'access-changed'); continue; }
          for (const member of call.members.filter(m => m.state === 'joined' && now - m.seen > CALL_LEASE_MS)) {
            member.state = 'left'; member.device = null;
            if (!call.group) { await this.end(call, 'disconnected'); break; }
            await this.deps.removeMember(call.room, member.id);
          }
          if (!call.closed && !call.members.some(m => m.state === 'joined')) await this.end(call, 'empty');
        } catch { /* Preserve failed closures; the next sweep retries. */ }
      }
    });
  }
}

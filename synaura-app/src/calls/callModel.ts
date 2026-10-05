export type CallMemberState = 'invited' | 'joined' | 'declined' | 'left';
export type VoiceCall = {
  id: string; conversationId: string; title: string; group: boolean; callerId: string;
  created: number; status: 'ringing' | 'active' | 'ended'; mine: CallMemberState;
  members: { id: string; name: string; state: CallMemberState }[];
};
export type CallCue = 'incoming' | 'outgoing' | 'connected' | 'missed' | 'unavailable' | 'ended';
export const CALL_CUES: Record<CallCue, { resource: string; loop: boolean }> = {
  incoming: { resource: 'synaura_call_incoming', loop: true },
  outgoing: { resource: 'synaura_call_outgoing', loop: true },
  connected: { resource: 'synaura_call_connected', loop: false },
  missed: { resource: 'synaura_call_missed', loop: false },
  unavailable: { resource: 'synaura_call_unavailable', loop: false },
  ended: { resource: 'synaura_call_ended', loop: false },
};

export function incomingCall(calls: VoiceCall[], currentId?: string) {
  return calls.find(call => call.id !== currentId && call.mine === 'invited' && call.status !== 'ended') || null;
}
export function callTitle(call: VoiceCall | null, userId: string) {
  if (!call) return 'Appel vocal';
  return call.group ? call.title : call.members.find(member => member.id !== userId)?.name || 'Appel vocal';
}
// Signalling "active" alone is not proof of remote audio: wait for the RTC roster.
export function hasRemoteParticipant(ids: string[], userId: string) {
  return ids.some(id => id !== userId);
}
export function callEndedCue(connected: boolean): CallCue {
  // The existing endpoint omits ended calls and does not expose their reason.
  // Do not claim a remote refusal when timeout and cancellation look identical.
  return connected ? 'ended' : 'missed';
}
export function callClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { AudioSession, AndroidAudioTypePresets } from '@livekit/react-native';
import { Room, RoomEvent, createLocalAudioTrack, type LocalAudioTrack } from 'livekit-client';
import { useAuth } from '@/auth/AuthProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { getVoiceCalls, voiceCallAction } from '@/api/client';
import { acquireCallAudioLock } from './callAudioLock';
import { callEndedCue, hasRemoteParticipant, incomingCall, type CallCue, type VoiceCall } from './callModel';
import { playCallSound, stopCallSound, startNativeCallSession, stopNativeCallSession } from './callSounds';
import { NativeCallOverlay } from './NativeCallOverlay';
import { acquireMicrophone } from './microphoneLease';

type Phase = 'idle' | 'permission' | 'connecting' | 'waiting' | 'connected' | 'reconnecting';
type CallContext = {
  enabled: boolean; busy: boolean; engaged: boolean; current: VoiceCall | null;
  start: (conversationId: string) => void;
};
const Context = createContext<CallContext>({ enabled: false, busy: false, engaged: false, current: null, start: () => {} });
export const useNativeCalls = () => useContext(Context);

type Resources = { room: Room | null; track: LocalAudioTrack | null; release: (() => void) | null; microphoneRelease: (() => void) | null; session: boolean; call: VoiceCall | null };
export function NativeCallProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const player = usePlayer();
  const playerRef = useRef(player); playerRef.current = player;
  const userId = auth.user?.id || '';
  const allowed = Platform.OS === 'android' && Boolean(auth.token && userId && !auth.loading && !auth.mfaRequired && !auth.biometricLocked && auth.user?.profileComplete !== false);
  const [enabled, setEnabled] = useState(false);
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [current, setCurrent] = useState<VoiceCall | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [output, setOutput] = useState('');
  const [outputs, setOutputs] = useState<string[]>([]);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const device = useRef<string>(globalThis.crypto.randomUUID());
  const epoch = useRef(0);
  const pending = useRef(false);
  const ending = useRef(false);
  const resources = useRef<Resources | null>(null);
  const connected = useRef(false);
  const activeId = useRef<string | null>(null);
  const callsRef = useRef(calls); callsRef.current = calls;
  const permittedRef = useRef(allowed); permittedRef.current = allowed;
  const incoming = incomingCall(calls, current?.id);
  const previousIncoming = useRef<string | null>(null);

  const cleanup = useCallback(async (value: Resources | null, inform: boolean) => {
    if (!value) return;
    value.room?.removeAllListeners();
    value.track?.stop(); value.track = null;
    value.microphoneRelease?.(); value.microphoneRelease = null;
    if (inform && value.call) void voiceCallAction('leave', device.current, { callId: value.call.id }).catch(() => {});
    try { await value.room?.disconnect(true); } catch {}
    if (value.session) { value.session = false; await AudioSession.stopAudioSession().catch(() => {}); }
    stopNativeCallSession();
    await playerRef.current.pause().catch(() => {});
    value.release?.(); value.release = null;
  }, []);

  const end = useCallback((inform = true, cue: CallCue | null = 'ended') => {
    epoch.current++;
    const previous = resources.current; resources.current = null;
    const id = previous?.call?.id;
    activeId.current = null; connected.current = false;
    stopCallSound();
    setCurrent(null); setPhase('idle'); setExpanded(false); setConnectedAt(null);
    setConnectedIds([]); setSpeakers([]); setMuted(false); setOutput('');
    if (id) setCalls(items => items.filter(item => item.id !== id));
    ending.current = true;
    void cleanup(previous, inform).finally(() => {
      ending.current = false;
      if (cue && permittedRef.current) playCallSound(cue);
      if (!pending.current) setBusy(false);
    });
  }, [cleanup]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state !== 'active') stopCallSound();
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!allowed) { setEnabled(false); setCalls([]); end(true, null); }
    return () => { end(true, null); };
  }, [allowed, userId, end]);

  // Poll only with an authenticated, unlocked app. No phantom background ringing.
  useEffect(() => {
    if (!allowed || !foreground) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      let delay = 6000;
      const expected = activeId.current;
      try {
        const data = await getVoiceCalls();
        if (cancelled) return;
        setEnabled(data.enabled); setCalls(data.calls || []);
        if (!data.enabled) delay = 60_000;
        if (expected && activeId.current === expected) {
          const next = data.calls.find(call => call.id === expected && call.mine === 'joined');
          if (!next) end(false, callEndedCue(connected.current));
          else { if (resources.current) resources.current.call = next; setCurrent(next); }
        }
      } catch { delay = 20_000; if (!cancelled && !activeId.current) setEnabled(false); }
      finally { if (!cancelled) timer = setTimeout(poll, delay); }
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [allowed, foreground, end]);

  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false; let running = false; let failures = 0;
    const id = current.id;
    const timer = setInterval(async () => {
      if (running || cancelled || activeId.current !== id) return;
      running = true;
      try { await voiceCallAction('heartbeat', device.current, { callId: id }); failures = 0; }
      catch { if (!cancelled && activeId.current === id && ++failures >= 3) { end(true, 'unavailable'); setError('Connexion interrompue. Tu peux rappeler.'); } }
      finally { running = false; }
    }, 8000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [current?.id, end]);

  useEffect(() => {
    const id = incoming?.id || null;
    if (!allowed || !foreground || current || busy) { if (previousIncoming.current) stopCallSound(); previousIncoming.current = null; return; }
    if (id) playCallSound('incoming');
    else if (previousIncoming.current) playCallSound('missed');
    previousIncoming.current = id;
    return () => { if (previousIncoming.current === id && id) stopCallSound(); };
  }, [incoming?.id, allowed, foreground, current?.id, busy]);

  const connect = async (action: 'start' | 'join', id: string) => {
    if (!permittedRef.current || pending.current || ending.current || resources.current) return;
    pending.current = true; setBusy(true); setExpanded(true); setError(''); setPhase('permission');
    previousIncoming.current = null; stopCallSound();
    const attempt = ++epoch.current;
    const local: Resources = { room: null, track: null, release: null, microphoneRelease: null, session: false, call: null };
    resources.current = local;
    const alive = () => attempt === epoch.current && permittedRef.current && resources.current === local;
    try {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
        title: 'Microphone Synaura', message: 'Ton micro est utilisé uniquement pendant cet appel.', buttonPositive: 'Autoriser', buttonNegative: 'Annuler',
      });
      if (!alive()) return;
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Autorise le microphone dans les réglages pour appeler.');
      local.microphoneRelease = acquireMicrophone();
      if (!local.microphoneRelease) throw new Error('Termine ton enregistrement vocal avant de rejoindre cet appel.');
      local.release = acquireCallAudioLock();
      await playerRef.current.pause();
      if (!alive()) return;
      setPhase('connecting');
      await startNativeCallSession();
      if (!alive()) return;
      await AudioSession.configureAudio({ android: { preferredOutputList: ['bluetooth', 'headset', 'earpiece', 'speaker'], audioTypeOptions: AndroidAudioTypePresets.communication }, ios: { defaultOutput: 'earpiece' } });
      if (!alive()) return;
      await AudioSession.startAudioSession(); local.session = true;
      if (!alive()) return;
      const choices = await AudioSession.getAudioOutputs();
      if (!alive()) return;
      setOutputs(choices); setOutput(choices.find(item => ['bluetooth', 'headset', 'earpiece'].includes(item)) || 'speaker');
      local.track = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      if (!alive()) return;
      const data = await voiceCallAction(action, device.current, action === 'start' ? { conversationId: id } : { callId: id });
      local.call = data.call;
      if (!alive()) { void voiceCallAction('leave', device.current, { callId: data.call.id }).catch(() => {}); return; }
      if (!data.url || !data.token || !/^wss:\/\//.test(data.url)) throw new Error('Connexion sécurisée indisponible.');
      activeId.current = data.call.id; setCurrent(data.call);
      setCalls(items => items.filter(item => item.id !== data.call.id));
      const room = new Room(); local.room = room;
      const roster = () => {
        if (!alive()) return;
        const ids = [room.localParticipant.identity, ...room.remoteParticipants.keys()];
        setConnectedIds(ids);
        if (hasRemoteParticipant(ids, userId)) {
          setPhase('connected');
          if (!connected.current) { connected.current = true; setConnectedAt(Date.now()); playCallSound('connected'); }
        } else { setPhase('waiting'); if (!connected.current) playCallSound('outgoing'); }
      };
      room.on(RoomEvent.ParticipantConnected, roster);
      room.on(RoomEvent.ParticipantDisconnected, roster);
      room.on(RoomEvent.ActiveSpeakersChanged, people => { if (alive()) setSpeakers(people.map(person => person.identity)); });
      room.on(RoomEvent.Reconnecting, () => { if (alive()) { setPhase('reconnecting'); stopCallSound(); } });
      room.on(RoomEvent.Reconnected, roster);
      room.on(RoomEvent.Disconnected, () => { if (alive()) end(true, callEndedCue(connected.current)); });
      await room.connect(data.url, data.token);
      if (!alive()) return;
      await room.localParticipant.publishTrack(local.track);
      if (!alive()) return;
      setMuted(false); roster();
    } catch (caught) {
      if (alive()) {
        end(true, 'unavailable');
        setError(caught instanceof Error && !/token|wss:|https:/i.test(caught.message) ? caught.message : 'Appel impossible. Vérifie le micro et le réseau.');
      }
    } finally {
      if (!alive()) await cleanup(local, true);
      pending.current = false; setBusy(false);
    }
  };
  const start = (conversationId: string) => {
    if (resources.current) { setExpanded(true); return; }
    const existing = callsRef.current.find(call => call.conversationId === conversationId && ['invited', 'left', 'declined'].includes(call.mine));
    void connect(existing ? 'join' : 'start', existing?.id || conversationId);
  };
  const decline = async () => {
    if (!incoming || busy) return;
    const id = incoming.id;
    previousIncoming.current = null; stopCallSound(); setBusy(true);
    try { await voiceCallAction('decline', device.current, { callId: id }); setCalls(items => items.filter(item => item.id !== id)); playCallSound('unavailable'); }
    catch { setError('Impossible de refuser cet appel. Réessaie.'); }
    finally { setBusy(false); }
  };
  const mute = async () => {
    const local = resources.current; const track = local?.track;
    if (!track) return;
    try { if (track.isMuted) await track.unmute(); else await track.mute(); if (resources.current === local) setMuted(track.isMuted); }
    catch { setError('Le micro ne répond pas. Raccroche puis réessaie.'); }
  };
  const changeOutput = async (value: string) => {
    const local = resources.current;
    if (!local?.session) return;
    try {
      const available = await AudioSession.getAudioOutputs(); setOutputs(available);
      if (!available.includes(value)) { setError('Cette sortie audio n’est plus disponible.'); return; }
      await AudioSession.selectAudioOutput(value);
      if (resources.current === local) setOutput(value);
    } catch { setError('Impossible de changer la sortie audio.'); }
  };
  return <Context.Provider value={{ enabled, busy, engaged: Boolean(current || busy || incoming), current, start }}>
    {children}
    <NativeCallOverlay current={current} incoming={!current && !busy ? incoming : null} userId={userId} phase={phase}
      busy={busy} expanded={expanded} onExpand={() => setExpanded(true)} onMinimize={() => current ? setExpanded(false) : end(true, null)}
      onAccept={() => incoming && void connect('join', incoming.id)} onDecline={() => void decline()}
      onEnd={() => end(true, connected.current ? 'ended' : null)} muted={muted} onMute={() => void mute()}
      output={output} outputs={outputs} onOutput={value => void changeOutput(value)} connectedAt={connectedAt}
      connectedIds={connectedIds} speakers={speakers} error={error} onDismissError={() => setError('')} />
  </Context.Provider>;
}

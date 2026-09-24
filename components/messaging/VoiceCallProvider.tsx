'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Mic, MicOff, Minimize2, Phone, PhoneOff, Volume2 } from 'lucide-react';
import type { LocalAudioTrack, Room } from 'livekit-client';
import { getBrowserAudioCore } from '@/lib/audio/AudioCore';
import { SynauraOverlay, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';
import './voice-calls.css';

type CallView = { id: string; conversationId: string; title: string; group: boolean; callerId: string; created: number; status: 'ringing' | 'active' | 'ended'; mine: string; members: { id: string; name: string; state: string }[] };
type VoiceContext = { enabled: boolean; busy: boolean; currentConversation: string | null; start: (id: string) => void };
const Context = createContext<VoiceContext>({ enabled: false, busy: false, currentConversation: null, start: () => undefined });
export const useVoiceCalls = () => useContext(Context);

export function VoiceCallProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user?.id;
  const [enabled, setEnabled] = useState(false);
  const [calls, setCalls] = useState<CallView[]>([]);
  const [current, setCurrent] = useState<CallView | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsAudio, setNeedsAudio] = useState(false);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [connectedPeople, setConnectedPeople] = useState<string[]>([]);
  const device = useRef('');
  const callRef = useRef<CallView | null>(null);
  const roomRef = useRef<Room | null>(null);
  const microphone = useRef<LocalAudioTrack | null>(null);
  const mediaNodes = useRef(new Set<HTMLMediaElement>());
  const releaseMusic = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const busyRef = useRef(false);

  const post = useCallback(async (action: string, values: Record<string, string> = {}) => {
    const response = await fetch('/api/messages/calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, device: device.current, ...values }), signal: AbortSignal.timeout(12_000), keepalive: action === 'leave' });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(data?.error || 'Appel indisponible.'), { status: response.status });
    return data;
  }, []);
  const stop = useCallback((inform = true) => {
    generation.current += 1;
    const previous = callRef.current; callRef.current = null;
    const room = roomRef.current; roomRef.current = null;
    room?.removeAllListeners();
    microphone.current?.stop(); microphone.current = null;
    void room?.disconnect(true).catch(() => undefined);
    mediaNodes.current.forEach(node => { node.pause(); node.srcObject = null; node.remove(); }); mediaNodes.current.clear();
    // Cancel any play requested during the call before releasing the secondary lease.
    if (releaseMusic.current) { getBrowserAudioCore()?.pause(); releaseMusic.current(); releaseMusic.current = null; }
    busyRef.current = false; setBusy(false); setCurrent(null); setPhase(''); setExpanded(false); setSpeakers([]); setConnectedPeople([]); setNeedsAudio(false);
    if (inform && previous) void post('leave', { callId: previous.id }).catch(() => undefined);
  }, [post]);
  useEffect(() => {
    device.current = crypto.randomUUID();
    const leave = () => stop(); window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('pagehide', leave); stop(); };
  }, [stop]);
  useEffect(() => () => stop(), [user, stop]);

  useEffect(() => {
    if (!user) { setEnabled(false); setCalls([]); stop(); return; }
    let cancelled = false; let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      let delay = 8000;
      const expected = callRef.current?.id;
      try {
        const response = await fetch('/api/messages/calls', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('unavailable');
        const data = await response.json(); if (cancelled) return;
        setEnabled(Boolean(data.enabled)); setCalls(data.calls || []);
        if (!data.enabled) delay = 60_000;
        if (expected && callRef.current?.id === expected) {
          const fresh = data.calls?.find((c: CallView) => c.id === expected && c.mine === 'joined');
          if (!fresh) { stop(false); setError('L’appel est terminé.'); }
          else { callRef.current = fresh; setCurrent(fresh); }
        }
      } catch { if (!cancelled) { delay = 20_000; if (!callRef.current) setEnabled(false); } }
      finally { if (!cancelled) timer = setTimeout(poll, delay); }
    };
    void poll(); return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [user, stop]);

  useEffect(() => {
    if (!current?.id) return;
    let failures = 0; let running = false; let cancelled = false;
    const id = current.id;
    const beat = async () => {
      if (running || cancelled || callRef.current?.id !== id) return; running = true;
      try { await post('heartbeat', { callId: id }); failures = 0; }
      catch (e) {
        if (cancelled || callRef.current?.id !== id) return;
        failures += 1;
        const status = (e as { status?: number }).status;
        if (failures >= 3 || [401, 403, 404, 409, 410].includes(status || 0)) { stop(); setError('L’appel a été interrompu. Tu peux rappeler.'); }
      } finally { running = false; }
    };
    const timer = setInterval(() => void beat(), 8000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [current?.id, post, stop]);

  const connect = async (action: 'start' | 'join', id: string) => {
    if (busyRef.current || callRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setExpanded(true); setPhase('Autorise ton micro');
    const attempt = ++generation.current;
    let created: CallView | null = null;
    let track: LocalAudioTrack | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Le micro nécessite HTTPS et un navigateur compatible.');
      // Loaded only after an explicit call/accept gesture, never with the feed.
      const { Room, RoomEvent, Track, TrackEvent, createLocalAudioTrack } = await import('livekit-client');
      if (attempt !== generation.current) return;
      track = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      if (attempt !== generation.current) { track.stop(); return; }
      microphone.current = track;
      track.once(TrackEvent.Ended, () => { if (attempt === generation.current) { stop(); setError('Le micro a été déconnecté. Tu peux rappeler.'); } });
      document.querySelectorAll<HTMLAudioElement>('audio[data-synaura-voice]').forEach(a => a.pause());
      const core = getBrowserAudioCore(); core?.pause(); releaseMusic.current = core?.beginSecondaryPlayback('other') || null;
      setPhase('Connexion…');
      const data = await post(action, action === 'start' ? { conversationId: id } : { callId: id });
      created = data.call;
      if (attempt !== generation.current) { track.stop(); if (created) void post('leave', { callId: created.id }).catch(() => undefined); return; }
      callRef.current = created; setCurrent(created); setMuted(false);
      const room = new Room(); roomRef.current = room;
      const roster = () => setConnectedPeople([room.localParticipant.identity, ...Array.from(room.remoteParticipants.keys())]);
      room.on(RoomEvent.TrackSubscribed, incoming => {
        if (incoming.kind !== Track.Kind.Audio) return;
        const node = incoming.attach(); node.dataset.synauraAudioPolicy = 'independent'; node.hidden = true; document.body.appendChild(node); mediaNodes.current.add(node);
      });
      room.on(RoomEvent.TrackUnsubscribed, incoming => incoming.detach().forEach(node => { node.remove(); mediaNodes.current.delete(node); }));
      room.on(RoomEvent.ParticipantConnected, roster); room.on(RoomEvent.ParticipantDisconnected, roster);
      room.on(RoomEvent.ActiveSpeakersChanged, people => setSpeakers(people.map(p => p.identity)));
      room.on(RoomEvent.Reconnecting, () => setPhase('Reconnexion…'));
      room.on(RoomEvent.Reconnected, () => { setPhase('En ligne'); roster(); });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsAudio(!room.canPlaybackAudio));
      room.on(RoomEvent.Disconnected, () => { if (roomRef.current === room) { stop(); setError('L’appel est terminé.'); } });
      await room.connect(data.url, data.token);
      if (attempt !== generation.current) { track.stop(); await room.disconnect(true); return; }
      await room.localParticipant.publishTrack(track, { source: Track.Source.Microphone });
      if (attempt !== generation.current) { track.stop(); await room.disconnect(true); return; }
      try { await room.startAudio(); } catch { setNeedsAudio(true); }
      roster(); setPhase('En ligne'); busyRef.current = false; setBusy(false);
    } catch (e) {
      track?.stop();
      if (attempt !== generation.current) return;
      if (created && !callRef.current) void post('leave', { callId: created.id }).catch(() => undefined);
      stop();
      const name = e instanceof Error ? e.name : '';
      setError(name === 'NotAllowedError' ? 'Micro refusé. Autorise-le dans ton navigateur pour appeler.' : name === 'NotFoundError' ? 'Aucun micro détecté.' : e instanceof Error && 'status' in e ? e.message : 'Connexion vocale impossible. Vérifie le micro et le réseau.');
    }
  };
  const start = (id: string) => {
    if (callRef.current) { setExpanded(true); return; }
    const existing = calls.find(c => c.conversationId === id && ['invited', 'left', 'declined'].includes(c.mine));
    void connect(existing ? 'join' : 'start', existing?.id || id);
  };
  const incoming = calls.find(c => c.mine === 'invited' && c.id !== current?.id);
  const caller = incoming?.members.find(m => m.id === incoming.callerId)?.name || 'Un ami';
  const title = current?.group ? current.title : current?.members.find(m => m.id !== user)?.name || 'Appel vocal';
  const mute = async () => {
    const track = microphone.current; if (!track) return;
    try { if (track.isMuted) await track.unmute(); else await track.mute(); setMuted(track.isMuted); }
    catch { setError('Le micro ne répond pas. Raccroche puis réessaie.'); }
  };
  return <Context.Provider value={{ enabled, busy, currentConversation: current?.conversationId || null, start }}>{children}
    {error && !expanded && <div className="voice-notice" role="status"><span>{error}</span><button aria-label="Fermer le message d’appel" onClick={() => setError('')}>×</button></div>}
    {incoming && !current && !busy && <section className="voice-incoming" role="region" aria-label="Appel entrant"><div className="voice-orbit"><Phone size={22} /></div><div><strong>{caller}</strong><span>{incoming.group ? incoming.title : 'Appel vocal entrant'}</span></div><button className="voice-control danger" aria-label="Refuser l’appel" onClick={async () => { try { await post('decline', { callId: incoming.id }); setCalls(v => v.filter(c => c.id !== incoming.id)); } catch { setError('Impossible de refuser cet appel. Réessaie.'); } }}><PhoneOff size={20} /></button><button className="voice-control accept" aria-label="Accepter l’appel" onClick={() => void connect('join', incoming.id)}><Phone size={20} /></button></section>}
    {current && !expanded && <button className="voice-pill" onClick={() => setExpanded(true)} aria-label="Ouvrir l’appel en cours"><span className="voice-dot" /><Phone size={17} /><span>{title}</span>{muted && <MicOff size={16} />}</button>}
    <SynauraOverlay open={expanded && (Boolean(current) || busy)} onClose={() => current ? setExpanded(false) : stop()} presentation="responsive" size="md" showClose={false} className="voice-panel">
      <div className="voice-panel-head"><span>SYNAURA / APPEL VOCAL</span><button aria-label={current ? 'Réduire l’appel' : 'Annuler l’appel'} onClick={() => current ? setExpanded(false) : stop()}><Minimize2 size={20} /></button></div>
      <SynauraOverlayTitle>{title}</SynauraOverlayTitle>
      <p className="voice-status" role="status">{current?.status === 'ringing' && phase === 'En ligne' ? 'En attente de réponse…' : phase}</p>
      <div className="voice-people">{current?.members.filter(m => m.state === 'joined' || m.state === 'invited').map(person => <div key={person.id} className={`voice-person ${speakers.includes(person.id) ? 'speaking' : ''}`}><div>{person.name.slice(0, 1).toUpperCase()}</div><strong>{person.id === user ? 'Toi' : person.name}</strong><small>{connectedPeople.includes(person.id) ? (person.id === user && muted ? 'Micro coupé' : 'En ligne') : person.state === 'invited' ? 'Invité' : 'Connexion…'}</small></div>) || <div className="voice-orbit"><Loader2 className="animate-spin" /></div>}</div>
      {needsAudio && <button className="voice-enable" onClick={() => void roomRef.current?.startAudio().catch(() => setError('Autorise le son dans ton navigateur.'))}><Volume2 size={18} />Activer le son de l’appel</button>}
      <div className="voice-controls"><button className="voice-control" disabled={!current || busy} aria-label={muted ? 'Activer le micro' : 'Couper le micro'} aria-pressed={muted} onClick={() => void mute()}>{muted ? <MicOff /> : <Mic />}</button><button className="voice-control danger" aria-label="Raccrocher" onClick={() => stop()}><PhoneOff /></button></div>
      {error && <p className="voice-footnote" role="alert">{error}</p>}
      <p className="voice-footnote">{current?.group ? 'Tu peux réduire l’appel et continuer à discuter.' : 'Juste vos voix. La musique reste en pause.'}</p>
    </SynauraOverlay>
  </Context.Provider>;
}

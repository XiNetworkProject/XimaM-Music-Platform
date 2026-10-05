export type CallCue = 'incoming' | 'outgoing' | 'connected' | 'missed' | 'unavailable' | 'ended';
export const CALL_SOUNDS: Record<CallCue, { src: string; loop: boolean; volume: number }> = {
  incoming: { src: '/audio/calls/incoming.mp3', loop: true, volume: .65 },
  outgoing: { src: '/audio/calls/outgoing.mp3', loop: true, volume: .45 },
  connected: { src: '/audio/calls/connected.mp3', loop: false, volume: .55 },
  missed: { src: '/audio/calls/missed.mp3', loop: false, volume: .55 },
  unavailable: { src: '/audio/calls/unavailable.mp3', loop: false, volume: .55 },
  ended: { src: '/audio/calls/ended.mp3', loop: false, volume: .55 },
};

// One effects channel, separate from both the musical queue and remote microphones.
// No audio object, download or autoplay attempt until there is an actual call cue.
export class CallSounds {
  private audio: HTMLAudioElement | null = null;
  private key = '';
  private cue: CallCue | null = null;
  private expiry = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private blocked = false;
  private createAudio: () => HTMLAudioElement;
  private onBlocked: (blocked: boolean) => void;

  constructor(
    createAudio: () => HTMLAudioElement = () => new Audio(),
    onBlocked: (blocked: boolean) => void = () => {},
  ) { this.createAudio = createAudio; this.onBlocked = onBlocked; }

  play(cue: CallCue, callId: string, expiresAt = Date.now() + 45_000) {
    const key = `${callId}:${cue}`;
    if (this.key === key) return;
    this.stop();
    this.key = key;
    this.cue = cue;
    const config = CALL_SOUNDS[cue];
    this.expiry = config.loop ? expiresAt : Date.now() + 12_000;
    if (this.expiry <= Date.now()) return;
    const audio = this.createAudio(); this.audio = audio;
    audio.dataset.synauraAudioPolicy = 'independent';
    audio.preload = 'none'; audio.loop = config.loop; audio.volume = config.volume;
    audio.src = config.src;
    audio.onended = () => { if (this.audio === audio) this.stop(false); };
    audio.onerror = () => { if (this.audio === audio) this.stop(false); };
    this.timer = setTimeout(() => this.stop(false), this.expiry - Date.now());
    this.attempt(audio);
  }

  private attempt(audio: HTMLAudioElement) {
    void audio.play().then(() => {
      if (this.audio !== audio) return;
      this.blocked = false; this.onBlocked(false);
    }).catch(error => {
      if (this.audio !== audio) return;
      // Do not replay a stale one-shot at the user's next click.
      this.blocked = error?.name === 'NotAllowedError' && Boolean(this.cue && CALL_SOUNDS[this.cue].loop);
      this.onBlocked(this.blocked);
    });
  }

  retry() {
    if (this.blocked && this.audio && this.expiry > Date.now()) this.attempt(this.audio);
  }

  stop(clearKey = true) {
    clearTimeout(this.timer); this.timer = undefined;
    const audio = this.audio; this.audio = null;
    if (audio) { audio.onended = null; audio.onerror = null; audio.pause(); audio.removeAttribute('src'); audio.load(); }
    this.cue = null; this.blocked = false; this.onBlocked(false);
    if (clearKey) this.key = '';
  }
}

// The signalling API omits ended calls; a timeout and a refusal are indistinguishable.
export const remoteEndCue = (connected: boolean): CallCue => connected ? 'ended' : 'missed';

/** Passive observation only: never owns or controls a media element. */
export class PlaybackMeasurement {
  private interrupted = false;
  private active: { trackId: string; id: string; position: number; at: number; duration: number; bins: number[]; lastSent: number; dirty: boolean } | null = null;
  constructor(private send: (trackId: string, extra: Record<string, unknown>) => void) {}
  begin(trackId: string, id: string, position: number, duration: number, now: number) {
    this.flush();
    this.active = { trackId, id, position, duration, at: now, bins: Array(20).fill(0), lastSent: now, dirty: false };
    this.interrupted = false;
    return { kind: 'playback_measurement_v1', playbackId: id };
  }
  // A native seek/pause/rate change invalidates the interval, even for a short seek.
  interrupt() { this.interrupted = true; }
  observe(trackId: string, position: number, duration: number, now: number, state = { playing: true, seeking: false, rate: 1 }) {
    const a = this.active;
    if (!a || a.trackId !== trackId || ![position,duration,now].every(Number.isFinite) || duration <= 0) return;
    const elapsed = (now-a.at)/1000, delta = position-a.position;
    // Exclude seeks, pauses and gaps in observations. Missing data stays missing.
    if (!this.interrupted && state.playing && !state.seeking && Number.isFinite(state.rate) && state.rate > 0 && elapsed > 0 && elapsed <= 5 && delta > 0 && delta <= elapsed*state.rate+.25) {
      const size = duration/20;
      for (let i=0;i<20;i++) a.bins[i] = Math.min(size, a.bins[i] + Math.max(0, Math.min(position,(i+1)*size)-Math.max(a.position,i*size)));
      a.dirty = true;
    }
    a.position=position; a.at=now; a.duration=duration;
    this.interrupted = false;
    if (now-a.lastSent >= 10000) { this.flush(); a.lastSent=now; }
  }
  flush() {
    const a=this.active;
    if (!a?.dirty || a.duration<=0) return;
    a.dirty=false;
    this.send(a.trackId, {kind:'playback_measurement_v1', playbackId:a.id, heardBuckets:a.bins.flatMap((seconds,i)=>seconds>=Math.min(1,a.duration/40)?[i]:[])});
  }
  end() { this.flush(); this.active=null; }
}

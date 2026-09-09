type AudioContextConstructor = typeof AudioContext;

/**
 * Signature UI temporaire. Elle ne s'execute qu'apres un geste explicite,
 * s'arrete avant l'entree dans Live et ne touche jamais au moteur Audio Core.
 */
export async function playSynauraEntrySignature(options: { muted: boolean; reducedMotion: boolean }) {
  if (options.muted || typeof window === 'undefined') return;
  const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Context) return;

  let context: AudioContext | null = null;
  try {
    context = new Context();
    if (context.state === 'suspended') await context.resume();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.reducedMotion ? 0.025 : 0.045, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    gain.connect(context.destination);

    const notes = options.reducedMotion ? [440] : [329.63, 493.88];
    notes.forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.075);
      oscillator.connect(gain);
      oscillator.start(now + index * 0.075);
      oscillator.stop(now + 0.5);
    });

    await new Promise((resolve) => window.setTimeout(resolve, options.reducedMotion ? 180 : 330));
  } catch {
    // L'entree doit rester instantanee si Web Audio est refuse ou indisponible.
  } finally {
    if (context) void context.close().catch(() => {});
  }
}

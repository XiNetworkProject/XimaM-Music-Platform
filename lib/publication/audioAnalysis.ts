/** Browser-only, free, bounded preflight. Measurements are sample peaks, not true peak or LUFS. */
export type AudioReport = {
  state: 'checked' | 'warning' | 'error'; duration?: number; peakDb?: number; rmsDb?: number;
  silenceRatio?: number; leadingSilence?: number; trailingSilence?: number; waveform?: number[];
  messages: string[]; detailed: boolean;
};
export function measureSamples(channels: Float32Array[], sampleRate: number) {
  const length = channels[0]?.length || 0;
  if (!length || !sampleRate) throw new Error('Aucun échantillon audio.');
  let peak = 0, squares = 0, quiet = 0, clipped = 0, first = -1, last = -1;
  const waveform = new Array<number>(80).fill(0);
  for (let i = 0; i < length; i++) {
    let framePeak = 0;
    for (const channel of channels) {
      const value = Number.isFinite(channel[i]) ? Math.abs(channel[i]) : 0;
      framePeak = Math.max(framePeak, value);
      squares += value * value;
      if (value >= .999) clipped++;
    }
    peak = Math.max(peak, framePeak);
    waveform[Math.min(79, Math.floor(i / length * 80))] = Math.max(waveform[Math.min(79, Math.floor(i / length * 80))], framePeak);
    if (framePeak < .001) quiet++; else { if (first < 0) first = i; last = i; }
  }
  const db = (v: number) => v > 0 ? Math.max(-120, 20 * Math.log10(v)) : -120;
  return { peakDb: db(peak), rmsDb: db(Math.sqrt(squares / (length * channels.length))), silenceRatio: quiet / length, leadingSilence: (first < 0 ? length : first) / sampleRate, trailingSilence: (last < 0 ? length : length - last - 1) / sampleRate, clippedRatio: clipped / (length * channels.length), waveform: waveform.map(v => peak ? v / peak : 0) };
}
export function sampleWarnings(measures: ReturnType<typeof measureSamples>) {
  const warnings: string[] = [];
  if (measures.peakDb < -60) warnings.push('Le signal est presque silencieux. Vérifie que tu as choisi le bon export.');
  else if (measures.rmsDb < -32) warnings.push('Le niveau moyen est faible. Écoute le fichier avant de poursuivre.');
  if (measures.clippedRatio > .001) warnings.push('De nombreux échantillons atteignent le maximum : une saturation est possible.');
  if (measures.leadingSilence > 3) warnings.push(`${Math.round(measures.leadingSilence)} s de silence au début.`);
  if (measures.trailingSilence > 5) warnings.push(`${Math.round(measures.trailingSilence)} s de silence à la fin.`);
  return warnings;
}
export async function inspectAudioFile(file: File, signal: AbortSignal): Promise<AudioReport> {
  if (!file.size) return { state: 'error', detailed: false, messages: ['Ce fichier est vide. Choisis un autre export.'] };
  const url = URL.createObjectURL(file);
  const audio = new Audio();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const metadata = new Promise<number>((resolve, reject) => {
    const abort = () => reject(new DOMException('Annulé', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    const end = (duration?: number) => {
      signal.removeEventListener('abort', abort);
      if (duration && Number.isFinite(duration)) resolve(duration); else reject(new Error('Lecture non prise en charge par ce navigateur. Essaie un export MP3 ou WAV.'));
    };
    audio.onloadedmetadata = () => end(audio.duration);
    audio.onerror = () => end();
    timer = setTimeout(() => end(), 15000);
    audio.preload = 'metadata'; audio.src = url;
    if (signal.aborted) abort();
  });
  try {
    const duration = await metadata;
    if (signal.aborted) throw new DOMException('Annulé', 'AbortError');
    // decodeAudioData expands the entire file in memory. Do not exhaust mobile devices.
    if (file.size > 24 * 1024 * 1024 || duration > 360) return { state: 'warning', duration, detailed: false, messages: ['Lecture et durée reconnues. Analyse des niveaux non effectuée pour préserver la mémoire de ton appareil.'] };
    try {
      const context = new OfflineAudioContext(2, 1, 44100);
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      if (signal.aborted) throw new DOMException('Annulé', 'AbortError');
      const metrics = measureSamples(Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i)), buffer.sampleRate);
      const warnings = sampleWarnings(metrics);
      return { state: warnings.length ? 'warning' : 'checked', duration, detailed: true, ...metrics, messages: warnings.length ? warnings : ['Fichier décodé. Aucun avertissement détecté sur les niveaux et les silences.'] };
    } catch (error) {
      if (signal.aborted) throw error;
      return { state: 'warning', duration, detailed: false, messages: ['Lecture reconnue, mais analyse détaillée indisponible dans ce navigateur. Écoute le morceau avant de confirmer.'] };
    }
  } catch (error) {
    if (signal.aborted) throw error;
    return { state: 'error', detailed: false, messages: [error instanceof Error ? error.message : 'Ce fichier ne peut pas être lu.'] };
  } finally { clearTimeout(timer); audio.onloadedmetadata = null; audio.onerror = null; audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); }
}

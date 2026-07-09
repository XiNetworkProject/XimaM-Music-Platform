// Génération d'une vraie waveform à partir du fichier audio (Web Audio API),
// jamais de barres aléatoires. Un seul point d'entrée, réutilisable par tout
// composant qui a besoin de peaks (lecteur plein écran, mini lecteur, cartes).

export const WAVEFORM_TARGET_PEAKS = 180;

export type WaveformPeaks = { peaks: number[]; duration: number };

/** Décode le fichier audio réel et calcule des peaks normalisés (0..1) par
 * moyenne d'amplitude absolue sur des tranches égales du morceau. */
export async function computeWaveformPeaks(
  audioUrl: string,
  targetPeaks: number = WAVEFORM_TARGET_PEAKS,
): Promise<WaveformPeaks> {
  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error(`Audio inaccessible (${response.status})`);
  const arrayBuffer = await response.arrayBuffer();

  const AudioContextCtor: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) throw new Error('Web Audio API indisponible');
  const ctx = new AudioContextCtor();

  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const total = channelData.length;
    const samplesPerPeak = Math.max(1, Math.floor(total / targetPeaks));
    const stride = Math.max(1, Math.floor(samplesPerPeak / 400)); // échantillonnage pour rester rapide sur les gros fichiers

    const rawPeaks: number[] = [];
    for (let i = 0; i < targetPeaks; i += 1) {
      const start = i * samplesPerPeak;
      const end = Math.min(total, start + samplesPerPeak);
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j += stride) {
        sum += Math.abs(channelData[j]);
        count += 1;
      }
      rawPeaks.push(count > 0 ? sum / count : 0);
    }

    const max = rawPeaks.reduce((m, v) => Math.max(m, v), 0) || 1;
    const peaks = rawPeaks.map((v) => Math.min(1, v / max));
    return { peaks, duration: audioBuffer.duration };
  } finally {
    ctx.close().catch(() => {});
  }
}

/** Downsample un tableau de peaks déjà calculé vers un nombre de barres plus
 * petit (ex: carte compacte) sans redécoder l'audio. */
export function downsamplePeaks(peaks: number[], targetCount: number): number[] {
  if (peaks.length <= targetCount) return peaks;
  const bucket = peaks.length / targetCount;
  const result: number[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let sum = 0;
    for (let j = start; j < end && j < peaks.length; j += 1) sum += peaks[j];
    result.push(sum / Math.max(1, end - start));
  }
  return result;
}

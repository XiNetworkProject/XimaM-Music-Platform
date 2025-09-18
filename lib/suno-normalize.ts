// src/lib/suno-normalize.ts
export type Track = {
  id: string;
  title?: string;
  audio?: string;      // lien .mp3/.m4a prêt à lire/télécharger
  stream?: string;     // lien streaming (peut arriver plus tôt)
  image?: string;      // cover
  duration?: number;   // en secondes
  raw?: any;           // payload brut si tu veux le stocker
};

export function normalizeSunoItem(item: any): Track {
  // Supporte webhook (snake_case) ET polling (camelCase)
  const id = item.id ?? item.audioId ?? item.trackId ?? crypto.randomUUID();
  
  // Convertir la durée en entier (secondes)
  let duration: number | undefined;
  if (item.duration !== undefined) {
    const durationValue = parseFloat(item.duration);
    if (!isNaN(durationValue)) {
      duration = Math.round(durationValue);
    }
  }
  
  return {
    id,
    title: item.title ?? item.promptTitle ?? undefined,
    audio: item.audio_url ?? item.audioUrl ?? item.source_audio_url ?? item.sourceAudioUrl,
    stream: item.stream_audio_url ?? item.streamAudioUrl ?? item.source_stream_audio_url ?? item.sourceStreamAudioUrl,
    image: item.image_url ?? item.imageUrl ?? item.source_image_url ?? item.sourceImageUrl,
    duration,
    raw: item,
  };
}

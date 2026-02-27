/**
 * Transcription audio → paroles (OpenAI Whisper).
 * Utilisé à l'upload pour récupérer automatiquement les paroles du son.
 * Variable d'environnement : OPENAI_API_KEY
 */

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

export async function transcribeAudioFromUrl(audioUrl: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    console.warn('⚠️ OPENAI_API_KEY manquant : pas de transcription automatique.');
    return null;
  }

  try {
    const res = await fetch(audioUrl, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('⚠️ Échec fetch audio pour transcription:', res.status, audioUrl);
      return null;
    }

    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'audio/mpeg';
    const blob = new Blob([buf], { type: contentType });
    const filename = audioUrl.includes('.mp3') ? 'audio.mp3' : audioUrl.includes('.m4a') ? 'audio.m4a' : 'audio.webm';

    const form = new FormData();
    form.append('file', blob, filename);
    form.append('model', 'whisper-1');

    const tr = await fetch(WHISPER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!tr.ok) {
      const err = await tr.text();
      console.warn('⚠️ Whisper API error:', tr.status, err);
      return null;
    }

    const data = (await tr.json()) as { text?: string };
    const text = typeof data?.text === 'string' ? data.text.trim() : null;
    if (text) console.log('✅ Transcription Whisper OK, longueur:', text.length);
    return text || null;
  } catch (e) {
    console.warn('⚠️ Erreur transcription:', e);
    return null;
  }
}

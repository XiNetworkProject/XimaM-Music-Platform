type MuxCreateLiveStreamResponse = {
  data?: {
    id?: string;
    stream_key?: string;
    playback_ids?: Array<{ id?: string }>;
  };
};

type MuxLiveStreamResponse = {
  data?: {
    id?: string;
    status?: string; // "idle" | "active" | "disabled" (per Mux docs)
    playback_ids?: Array<{ id?: string }>;
  };
};

function muxAuthHeader() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) return null;
  const b64 = Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64');
  return `Basic ${b64}`;
}

export function isMuxConfigured() {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

export function muxPlaybackUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export async function muxCreateLiveStream(opts?: { name?: string }) {
  const auth = muxAuthHeader();
  if (!auth) throw new Error('MUX_TOKEN_ID / MUX_TOKEN_SECRET manquants');

  const res = await fetch('https://api.mux.com/video/v1/live-streams', {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    // Important: on n'ajoute pas new_asset_settings => pas de replay/VOD.
    body: JSON.stringify({
      playback_policy: ['public'],
      ...(opts?.name ? { name: opts.name } : {}),
    }),
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => ({}))) as MuxCreateLiveStreamResponse & { error?: any };
  if (!res.ok) {
    throw new Error(
      `Mux create live-stream failed (${res.status}): ${
        (json as any)?.error?.message || JSON.stringify(json).slice(0, 300)
      }`,
    );
  }

  const id = json?.data?.id || null;
  const streamKey = json?.data?.stream_key || null;
  const playbackId = json?.data?.playback_ids?.[0]?.id || null;
  return { id, streamKey, playbackId };
}

export async function muxGetLiveStream(liveStreamId: string) {
  const auth = muxAuthHeader();
  if (!auth) throw new Error('MUX_TOKEN_ID / MUX_TOKEN_SECRET manquants');

  const res = await fetch(`https://api.mux.com/video/v1/live-streams/${encodeURIComponent(liveStreamId)}`, {
    method: 'GET',
    headers: { Authorization: auth },
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => ({}))) as MuxLiveStreamResponse & { error?: any };
  if (!res.ok) {
    throw new Error(
      `Mux get live-stream failed (${res.status}): ${
        (json as any)?.error?.message || JSON.stringify(json).slice(0, 300)
      }`,
    );
  }

  const status = String(json?.data?.status || '');
  return { status };
}


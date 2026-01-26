export const SYNAURA_TV_TABLE = 'synaura_tv_settings' as const;

export type SynauraTvProvider = 'mux' | 'manual';

export type SynauraTvSettingsRow = {
  id: number;
  provider: SynauraTvProvider | string | null;
  enabled: boolean | null;
  playback_url: string | null;
  rtmp_url: string | null;
  stream_key: string | null;
  mux_live_stream_id: string | null;
  mux_playback_id: string | null;
  updated_at: string | null;
};

export const DEFAULT_MUX_RTMPS_URL = 'rtmps://global-live.mux.com:443/app';


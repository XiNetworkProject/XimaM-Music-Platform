'use client';

import { useMemo, useState } from 'react';
import { Copy, Heart, Play, Wand2 } from 'lucide-react';
import { useStudioStore } from '@/lib/studio/store';
import { getSelectedTrack } from '@/lib/studio/selectors';
import { useAudioPlayer } from '@/app/providers';
import ABCompare from './ABCompare';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

export default function Inspector() {
  const tracks = useStudioStore((s) => s.tracks);
  const selectedTrackId = useStudioStore((s) => s.selectedTrackId);
  const setAB = useStudioStore((s) => s.setAB);
  const loadTrackIntoForm = useStudioStore((s) => s.loadTrackIntoForm);
  const toggleFavoriteLocal = useStudioStore((s) => s.toggleFavoriteLocal);

  const t = getSelectedTrack(tracks, selectedTrackId);
  const { playTrack } = useAudioPlayer();

  const [tab, setTab] = useState<'details' | 'prompt' | 'lyrics' | 'ab'>('details');

  const playerTrack = useMemo(() => {
    if (!t) return null;
    return {
      _id: `ai-${t.id}`,
      title: t.title,
      artist: { _id: 'ai', name: t.artistName, username: t.artistName },
      duration: t.durationSec || 120,
      audioUrl: t.audioUrl || '',
      coverUrl: t.coverUrl || '/synaura_symbol.svg',
      genre: ['IA', 'Généré'],
      plays: 0,
      likes: [],
      comments: [],
      lyrics: (t.lyrics || t.prompt || '').trim(),
    } as any;
  }, [t]);

  return (
    <div className="panel-suno h-full min-h-0 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border-secondary">
        <div className="text-[11px] text-foreground-tertiary">RIGHT DOCK</div>
        <div className="text-sm font-semibold text-foreground-primary">Inspector</div>
      </div>

      {!t ? (
        <div className="p-4 text-sm text-foreground-tertiary">Sélectionne une track.</div>
      ) : (
        <>
          <div className="p-3 border-b border-border-secondary flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl border border-border-secondary bg-white/5 overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.coverUrl || '/synaura_symbol.svg'} alt={t.title} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-foreground-primary truncate">{t.title}</div>
              <div className="text-[11px] text-foreground-tertiary truncate">{t.model}</div>
            </div>
            <button
              type="button"
              className="h-9 w-9 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
              onClick={() => playerTrack && playTrack(playerTrack)}
              title="Play"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
              onClick={() => toggleFavoriteLocal(t.id)}
              title="Favorite"
            >
              <Heart className={`w-4 h-4 ${t.isFavorite ? 'text-pink-400' : ''}`} />
            </button>
          </div>

          <div className="px-3 pt-3 flex items-center gap-2">
            <button
              type="button"
              className={`h-8 px-3 rounded-xl border text-xs transition ${
                tab === 'details' ? 'border-white/20 bg-white/10' : 'border-border-secondary bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setTab('details')}
            >
              Details
            </button>
            <button
              type="button"
              className={`h-8 px-3 rounded-xl border text-xs transition ${
                tab === 'prompt' ? 'border-white/20 bg-white/10' : 'border-border-secondary bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setTab('prompt')}
            >
              Prompt
            </button>
            <button
              type="button"
              className={`h-8 px-3 rounded-xl border text-xs transition ${
                tab === 'lyrics' ? 'border-white/20 bg-white/10' : 'border-border-secondary bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setTab('lyrics')}
            >
              Lyrics
            </button>
            <button
              type="button"
              className={`h-8 px-3 rounded-xl border text-xs transition ${
                tab === 'ab' ? 'border-white/20 bg-white/10' : 'border-border-secondary bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setTab('ab')}
            >
              A/B
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            {tab === 'details' ? (
              <div className="grid gap-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border-secondary bg-white/5 p-3">
                    <div className="text-[11px] text-foreground-tertiary">Created</div>
                    <div className="text-foreground-secondary">{new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl border border-border-secondary bg-white/5 p-3">
                    <div className="text-[11px] text-foreground-tertiary">Duration</div>
                    <div className="text-foreground-secondary">{t.durationSec ? `${t.durationSec}s` : '—'}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-border-secondary bg-white/5 p-3">
                  <div className="text-[11px] text-foreground-tertiary">Tags</div>
                  <div className="text-foreground-secondary">{(t.tags || []).join(', ') || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm flex items-center gap-2"
                    onClick={() => copyText(t.prompt || '')}
                  >
                    <Copy className="w-4 h-4" />
                    Copy prompt
                  </button>
                  <button
                    type="button"
                    className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm flex items-center gap-2"
                    onClick={() => {
                      loadTrackIntoForm(t.id);
                    }}
                  >
                    <Wand2 className="w-4 h-4" />
                    Load into form
                  </button>
                </div>
              </div>
            ) : null}

            {tab === 'prompt' ? (
              <div className="rounded-xl border border-border-secondary bg-white/5 p-3 text-sm whitespace-pre-wrap">
                {t.prompt || '—'}
              </div>
            ) : null}

            {tab === 'lyrics' ? (
              <div className="rounded-xl border border-border-secondary bg-white/5 p-3 text-sm whitespace-pre-wrap">
                {t.lyrics || '—'}
              </div>
            ) : null}

            {tab === 'ab' ? (
              <div className="grid gap-3">
                <div className="rounded-xl border border-border-secondary bg-white/5 p-3 text-sm">
                  <div className="text-[11px] text-foreground-tertiary mb-2">Pick A/B</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm"
                      onClick={() => setAB(t.id, null)}
                    >
                      Set as A
                    </button>
                    <button
                      type="button"
                      className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm"
                      onClick={() => setAB(null, t.id)}
                    >
                      Set as B
                    </button>
                  </div>
                </div>
                <ABCompare />
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}


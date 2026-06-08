'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

type MobileRelease = {
  versionName: string;
  versionCode: number;
  title: string;
  releaseNotes: string[];
  apkUrl: string;
  sizeBytes: number;
  publishedAt: string;
};

const PUBLIC_MANIFEST_URL = 'https://ekddunxvtatdvxbszcsh.supabase.co/storage/v1/object/public/mobile-releases/latest.json';

function formatBytes(bytes: number) {
  if (!bytes) return 'APK Android';
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export default function AndroidDownloadCard({ compact = false }: { compact?: boolean }) {
  const [release, setRelease] = useState<MobileRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch('/api/mobile/releases/latest', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.release) throw new Error('Release indisponible');
      setRelease(payload.release);
    } catch {
      try {
        const response = await fetch(PUBLIC_MANIFEST_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error('Manifest indisponible');
        setRelease(await response.json());
      } catch {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-[1.5rem] bg-black/[0.045]">
        <Loader2 className="h-6 w-6 animate-spin text-black/40" />
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="rounded-[1.5rem] bg-black/[0.045] p-5">
        <p className="text-base font-black text-[#171313]">Le téléchargement sera bientôt disponible.</p>
        <p className="mt-2 text-sm font-bold leading-6 text-black/48">Aucune version Android publique n’est encore enregistrée.</p>
        <button onClick={() => void load()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-4 text-xs font-black text-white">
          <RefreshCw className="h-4 w-4" /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7c5cff]">Dernière version</p>
          <h2 className="mt-1 text-2xl font-black text-[#171313]">Synaura {release.versionName}</h2>
          <p className="mt-1 text-xs font-bold text-black/45">Build {release.versionCode} · {formatBytes(release.sizeBytes)}</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-[#7c5cff]/10 text-[#7c5cff]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      </div>

      {!compact && release.releaseNotes.length ? (
        <div className="space-y-2 rounded-[1.25rem] bg-black/[0.04] p-4">
          {release.releaseNotes.slice(0, 6).map((note) => (
            <div key={note} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6f61]" />
              <p className="text-xs font-bold leading-5 text-black/60">{note}</p>
            </div>
          ))}
        </div>
      ) : null}

      <a
        href={release.apkUrl}
        download
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white shadow-[0_14px_32px_rgba(23,19,19,0.18)] transition hover:scale-[1.01]"
      >
        <Download className="h-4 w-4" />
        Télécharger Synaura Android
      </a>
      <p className="flex items-center justify-center gap-1.5 text-center text-[10px] font-black text-black/38">
        <ShieldCheck className="h-3.5 w-3.5" /> APK officiel signé par Synaura
      </p>
    </div>
  );
}

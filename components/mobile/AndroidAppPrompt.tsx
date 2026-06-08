'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download, X } from 'lucide-react';

type PromptRelease = {
  versionName: string;
  versionCode: number;
  apkUrl: string;
};

const DISMISS_KEY = 'synaura.android-prompt-dismissed';
const PUBLIC_MANIFEST_URL = 'https://ekddunxvtatdvxbszcsh.supabase.co/storage/v1/object/public/mobile-releases/latest.json';

export default function AndroidAppPrompt() {
  const [release, setRelease] = useState<PromptRelease | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isAndroid || isStandalone) return;

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/mobile/releases/latest', { cache: 'no-store' });
        const payload = await response.json();
        let nextRelease = payload?.release as PromptRelease | undefined;
        if (!response.ok || !nextRelease) {
          const fallback = await fetch(PUBLIC_MANIFEST_URL, { cache: 'no-store' });
          if (!fallback.ok) return;
          nextRelease = await fallback.json() as PromptRelease;
        }
        if (localStorage.getItem(DISMISS_KEY) === String(nextRelease.versionCode)) return;
        setRelease(nextRelease);
        setVisible(true);
      } catch {
        // The website stays silent when no public Android release exists.
      }
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible || !release) return null;

  const close = () => {
    localStorage.setItem(DISMISS_KEY, String(release.versionCode));
    setVisible(false);
  };

  return (
    <aside className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-[80] mx-auto max-w-md rounded-[1.35rem] border border-black/[0.09] bg-[#fffaf2]/95 p-3 shadow-[0_20px_60px_rgba(23,19,19,0.24)] backdrop-blur-2xl sm:bottom-5 sm:left-auto sm:right-5 sm:mx-0 sm:w-[390px]">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] bg-white shadow-[0_8px_20px_rgba(23,19,19,0.1)]">
          <Image src="/brand/2026/synaura-symbol-2026.png" alt="" width={42} height={42} className="h-10 w-10 object-contain" unoptimized />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#171313]">Synaura existe aussi en app</p>
          <p className="mt-0.5 truncate text-[10px] font-bold text-black/46">Audio en arrière-plan · version {release.versionName}</p>
        </div>
        <button onClick={close} aria-label="Fermer" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/[0.055] text-black/50">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Link href="/download" className="inline-flex h-10 items-center justify-center rounded-full bg-black/[0.055] px-4 text-xs font-black text-black/60">
          Voir les détails
        </Link>
        <a href={release.apkUrl} download className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#171313] px-4 text-xs font-black text-white">
          <Download className="h-3.5 w-3.5" /> Installer
        </a>
      </div>
    </aside>
  );
}

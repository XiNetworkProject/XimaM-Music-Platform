"use client";

import { PrimeStageBackground } from "@/components/PrimeStageBackground";

export default function StarAcademyTiktokPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Fullscreen fixed layers (z-index -50 to -44), pointer-events none */}
      <PrimeStageBackground intensity={1} />

      {/* Content above the background */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <h1 className="text-center text-3xl font-bold tracking-tight text-white drop-shadow-lg md:text-4xl">
            Star Academy TikTok
          </h1>
          <p className="mt-3 text-center text-white/80">
            Prime Stage — fond animé sur toute la page, sans coupure.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="/star-academy-tiktok/inscription"
              className="rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Inscription auditions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

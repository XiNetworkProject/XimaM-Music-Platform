import React from 'react';

export default function SubscriptionsPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-y-auto theme-suno">
      <div className="absolute top-0 left-0 h-full w-full -z-10">
        <div className="aurora-bg" aria-hidden>
          <div className="aurora-layer aurora-1" />
          <div className="aurora-layer aurora-2" />
          <div className="aurora-layer aurora-3" />
          <div className="aurora-vignette" />
        </div>
      </div>
      <main className="relative z-10 w-full max-w-[1280px] p-4 sm:p-6">
        <h1 className="text-center text-3xl md:text-4xl font-semibold text-[var(--text)]">Manage your plan</h1>
      </main>
    </div>
  );
}
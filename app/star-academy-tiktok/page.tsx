"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ── Countdown ─────────────────────────────────────────────
const DEADLINE = new Date("2026-09-01T23:59:59");

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, target.getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  const s = Math.floor(diff / 1000);
  return {
    days:    Math.floor(s / 86400),
    hours:   Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    closed:  diff === 0,
  };
}

function Pad({ n }: { n: number }) {
  return <>{String(n).padStart(2, "0")}</>;
}

export default function StarAcademyLandingPage() {
  const cd = useCountdown(DEADLINE);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/star-academy/status?count=1")
      .then(r => r.json())
      .then(d => { if (typeof d.total === "number") setCount(d.total); })
      .catch(() => {});
  }, []);

  const steps = [
    {
      num: "01", title: "Inscription",
      desc: "Remplis le formulaire en 5 min et uploade ton CV vocal (20–60 sec).",
    },
    {
      num: "02", title: "Pre-selection",
      desc: "Notre equipe ecoute chaque candidature et valide les profils manuellement.",
    },
    {
      num: "03", title: "Live TikTok",
      desc: "Si retenu(e), tu passes en live avec challenges, evaluations et public.",
    },
    {
      num: "04", title: "Prime et Progression",
      desc: "Epreuves speciales, montee en notoriete et recompenses a la cle.",
    },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: "#07000f" }}>

      {/* ── Lumières d'ambiance ─────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(147,51,234,0.8) 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.7) 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(0,242,234,0.6) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div className="relative z-10">

        {/* ══════════════════════════════════════
            NAV
        ══════════════════════════════════════ */}
        <nav className="sticky top-0 z-30 border-b border-white/5 backdrop-blur-xl"
          style={{ background: "rgba(7,0,15,0.80)" }}>
          <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="text-xs font-semibold text-white/40 hover:text-white transition uppercase tracking-widest">
              Synaura
            </Link>

            {/* Logos centraux */}
            <div className="hidden sm:flex items-center gap-4">
              <Image src="/StarAcRes/sa-logo.png" alt="Star Academy TikTok" width={80} height={30}
                className="object-contain"
                style={{ filter: "drop-shadow(0 0 8px rgba(147,51,234,0.5)) brightness(1.2)" }} />
              <span className="text-white/20 text-lg font-thin">×</span>
              <Image src="/StarAcRes/mixxpartywhitelog.png" alt="Mixx Party" width={70} height={28}
                className="object-contain"
                style={{ filter: "brightness(0) invert(1) opacity(0.7)" }} />
              <span className="text-white/20 text-lg font-thin">×</span>
              <Image src="/synaura_logotype.svg" alt="Synaura" width={70} height={22}
                className="object-contain"
                style={{ filter: "brightness(0) invert(1) opacity(0.7)" }} />
            </div>

            <div className="flex items-center gap-2">
              <Link href="/star-academy-tiktok/suivi"
                className="hidden sm:block text-xs text-white/45 hover:text-white transition font-medium">
                Suivi
              </Link>
              <Link href="/star-academy-tiktok/inscription-staff"
                className="hidden sm:block rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition">
                Devenir Staff
              </Link>
              <Link href="/star-academy-tiktok/inscription"
                className="rounded-xl px-4 py-2 text-xs font-black text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(90deg,#7c3aed,#db2777)" }}>
                Candidater
              </Link>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════
            HERO — Bannière principale
        ══════════════════════════════════════ */}
        <section className="relative overflow-hidden" style={{ minHeight: "85vh" }}>
          {/* Image fond */}
          <Image
            src="/StarAcRes/sa-banner.jpg"
            alt="Star Academy TikTok Synaura — Nouvelle Saison 2026"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          {/* Gradient sombre — haut + bas */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(7,0,15,0.6) 0%, rgba(7,0,15,0.1) 30%, rgba(7,0,15,0.15) 60%, rgba(7,0,15,0.95) 100%)" }} />
          {/* Haze violet gauche */}
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 15% 60%, rgba(147,51,234,0.3) 0%, transparent 55%)" }} />

          {/* Contenu hero */}
          <div className="absolute inset-0 flex flex-col justify-end px-6 pb-14 max-w-6xl mx-auto w-full">
            <div className="max-w-xl">
              {/* Badge live */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ec4899]/40 bg-[#ec4899]/15 px-3 py-1.5 mb-5 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec4899] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ec4899]" />
                </span>
                <span className="text-[10px] font-black text-[#ec4899] uppercase tracking-widest">Auditions ouvertes · Live 2026</span>
              </div>

              {/* Titre */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-none mb-4"
                style={{ textShadow: "0 4px 30px rgba(0,0,0,0.8)" }}>
                <span className="block text-white">Star Academy</span>
                <span className="block mt-1"
                  style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899,#9333ea)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  TikTok
                </span>
              </h1>

              <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-6 max-w-md">
                Le premier concours musical en Live TikTok organise par Synaura et Mixx Party.
                Montre ton talent, progresse en direct.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/star-academy-tiktok/inscription"
                  className="rounded-2xl px-7 py-3.5 font-black text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
                  style={{ background: "linear-gradient(90deg,#7c3aed,#9333ea,#db2777)", boxShadow: "0 0 30px rgba(147,51,234,0.4), 0 4px 15px rgba(0,0,0,0.5)" }}>
                  Candidater maintenant
                </Link>
                <Link href="/star-academy-tiktok/suivi"
                  className="rounded-2xl border border-white/15 bg-black/30 backdrop-blur-sm px-7 py-3.5 font-semibold text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all">
                  Suivre ma candidature
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            PARTENAIRES
        ══════════════════════════════════════ */}
        <section className="border-y border-white/5 py-6"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-14">
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Organise par</p>
              <Image src="/synaura_logotype.svg" alt="Synaura" width={100} height={28}
                className="object-contain"
                style={{ filter: "brightness(0) invert(1) opacity(0.55)" }} />
            </div>
            <span className="text-white/10 text-2xl font-thin hidden md:block">×</span>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">En partenariat</p>
              <Image src="/StarAcRes/mixxpartywhitelog.png" alt="Mixx Party" width={100} height={38}
                className="object-contain"
                style={{ filter: "brightness(0) invert(1) opacity(0.55)" }} />
            </div>
            <span className="text-white/10 text-2xl font-thin hidden md:block">×</span>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Le concours</p>
              <Image src="/StarAcRes/sa-logo.png" alt="Star Academy TikTok" width={110} height={40}
                className="object-contain"
                style={{ filter: "drop-shadow(0 0 8px rgba(147,51,234,0.4)) brightness(1.1)" }} />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            COUNTDOWN
        ══════════════════════════════════════ */}
        <section className="px-5 py-14 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-[#f59e0b]/15 p-7 md:p-10"
            style={{ background: "rgba(255,255,255,0.025)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }}>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black text-white"
                style={{ background: "linear-gradient(135deg,#f59e0b,#ec4899)" }}>
                SA
              </div>
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,rgba(245,158,11,0.4),transparent)" }} />
            </div>

            <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#f59e0b]/70 mb-6">
              {cd.closed ? "Inscriptions fermees" : "Fermeture des candidatures dans"}
            </p>

            {!cd.closed && (
              <div className="flex justify-center gap-5 md:gap-10 text-center">
                {[
                  { v: cd.days,    l: "Jours" },
                  { v: cd.hours,   l: "Heures" },
                  { v: cd.minutes, l: "Min" },
                  { v: cd.seconds, l: "Sec" },
                ].map(({ v, l }, i) => (
                  <div key={l} className="flex flex-col items-center">
                    <div className="relative">
                      {i < 3 && (
                        <span className="absolute -right-3 md:-right-5 top-1/2 -translate-y-1/2 text-2xl md:text-4xl font-black text-[#f59e0b]/40">:</span>
                      )}
                      <div className="text-4xl md:text-6xl font-black text-white tabular-nums"
                        style={{ textShadow: "0 0 30px rgba(245,158,11,0.4)" }}>
                        <Pad n={v} />
                      </div>
                    </div>
                    <div className="text-[10px] text-white/30 mt-2 uppercase tracking-widest font-medium">{l}</div>
                  </div>
                ))}
              </div>
            )}

            {count !== null && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #4ade80" }} />
                <p className="text-xs text-white/35">
                  <span className="text-white font-bold">{count}</span> candidature{count > 1 ? "s" : ""} reçue{count > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════
            RECOMPENSES
        ══════════════════════════════════════ */}
        <section className="px-5 py-12 max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-2">Ce que tu gagnes</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Recompenses</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gagnants */}
            <div className="rounded-3xl border border-[#f59e0b]/20 p-6 sm:p-8 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(236,72,153,0.05))", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(245,158,11,0.5),transparent)" }} />
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl shrink-0 flex items-center justify-center text-base font-black text-white"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#ec4899)" }}>
                  1er
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#f59e0b]/70 uppercase tracking-widest mb-1">Gagnants du Live</p>
                  <p className="text-xl font-black text-white mb-1">3 mois Premium Synaura</p>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Actives automatiquement sur ton compte Synaura apres la victoire.
                  </p>
                </div>
              </div>
            </div>
            {/* Retenus */}
            <div className="rounded-3xl border border-violet-500/15 p-6 sm:p-8 relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.025)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(147,51,234,0.4),transparent)" }} />
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl shrink-0 flex items-center justify-center text-base font-black text-white"
                  style={{ background: "linear-gradient(135deg,#9333ea,#db2777)" }}>
                  SA
                </div>
                <div>
                  <p className="text-[10px] font-bold text-violet-400/70 uppercase tracking-widest mb-1">Candidats retenus</p>
                  <p className="text-xl font-black text-white mb-1">1 mois Premium Synaura</p>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Pour chaque candidat selectionne pour participer aux epreuves en live.
                  </p>
                </div>
              </div>
            </div>
            {/* Visibilité */}
            <div className="rounded-3xl border border-[#00f2ea]/10 p-6 relative overflow-hidden"
              style={{ background: "rgba(0,242,234,0.03)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }}>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: "rgba(0,242,234,0.1)", border: "1px solid rgba(0,242,234,0.2)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,242,234,0.7)" strokeWidth="2">
                    <path d="M22.54 6.42a2.78 2.78 0 00-1.94-1.95C18.88 4 12 4 12 4s-6.88 0-8.6.47A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.94 1.95C5.12 20 12 20 12 20s6.88 0 8.6-.47a2.78 2.78 0 001.94-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-black text-white mb-0.5">Visibilite TikTok Live</p>
                  <p className="text-xs text-white/40">Audience en direct sur les comptes officiels</p>
                </div>
              </div>
            </div>
            {/* Profil boosté */}
            <div className="rounded-3xl border border-white/[0.06] p-6 relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.025)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }}>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: "rgba(147,51,234,0.1)", border: "1px solid rgba(147,51,234,0.2)" }}>
                  <Image src="/synaura_symbol.svg" alt="" width={18} height={18}
                    style={{ filter: "brightness(0) invert(1) opacity(0.7)" }} />
                </div>
                <div>
                  <p className="text-sm font-black text-white mb-0.5">Mise en avant Artiste</p>
                  <p className="text-xs text-white/40">Profil booste sur la plateforme Synaura</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            ETAPES
        ══════════════════════════════════════ */}
        <section className="px-5 py-12 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-2">Deroulement</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Comment ca marche</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <div key={step.num} className="rounded-3xl border border-white/[0.06] p-5 relative overflow-hidden group hover:border-violet-500/20 transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.025)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }}>
                {/* Top border gradient on hover */}
                <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(147,51,234,0.5),transparent)" }} />
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>
                    {step.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block flex-1 h-px"
                      style={{ background: "linear-gradient(90deg,rgba(147,51,234,0.3),transparent)" }} />
                  )}
                </div>
                <h3 className="font-black text-white text-sm mb-2">{step.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            CATEGORIES
        ══════════════════════════════════════ */}
        <section className="px-5 py-10 max-w-4xl mx-auto text-center">
          <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-2">Categories candidats</p>
          <h2 className="text-xl sm:text-2xl font-black text-white mb-6">
            Chant, Rap & Mix vocal
          </h2>
          <p className="text-sm text-white/40 mb-6 max-w-lg mx-auto leading-relaxed">
            Comme la vraie Star Academy, le concours se concentre sur la voix.
            Les DJs/producteurs sont acceptes uniquement s&apos;ils integrent du chant ou du vocal dans leur performance.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 mb-6">
            {[
              { label: "Chant Solo", hot: true },
              { label: "Rap / Spoken Word", hot: true },
              { label: "Cover / Reprise", hot: false },
              { label: "Mix avec Vocal", hot: false },
              { label: "Duo / Groupe", hot: false },
            ].map(c => (
              <span key={c.label}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition-all cursor-default ${
                  c.hot
                    ? "border-violet-500/30 text-violet-300 bg-violet-500/10"
                    : "border-white/10 text-white/60 hover:border-violet-500/30 hover:text-white/80"
                }`}
                style={{ WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)" }}>
                {c.label}
              </span>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            REJOINDRE LE STAFF
        ══════════════════════════════════════ */}
        <section className="px-5 py-12 max-w-5xl mx-auto">
          <div className="rounded-3xl border border-amber-500/15 p-6 sm:p-10 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.06),rgba(236,72,153,0.04))", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(245,158,11,0.5),transparent)" }} />
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.1) 0%, transparent 60%)" }} />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 mb-4">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Recrutement Staff</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                  Deviens coach ou membre du staff
                </h2>
                <p className="text-sm text-white/45 leading-relaxed max-w-lg">
                  Tu es coach vocal, directeur musical, specialiste de la mise en scene
                  ou producteur ? Rejoins l&apos;equipe qui encadrera les candidats en live sur TikTok.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {["Coach Vocal", "Coach Scenique", "Direction Musicale", "Jury", "Production"].map(r => (
                    <span key={r} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/40 font-semibold">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0">
                <Link href="/star-academy-tiktok/inscription-staff"
                  className="rounded-2xl px-7 py-3.5 font-black text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.98] inline-block"
                  style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899)", boxShadow: "0 0 30px rgba(245,158,11,0.3)" }}>
                  Postuler pour le staff
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CHATEAU SECTION
        ══════════════════════════════════════ */}
        <section className="px-5 py-14 max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden" style={{ minHeight: "340px" }}>
            <Image src="/StarAcRes/sa-chateau-sky.jpg" alt="Le Chateau Virtuel" fill
              className="object-cover object-center" sizes="(max-width:1024px)100vw,1024px" />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(90deg, rgba(7,0,15,0.92) 0%, rgba(7,0,15,0.6) 50%, rgba(7,0,15,0.2) 100%)" }} />
            {/* Halo violet */}
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 10% 50%, rgba(147,51,234,0.3) 0%, transparent 60%)" }} />

            <div className="absolute inset-0 flex items-center px-8 sm:px-12">
              <div className="max-w-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>
                    SA
                  </div>
                  <span className="text-[10px] font-bold text-violet-400/60 uppercase tracking-widest">Le concept</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Le Chateau Virtuel</h2>
                <p className="text-sm text-white/50 leading-relaxed mb-5">
                  Integre un groupe prive, accede aux lives exclusifs, releve des epreuves
                  et evolue parmi les candidats selectionnes. Tout se passe en direct sur TikTok.
                </p>
                <Link href="/star-academy-tiktok/reglement"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  Lire le reglement officiel
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA FINAL — concert bg
        ══════════════════════════════════════ */}
        <section className="relative overflow-hidden py-24 px-5">
          {/* Concert image */}
          <Image src="/StarAcRes/sa-concert-bg.jpg" alt="" fill
            className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(0deg, rgba(7,0,15,1) 0%, rgba(7,0,15,0.7) 40%, rgba(7,0,15,0.6) 60%, rgba(7,0,15,1) 100%)" }} />

          <div className="relative z-10 max-w-2xl mx-auto text-center">
            {/* Logos partenaires */}
            <div className="flex items-center justify-center gap-5 mb-10">
              <Image src="/StarAcRes/sa-logo.png" alt="Star Academy TikTok" width={90} height={34}
                className="object-contain"
                style={{ filter: "drop-shadow(0 0 12px rgba(147,51,234,0.6)) brightness(1.2)" }} />
              <span className="text-white/20 text-xl font-thin">×</span>
              <Image src="/StarAcRes/mixxpartywhitelog.png" alt="Mixx Party" width={80} height={30}
                className="object-contain"
                style={{ filter: "brightness(0) invert(1) opacity(0.6)" }} />
              <span className="text-white/20 text-xl font-thin">×</span>
              <Image src="/synaura_logotype.svg" alt="Synaura" width={80} height={24}
                className="object-contain"
                style={{ filter: "brightness(0) invert(1) opacity(0.6)" }} />
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
              Pret(e) a montrer<br />
              <span style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ton talent ?
              </span>
            </h2>
            <p className="text-white/45 text-sm leading-relaxed mb-8 max-w-md mx-auto">
              Le formulaire prend 5 minutes. Uploade ton CV vocal, cree ton compte Synaura
              et rejoins la competition en direct.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/star-academy-tiktok/inscription"
                className="rounded-2xl px-9 py-4 font-black text-base text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(90deg,#7c3aed,#9333ea,#db2777)",
                  boxShadow: "0 0 40px rgba(147,51,234,0.5), 0 4px 20px rgba(0,0,0,0.5)",
                }}>
                Demarrer ma candidature
              </Link>
              <Link href="/star-academy-tiktok/suivi"
                className="rounded-2xl border border-white/15 bg-black/30 backdrop-blur-sm px-7 py-4 font-semibold text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">
                Suivre ma candidature
              </Link>
            </div>
            <p className="text-white/20 text-[11px] mt-5 uppercase tracking-widest mb-3">
              Gratuit · Inscription en 5 min · CV vocal requis
            </p>
            <Link href="/star-academy-tiktok/inscription-staff"
              className="text-amber-400/60 text-xs hover:text-amber-400 transition underline underline-offset-2">
              Tu veux rejoindre le staff ? Postuler ici
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
        <footer className="border-t border-white/5 px-5 py-10"
          style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="max-w-4xl mx-auto">
            {/* Logos */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
              <Image src="/StarAcRes/sa-logo.png" alt="Star Academy TikTok" width={70} height={26}
                className="object-contain opacity-30"
                style={{ filter: "brightness(1.2)" }} />
              <Image src="/StarAcRes/mixxpartywhitelog.png" alt="Mixx Party" width={60} height={22}
                className="object-contain"
                style={{ filter: "brightness(0) invert(1) opacity(0.25)" }} />
              <Image src="/synaura_logotype.svg" alt="Synaura" width={70} height={20}
                className="object-contain"
                style={{ filter: "brightness(0) invert(1) opacity(0.25)" }} />
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-5">
              <Link href="/star-academy-tiktok/reglement"
                className="text-[11px] text-white/30 hover:text-violet-400 transition underline-offset-2 hover:underline">
                Reglement officiel
              </Link>
              <span className="text-white/10">·</span>
              <Link href="/star-academy-tiktok/suivi"
                className="text-[11px] text-white/30 hover:text-white transition">
                Suivi candidature
              </Link>
              <span className="text-white/10">·</span>
              <Link href="/star-academy-tiktok/inscription-staff"
                className="text-[11px] text-white/30 hover:text-amber-400 transition">
                Devenir staff
              </Link>
              <span className="text-white/10">·</span>
              <Link href="/legal/cgu"
                className="text-[11px] text-white/30 hover:text-white transition">
                CGU
              </Link>
              <span className="text-white/10">·</span>
              <Link href="/legal/confidentialite"
                className="text-[11px] text-white/30 hover:text-white transition">
                Confidentialite
              </Link>
              <span className="text-white/10">·</span>
              <Link href="/"
                className="text-[11px] text-white/30 hover:text-white transition">
                Synaura.fr
              </Link>
            </div>

            <p className="text-center text-[11px] text-white/15">
              © {new Date().getFullYear()} Star Academy TikTok — Un evenement organise par Synaura · SIRET 99163519400012
            </p>
            <p className="text-center text-[10px] text-white/10 mt-1">
              Non affilie a TikTok ou aux ayants droit de la marque Star Academy
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

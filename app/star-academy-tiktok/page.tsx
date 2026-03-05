"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PrimeStageBackground } from "@/components/PrimeStageBackground";

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
  return <span>{String(n).padStart(2, "0")}</span>;
}

export default function StarAcademyLandingPage() {
  const cd = useCountdown(DEADLINE);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/star-academy/status?count=1")
      .then((r) => r.json())
      .then((d) => { if (typeof d.total === "number") setCount(d.total); })
      .catch(() => {});
  }, []);

  const steps = [
    { num: "01", title: "Inscription", desc: "Remplis le formulaire et uploade ton CV vocal (20–60s).", icon: "🎤" },
    { num: "02", title: "Pré-sélection", desc: "Notre équipe écoute chaque candidature et valide les profils.", icon: "👂" },
    { num: "03", title: "Live TikTok", desc: "Si retenu(e), tu passes en live avec challenges & évaluations.", icon: "📱" },
    { num: "04", title: "Prime & Progression", desc: "Primes, épreuves spéciales et montée en notoriété.", icon: "🏆" },
  ];

  const prizes = [
    { icon: "🥇", label: "3 mois Premium Synaura", sub: "Offerts aux gagnants du Live" },
    { icon: "🏅", label: "1 mois Premium Synaura", sub: "Offert aux candidats retenus" },
    { icon: "📱", label: "Visibilité TikTok Live", sub: "Audience en direct garantie" },
    { icon: "🌟", label: "Mise en avant Artiste", sub: "Profil boosté sur la plateforme" },
  ];

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <PrimeStageBackground intensity={1} />

      {/* Tout le contenu au-dessus du fond */}
      <div className="relative z-20">

        {/* ── Nav rapide ───────────────────────────────────── */}
        <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <Link href="/" className="text-sm font-semibold text-white/60 hover:text-white transition">
            ← Synaura
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/star-academy-tiktok/suivi"
              className="text-sm text-white/60 hover:text-white transition"
            >
              Suivi candidature
            </Link>
            <Link
              href="/star-academy-tiktok/inscription"
              className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#00f2ea] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition"
            >
              Candidater →
            </Link>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center">
          {/* Badge LIVE */}
          <div className="mb-6 flex items-center gap-2 rounded-full border border-[#ff2d55]/40 bg-[#ff2d55]/10 px-4 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2d55] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff2d55]" />
            </span>
            <span className="text-xs font-bold text-[#ff2d55] tracking-widest uppercase">Auditions ouvertes • Live</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-4">
            <span className="block" style={{ background: "linear-gradient(90deg,#ffd47a,#ff2d55,#7c3aed,#00f2ea)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Star Academy
            </span>
            <span className="block text-white mt-1">TikTok × Synaura</span>
          </h1>

          <p className="mt-4 max-w-xl text-base md:text-lg text-white/60 leading-relaxed">
            Le premier concours musical en Live TikTok. Montre ton talent,
            progresse en direct et remporte 3 mois de Premium Synaura.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/star-academy-tiktok/inscription"
              className="rounded-2xl px-8 py-3.5 font-bold text-base text-white transition hover:scale-105"
              style={{ background: "linear-gradient(90deg,#7c3aed,#ff2d55)" }}
            >
              🎤 Candidater maintenant
            </Link>
            <Link
              href="/star-academy-tiktok/suivi"
              className="rounded-2xl border border-white/20 bg-white/8 px-8 py-3.5 font-semibold text-base text-white/80 hover:bg-white/15 transition"
            >
              Suivre ma candidature
            </Link>
          </div>
        </section>

        {/* ── Countdown ────────────────────────────────────── */}
        <section className="px-6 pb-12">
          <div className="mx-auto max-w-2xl rounded-3xl border border-[#ffd47a]/20 bg-[#ffd47a]/5 p-6 md:p-8">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-[#ffd47a] mb-4">
              {cd.closed ? "Inscriptions fermées" : "Fermeture des candidatures dans"}
            </p>
            {!cd.closed && (
              <div className="flex justify-center gap-4 md:gap-8 text-center">
                {[
                  { v: cd.days,    l: "Jours" },
                  { v: cd.hours,   l: "Heures" },
                  { v: cd.minutes, l: "Minutes" },
                  { v: cd.seconds, l: "Secondes" },
                ].map(({ v, l }) => (
                  <div key={l}>
                    <div className="text-4xl md:text-6xl font-black text-white tabular-nums" style={{ textShadow: "0 0 30px rgba(255,212,122,0.5)" }}>
                      <Pad n={v} />
                    </div>
                    <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">{l}</div>
                  </div>
                ))}
              </div>
            )}
            {count !== null && (
              <p className="text-center text-xs text-white/40 mt-4">
                <span className="text-white font-bold">{count}</span> candidatures reçues
              </p>
            )}
          </div>
        </section>

        {/* ── Étapes ───────────────────────────────────────── */}
        <section className="px-6 py-12 max-w-5xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-black mb-8 text-white">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm hover:border-white/20 transition"
              >
                <div className="text-3xl mb-3">{step.icon}</div>
                <div className="text-xs font-black text-[#7c3aed] tracking-widest mb-1">{step.num}</div>
                <h3 className="font-bold text-white mb-1">{step.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Prizes ───────────────────────────────────────── */}
        <section className="px-6 py-12 max-w-5xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-black mb-2 text-white">Ce que tu gagnes</h2>
          <p className="text-center text-sm text-white/40 mb-8">Pour chaque candidat retenu</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {prizes.map((p) => (
              <div
                key={p.label}
                className="rounded-2xl border border-[#ffd47a]/15 bg-[#ffd47a]/5 p-5 text-center"
              >
                <div className="text-3xl mb-3">{p.icon}</div>
                <div className="text-sm font-bold text-[#ffd47a]">{p.label}</div>
                <div className="text-xs text-white/40 mt-1">{p.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Catégories ───────────────────────────────────── */}
        <section className="px-6 py-12 max-w-5xl mx-auto">
          <h2 className="text-center text-2xl font-black mb-6 text-white">Catégories</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["🎤 Chant", "🎤 Rap", "🎛️ Mix / DJ", "💃 Performance / Danse", "✨ Autre"].map((cat) => (
              <span
                key={cat}
                className="rounded-full border border-white/20 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white/80"
              >
                {cat}
              </span>
            ))}
          </div>
        </section>

        {/* ── CTA final ────────────────────────────────────── */}
        <section className="px-6 py-16 text-center">
          <div
            className="mx-auto max-w-2xl rounded-3xl border border-[#7c3aed]/30 p-8 md:p-12"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(0,242,234,0.08))" }}
          >
            <div className="text-4xl mb-4">🎤</div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">Prêt(e) à montrer ton talent ?</h2>
            <p className="text-white/50 mb-6 text-sm leading-relaxed">
              Le formulaire prend 5 minutes. Uploade ton CV vocal, crée ton compte Synaura
              et rejoins la compétition.
            </p>
            <Link
              href="/star-academy-tiktok/inscription"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-black text-lg text-white transition hover:scale-105"
              style={{ background: "linear-gradient(90deg,#7c3aed,#ff2d55)" }}
            >
              Démarrer ma candidature →
            </Link>
            <div className="mt-4 text-xs text-white/30">
              Gratuit · Inscription en 5 min · CV vocal requis
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="px-6 py-8 text-center space-y-2">
          <div className="text-xs text-white/20">
            Star Academy TikTok × Synaura · {new Date().getFullYear()} · Organisé par Synaura
          </div>
          <div className="flex items-center justify-center gap-4">
            <Link href="/star-academy-tiktok/reglement"
              className="text-[11px] text-white/30 hover:text-violet-400 underline-offset-2 hover:underline transition">
              Règlement officiel
            </Link>
            <span className="text-white/15">·</span>
            <Link href="/legal/cgu"
              className="text-[11px] text-white/30 hover:text-violet-400 underline-offset-2 hover:underline transition">
              CGU
            </Link>
            <span className="text-white/15">·</span>
            <Link href="/legal/confidentialite"
              className="text-[11px] text-white/30 hover:text-violet-400 underline-offset-2 hover:underline transition">
              Confidentialité
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

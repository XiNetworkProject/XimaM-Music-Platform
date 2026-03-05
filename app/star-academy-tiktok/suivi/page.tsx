"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PrimeStageBackground } from "@/components/PrimeStageBackground";

interface Application {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  tiktok_handle: string;
  category: string;
  status: "pending" | "reviewing" | "accepted" | "winner" | "rejected";
  synaura_username: string | null;
  tracking_token: string;
  notification_sent_at: string | null;
  audio_filename: string | null;
}

const STATUS_CONFIG = {
  pending: {
    label: "En attente",
    icon: "⏳",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    desc: "Ta candidature a bien été reçue. Notre équipe la traitera très prochainement.",
  },
  reviewing: {
    label: "En cours d'écoute",
    icon: "🎧",
    color: "text-[#00f2ea]",
    border: "border-[#00f2ea]/30",
    bg: "bg-[#00f2ea]/10",
    desc: "Notre équipe écoute actuellement ton CV vocal et examine ton profil. Tu recevras une réponse bientôt.",
  },
  accepted: {
    label: "Retenu(e) !",
    icon: "✅",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    desc: "Félicitations ! Ta candidature a été retenue. Tu vas participer au Live TikTok — reste disponible, un email t'indiquera la date. Tu bénéficies d'1 mois Premium Synaura.",
  },
  winner: {
    label: "Gagnant(e) !",
    icon: "★",
    color: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/10",
    desc: "Incroyable ! Tu as remporté Star Academy TikTok × Synaura. Bravo ! Tu bénéficies de 3 mois Premium Synaura offerts.",
  },
  rejected: {
    label: "Non retenu(e)",
    icon: "○",
    color: "text-white/50",
    border: "border-white/10",
    bg: "bg-white/5",
    desc: "Merci pour ta candidature. Cette fois, tu n'as pas été retenu(e). Continue à développer ton univers artistique !",
  },
};

const TIMELINE_STEPS = [
  { key: "pending",   icon: "○", label: "Candidature reçue" },
  { key: "reviewing", icon: "◎", label: "En cours d'écoute" },
  { key: "accepted",  icon: "✓", label: "Retenu(e)" },
  { key: "winner",    icon: "★", label: "Gagnant(e)" },
];

function getTimelineState(status: Application["status"]) {
  if (status === "rejected") return { activeIdx: 1, rejected: true };
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  return { activeIdx: idx, rejected: false };
}

// Export default avec Suspense boundary (requis par Next.js pour useSearchParams)
export default function SuiviPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen text-white overflow-x-hidden">
        <PrimeStageBackground intensity={0.7} />
        <div className="relative z-20 flex min-h-screen items-center justify-center">
          <div className="text-white/40 text-sm">Chargement…</div>
        </div>
      </div>
    }>
      <SuiviContent />
    </Suspense>
  );
}

function SuiviContent() {
  const searchParams = useSearchParams();
  const [tokenInput, setTokenInput] = useState(searchParams.get("token") ?? "");
  const [emailInput, setEmailInput] = useState("");
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const lookup = useCallback(async (token?: string, email?: string) => {
    const q = token ? `token=${token}` : `email=${encodeURIComponent(email ?? "")}`;
    if (!q) return;

    setLoading(true);
    setError("");
    setApplication(null);

    try {
      const res = await fetch(`/api/star-academy/status?${q}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Candidature introuvable.");
      } else {
        setApplication(data.application);
      }
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  // Auto-lookup si token dans l'URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) lookup(token);
  }, [searchParams, lookup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput) lookup(tokenInput);
    else if (emailInput) lookup(undefined, emailInput);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <PrimeStageBackground intensity={0.7} />

      <div className="relative z-20 max-w-2xl mx-auto px-4 py-10">

        {/* ── Nav ─────────────────────────────────────────── */}
        <nav className="flex items-center justify-between mb-8">
          <Link href="/star-academy-tiktok" className="text-sm text-white/50 hover:text-white transition">
            ← Star Academy TikTok
          </Link>
          <span className="text-xs text-[#ffd47a] font-bold uppercase tracking-widest">★ Suivi candidature</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Suivi de candidature</h1>
        <p className="text-white/50 text-sm mb-8">
          Saisis ton token de suivi (reçu par email) ou ton adresse email pour voir l'état de ta candidature.
        </p>

        {/* ── Search form ─────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Token de suivi</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#7c3aed]/60 focus:ring-1 focus:ring-[#7c3aed]/30 transition font-mono"
                placeholder="abc123def456…"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30">ou</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Email de candidature</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#7c3aed]/60 focus:ring-1 focus:ring-[#7c3aed]/30 transition"
                type="email"
                placeholder="email@exemple.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (!tokenInput && !emailInput)}
            className="mt-5 w-full rounded-2xl py-3 font-bold text-sm text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(90deg,#7c3aed,#00f2ea)" }}
          >
            {loading ? "Recherche…" : "Voir ma candidature →"}
          </button>
        </form>

        {/* ── Error ───────────────────────────────────────── */}
        {searched && !loading && error && (
          <div className="rounded-2xl border border-[#ff2d55]/30 bg-[#ff2d55]/10 px-4 py-3 text-sm text-[#ff2d55]">
            ⚠️ {error}
          </div>
        )}

        {/* ── Result ──────────────────────────────────────── */}
        {application && (() => {
          const cfg = STATUS_CONFIG[application.status];
          const { activeIdx, rejected } = getTimelineState(application.status);

          return (
            <div className="space-y-4">
              {/* Status card */}
              <div className={`rounded-3xl border ${cfg.border} ${cfg.bg} p-6`}>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-lg font-black ${cfg.color}`}>{cfg.label}</div>
                    <div className="text-sm text-white/60 mt-1 leading-relaxed">{cfg.desc}</div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">Progression</h2>
                <div className="space-y-0">
                  {rejected
                    ? (
                      <div className="flex items-center gap-3 py-3">
                        <div className="h-8 w-8 rounded-full border-2 border-[#ff2d55]/50 bg-[#ff2d55]/10 flex items-center justify-center text-sm">❌</div>
                        <div>
                          <div className="text-sm font-semibold text-[#ff2d55]/70">Non retenu(e)</div>
                          <div className="text-xs text-white/30">Candidature examinée</div>
                        </div>
                      </div>
                    )
                    : TIMELINE_STEPS.map((step, i) => {
                        const done    = i <= activeIdx;
                        const current = i === activeIdx;
                        return (
                          <div key={step.key} className={`flex items-center gap-3 py-3 ${i < TIMELINE_STEPS.length - 1 ? "border-b border-white/5" : ""}`}>
                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-sm transition ${done ? "border-emerald-500/60 bg-emerald-500/10" : "border-white/10 bg-white/3"}`}>
                              {done ? "✓" : step.icon}
                            </div>
                            <div className="flex-1">
                              <div className={`text-sm font-semibold ${current ? "text-white" : done ? "text-white/70" : "text-white/30"}`}>
                                {step.label}
                              </div>
                              {current && <div className="text-xs text-[#00f2ea] mt-0.5">Étape actuelle</div>}
                            </div>
                          </div>
                        );
                      })}
                </div>
              </div>

              {/* Infos candidat */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Ta candidature</h2>
                {[
                  { label: "Nom", value: application.full_name },
                  { label: "TikTok", value: application.tiktok_handle },
                  { label: "Catégorie", value: application.category },
                  { label: "Déposée le", value: fmt(application.created_at) },
                  { label: "Dernière mise à jour", value: fmt(application.updated_at) },
                  application.audio_filename && { label: "Audio", value: application.audio_filename },
                  application.synaura_username && { label: "Compte Synaura", value: `@${application.synaura_username}` },
                ].filter(Boolean).map((item: any) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-white/40">{item.label}</span>
                    <span className="text-sm text-white/80 font-medium text-right">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* CTA Synaura si accepté + compte */}
              {application.status === "accepted" && application.synaura_username && (
                <div
                  className="rounded-3xl border border-[#7c3aed]/30 p-6 text-center"
                  style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(0,242,234,0.08))" }}
                >
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-base font-black text-[#ffd47a] mb-1">3 mois Premium activés !</div>
                  <div className="text-sm text-white/60 mb-4">
                    Sur ton compte <strong className="text-white">@{application.synaura_username}</strong>
                  </div>
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                    style={{ background: "linear-gradient(90deg,#7c3aed,#00f2ea)" }}
                  >
                    Accéder à Synaura →
                  </Link>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

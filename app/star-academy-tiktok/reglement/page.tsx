"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ReglementPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [hasRead, setHasRead] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pct = Math.min(100, Math.round(
      ((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100
    ));
    setProgress(pct);
    if (pct >= 98) setHasRead(true);
  }, []);

  // Init check (si contenu court)
  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  const articles = [
    {
      num: "01",
      title: "Organisation",
      content: [
        "Le concours \"STAR ACADEMY TIKTOK\" est organisé par la société Synaura, immatriculée sous le SIRET 99163519400012.",
        "Ce concours est une compétition de chant virtuelle se déroulant exclusivement sur la plateforme TikTok.",
        "Ce concours n'est pas affilié à, ni sponsorisé par TikTok ou les ayants droit officiels de la marque \"Star Academy\".",
      ],
    },
    {
      num: "02",
      title: "Conditions de participation",
      content: [
        "Âge : Le candidat doit avoir l'âge légal requis par TikTok pour diffuser des Lives.",
        "Mineurs : Pour les candidats mineurs, une autorisation parentale écrite est obligatoire pour valider l'inscription.",
        "Capacité Technique : Le candidat doit impérativement avoir accès à la fonctionnalité \"LIVE\" sur son compte TikTok et disposer d'une connexion internet stable.",
      ],
    },
    {
      num: "03",
      title: "Modalités du concours",
      content: [
        "Le concours simule l'expérience de la Star Academy dans un environnement numérique.",
        "Les candidats intégreront un \"Château Virtuel\" composé de groupes de discussion et de lives dédiés.",
        "Des cours, des évaluations et des primes seront organisés en direct sur TikTok tout au long de la saison.",
      ],
    },
    {
      num: "04",
      title: "Inscription et données personnelles",
      content: [
        "Confidentialité : Les informations collectées lors de l'inscription restent strictement privées et servent uniquement à l'organisation interne du concours.",
        "Conservation : Conformément aux normes de protection des données, toutes les informations personnelles seront automatiquement supprimées un an après la fin de la saison.",
        "Validation : L'inscription n'est définitive qu'après réception d'un message de confirmation de l'équipe Synaura.",
      ],
    },
    {
      num: "05",
      title: "Comportement et sanctions",
      content: [
        "Le respect mutuel est une règle d'or. Tout manquement entraînera des sanctions proportionnelles à la gravité de la faute.",
        "Comportement : Tout manque de respect envers les professeurs, les autres candidats ou l'équipe du staff sera sanctionné (avertissement, nomination d'office ou exclusion définitive).",
        "Harcèlement : La tolérance zéro est appliquée concernant le harcèlement, les insultes ou la discrimination. En cas de faits graves, l'organisation se réserve le droit de signaler les faits aux autorités compétentes.",
      ],
    },
    {
      num: "06",
      title: "Droit à l'image",
      content: [
        "En participant au concours, les candidats acceptent que leur image et leur voix soient diffusées sur TikTok via les comptes officiels de la Star Academy TikTok et de Synaura pour les besoins de la promotion du concours.",
        "Cette autorisation est valable pour la durée de la saison et à des fins exclusivement promotionnelles non commerciales.",
      ],
    },
    {
      num: "07",
      title: "Engagements et présence",
      content: [
        "Présence Obligatoire : Les candidats doivent s'assurer d'être disponibles pour les dates de Live fixées à l'avance par l'organisation.",
        "Absences : En cas d'empêchement, un motif d'absence doit être fourni à l'équipe. Après 3 absences consécutives sans justification, le candidat sera automatiquement exclu du concours.",
        "Abandon : Toute personne quittant l'aventure en cours de route sans motif grave sera définitivement exclue des prochaines saisons et bannie des futurs événements liés à l'organisation.",
      ],
    },
    {
      num: "08",
      title: "Récompenses",
      content: [
        "Les candidats retenus pour participer aux épreuves en live bénéficieront d'1 mois d'abonnement Premium Synaura offert.",
        "Les gagnants du concours bénéficieront de 3 mois d'abonnement Premium Synaura offerts, activés automatiquement sur leur compte.",
        "Les récompenses sont nominatives, non cessibles et non convertibles en espèces.",
      ],
    },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(160deg,#07000f 0%,#0d0020 50%,#07000f 100%)" }}>

      {/* ── Header ─────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/6 backdrop-blur-xl"
        style={{ background: "rgba(7,0,15,0.85)" }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/star-academy-tiktok" className="shrink-0 opacity-80 hover:opacity-100 transition">
              <Image src="/StarAcRes/sa-logo.png" alt="Star Academy TikTok"
                width={80} height={30} className="object-contain"
                style={{ filter: "drop-shadow(0 0 6px rgba(147,51,234,0.5)) brightness(1.2)" }} />
            </Link>
            <div className="hidden sm:block w-px h-5 bg-white/15" />
            <span className="hidden sm:block text-xs font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">
              Règlement officiel
            </span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full overflow-hidden bg-white/10">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: hasRead
                      ? "linear-gradient(90deg,#22c55e,#4ade80)"
                      : "linear-gradient(90deg,#9333ea,#ec4899)",
                  }} />
              </div>
              <span className="text-xs font-bold tabular-nums"
                style={{ color: hasRead ? "#4ade80" : "rgba(255,255,255,0.35)" }}>
                {progress}%
              </span>
            </div>
            {hasRead && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[10px] font-bold text-emerald-400">Lu</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Scrollable content ──────────────────── */}
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/8 px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] inline-block" style={{ boxShadow: "0 0 8px #f59e0b" }} />
            <span className="text-xs font-bold text-[#f59e0b] uppercase tracking-widest">Document officiel · Saison 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3"
            style={{ background: "linear-gradient(135deg,#fff 40%,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Règlement du concours
          </h1>
          <p className="text-white/45 text-sm max-w-md mx-auto leading-relaxed">
            Lire l'intégralité du règlement est obligatoire avant de valider votre candidature.
            Faites défiler jusqu'en bas pour pouvoir accepter.
          </p>

          {/* Scroll hint */}
          {!hasRead && (
            <div className="mt-6 flex flex-col items-center gap-2 animate-bounce">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
              <span className="text-[11px] text-white/20 uppercase tracking-widest">Défiler pour lire</span>
            </div>
          )}
        </div>

        {/* Articles */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="space-y-6"
        >
          {articles.map((art) => (
            <div key={art.num}
              className="rounded-3xl border border-white/[0.06] p-6 sm:p-8"
              style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(20px)" }}>
              {/* Article header */}
              <div className="flex items-start gap-4 mb-5">
                <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 text-xs font-black text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>
                  {art.num}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Article {art.num}</p>
                  <h2 className="text-lg font-black text-white">{art.title}</h2>
                </div>
              </div>
              {/* Divider */}
              <div className="h-px mb-5" style={{ background: "linear-gradient(90deg,rgba(147,51,234,0.3),transparent)" }} />
              {/* Content */}
              <ul className="space-y-3">
                {art.content.map((line, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: "linear-gradient(135deg,#9333ea,#ec4899)" }} />
                    <p className="text-sm text-white/60 leading-relaxed">{line}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Legal footer */}
          <div className="rounded-3xl border border-white/[0.04] p-6 sm:p-8 space-y-3"
            style={{ background: "rgba(147,51,234,0.04)" }}>
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest">Mentions légales</p>
            <p className="text-xs text-white/35 leading-relaxed">
              © 2026 Star Academy TikTok — Un événement organisé par Synaura. SIRET : 99163519400012.
            </p>
            <p className="text-xs text-white/35 leading-relaxed">
              Ce concours n'est pas affilié à, ni sponsorisé par TikTok ou les ayants droit officiels de la marque "Star Academy".
            </p>
            <p className="text-xs text-white/35 leading-relaxed">
              Conformément au RGPD, vos informations personnelles sont traitées de manière confidentielle pour l'organisation du concours et seront supprimées après 1 an.
              Pour toute question : <span className="text-violet-400">contact.syn@synaura.fr</span>
            </p>
            <a
              href="/StarAcRes/sa-reglement.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/8 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Télécharger le PDF original
            </a>
          </div>
        </div>

        {/* ── Accept block ──────────────────────── */}
        <div className="sticky bottom-0 pt-6 pb-8 mt-8" style={{ background: "linear-gradient(to top, #07000f 60%, transparent)" }}>
          {!hasRead ? (
            <div className="rounded-3xl border border-white/8 p-5 text-center"
              style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-32 h-1 rounded-full overflow-hidden bg-white/10">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: "linear-gradient(90deg,#9333ea,#ec4899)" }} />
                </div>
                <span className="text-xs text-white/30 font-medium tabular-nums">{progress}%</span>
              </div>
              <p className="text-xs text-white/30">
                Continuez à lire pour débloquer la validation — <span className="text-white/50">{100 - progress}% restant</span>
              </p>
            </div>
          ) : !accepted ? (
            <div className="rounded-3xl border border-emerald-500/20 p-6 space-y-4"
              style={{ background: "rgba(34,197,94,0.04)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white/70">
                  Vous avez lu l'intégralité du règlement.
                </p>
              </div>
              <button
                onClick={() => setAccepted(true)}
                className="w-full rounded-2xl py-4 font-black text-white text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: "linear-gradient(90deg,#7c3aed,#9333ea,#db2777)",
                  boxShadow: "0 0 30px rgba(147,51,234,0.35), 0 4px 15px rgba(0,0,0,0.4)",
                }}>
                J'ai lu et j'accepte le règlement
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-500/25 p-6 space-y-4"
              style={{ background: "rgba(34,197,94,0.06)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#22c55e,#4ade80)" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-black text-white">Règlement accepté</p>
                  <p className="text-xs text-white/40 mt-0.5">Vous pouvez maintenant compléter votre candidature.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/star-academy-tiktok/inscription"
                  className="flex-1 rounded-2xl py-3.5 font-black text-white text-sm text-center transition-all duration-200 hover:scale-[1.01]"
                  style={{ background: "linear-gradient(90deg,#7c3aed,#9333ea,#db2777)", boxShadow: "0 0 24px rgba(147,51,234,0.3)" }}>
                  Continuer l'inscription
                </Link>
                <Link href="/star-academy-tiktok"
                  className="rounded-2xl border border-white/10 bg-white/4 px-5 py-3.5 text-sm text-white/45 hover:text-white transition-all">
                  Retour
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

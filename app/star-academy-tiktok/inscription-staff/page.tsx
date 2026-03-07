"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Phase = "form" | "done";
type Step = 1 | 2 | 3 | 4;

interface StaffFields {
  fullName: string; age: string; email: string;
  phone: string; location: string;
  role: string; experience: string; speciality: string;
  tiktok: string; portfolioUrl: string;
  motivation: string; availability: string;
  synauraUsername: string; consent: boolean;
}

const EMPTY: StaffFields = {
  fullName: "", age: "", email: "", phone: "", location: "",
  role: "", experience: "", speciality: "", tiktok: "", portfolioUrl: "",
  motivation: "", availability: "", synauraUsername: "", consent: false,
};

const ROLES = [
  { value: "coach_vocal", label: "Coach Vocal", desc: "Formation vocale, technique et interpretation" },
  { value: "coach_scenique", label: "Coach Scenique", desc: "Presence, mise en scene, expression corporelle" },
  { value: "direction_musicale", label: "Direction Musicale", desc: "Arrangements, choix musicaux, accompagnement" },
  { value: "jury", label: "Jury", desc: "Evaluation et notation des candidats en live" },
  { value: "production", label: "Production / Staff Technique", desc: "Technique, realisaton, gestion des lives" },
  { value: "autre", label: "Autre", desc: "Autre role a preciser" },
];

const STEPS = [
  { n: 1, label: "Identite" },
  { n: 2, label: "Role" },
  { n: 3, label: "Motivation" },
  { n: 4, label: "Finaliser" },
];

const KEYFRAMES = `
  @keyframes sa-fade-up {
    from { opacity: 0; transform: translateY(48px); filter: blur(8px); }
    to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
  }
  @keyframes sa-glow-pulse {
    0%,100% { box-shadow: 0 0 30px rgba(147,51,234,0.5), 0 0 60px rgba(147,51,234,0.2); }
    50%      { box-shadow: 0 0 60px rgba(147,51,234,0.9), 0 0 120px rgba(236,72,153,0.4); }
  }
`;

function SuccessScreen({ email, token }: { email: string; token: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#07000f", overflow: "auto", fontFamily: "system-ui, sans-serif" }}>
      <style>{KEYFRAMES}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(147,51,234,0.8) 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.7) 0%, transparent 70%)", filter: "blur(100px)" }} />
      </div>

      <div style={{
        position: "relative", zIndex: 10,
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "24px",
        animation: "sa-fade-up 1s ease-out 0.3s both",
      }}>
        <div style={{ width: "100%", maxWidth: "440px", textAlign: "center" }}>
          <div style={{ marginBottom: "24px" }}>
            <Image src="/StarAcRes/sa-logo-transparent.png" alt="Star Academy TikTok" width={140} height={90}
              style={{ filter: "drop-shadow(0 0 20px rgba(147,51,234,0.6)) brightness(1.2)", mixBlendMode: "screen", display: "inline-block" }} />
          </div>

          <div style={{
            display: "inline-block", borderRadius: "100px", padding: "6px 20px",
            background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", marginBottom: "16px",
          }}>
            <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "3px", color: "#4ade80", textTransform: "uppercase" }}>
              Candidature Staff envoyee
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 900, color: "#fff", margin: "0 0 12px", lineHeight: 1.1 }}>
            Merci de vouloir rejoindre le staff.
          </h1>

          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: "0 0 28px" }}>
            Un email de confirmation a ete envoye a{" "}
            <strong style={{ color: "rgba(255,255,255,0.8)" }}>{email}</strong>.
            Notre equipe examinera ton profil avec attention.
          </p>

          <div style={{
            borderRadius: "16px", border: "1px solid rgba(245,158,11,0.25)",
            background: "rgba(245,158,11,0.06)", padding: "16px 20px", marginBottom: "20px",
          }}>
            <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "4px", color: "rgba(245,158,11,0.7)", textTransform: "uppercase", margin: "0 0 8px" }}>
              Code de suivi
            </p>
            <code style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", wordBreak: "break-all", display: "block", fontFamily: "monospace" }}>
              {token}
            </code>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Link href="/star-academy-tiktok" style={{
              display: "block", borderRadius: "16px", padding: "16px 24px",
              background: "linear-gradient(90deg, #9333ea, #ec4899)", color: "#fff",
              fontWeight: 800, fontSize: "15px", textDecoration: "none", textAlign: "center",
              boxShadow: "0 0 30px rgba(147,51,234,0.4)",
              animation: "sa-glow-pulse 2s ease-in-out 2s infinite",
            }}>
              Retour a Star Academy
            </Link>
            <Link href="/" style={{
              display: "block", borderRadius: "16px", padding: "14px 24px",
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: "13px",
              textDecoration: "none", textAlign: "center",
            }}>
              Decouvrir Synaura
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InscriptionStaffPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState<Step>(1);
  const [fields, setFields] = useState<StaffFields>(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");

  const set = useCallback(<K extends keyof StaffFields>(k: K, v: StaffFields[K]) =>
    setFields(f => ({ ...f, [k]: v })), []);

  const canNext = useCallback((): boolean => {
    switch (step) {
      case 1: return !!(fields.fullName && fields.age && parseInt(fields.age) >= 18 && fields.email && fields.location);
      case 2: return !!(fields.role && fields.experience);
      case 3: return !!(fields.motivation && fields.availability);
      case 4: return fields.consent;
      default: return false;
    }
  }, [step, fields]);

  const next = () => { setError(""); if (canNext()) setStep(s => Math.min(4, s + 1) as Step); else setError("Remplis les champs obligatoires."); };
  const prev = () => { setError(""); setStep(s => Math.max(1, s - 1) as Step); };

  const submit = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/star-academy/apply-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Erreur serveur");
      setToken(data.trackingToken);
      setPhase("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [fields]);

  if (phase === "done") return <SuccessScreen email={fields.email} token={token} />;

  const inputCls = [
    "w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all duration-200",
    "border border-white/10 bg-white/[0.05]",
    "focus:border-violet-500/60 focus:bg-violet-900/10 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]",
  ].join(" ");
  const labelCls = "block text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "#07000f" }}>
      <style>{KEYFRAMES}</style>

      {/* Mobile banner */}
      <div className="relative lg:hidden h-40 shrink-0 overflow-hidden">
        <Image src="/StarAcRes/sa-concert-bg.jpg" alt="Star Academy Staff" fill className="object-cover object-center" priority sizes="100vw" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(7,0,15,0.1) 0%, rgba(7,0,15,0.55) 60%, rgba(7,0,15,1) 100%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(147,51,234,0.35) 0%, transparent 65%)" }} />
        <div className="absolute inset-0 flex items-end justify-between px-5 pb-4 z-10">
          <div>
            <Link href="/star-academy-tiktok">
              <Image src="/StarAcRes/sa-logo.png" alt="Star Academy" width={100} height={38} className="object-contain mb-1"
                style={{ filter: "drop-shadow(0 0 10px rgba(147,51,234,0.7)) brightness(1.2)" }} />
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Staff / Coach</span>
              <span className="text-white/20">·</span>
              <span className="text-[10px] text-white/40">Etape {step} / 4</span>
            </div>
          </div>
          <div className="flex gap-1">
            {STEPS.map(s => (
              <div key={s.n} className="h-1 w-5 rounded-full transition-all duration-500"
                style={{ background: s.n <= step ? "linear-gradient(90deg,#9333ea,#ec4899)" : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop left panel */}
      <div className="hidden lg:block relative lg:sticky lg:top-0 lg:h-screen lg:w-[44%] xl:w-[42%] shrink-0 overflow-hidden">
        <Image src="/StarAcRes/sa-concert-bg.jpg" alt="Star Academy Staff" fill className="object-cover object-center" priority sizes="44vw" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,0,15,0.2) 0%, rgba(7,0,15,0.05) 35%, rgba(7,0,15,0.65) 75%, rgba(7,0,15,0.98) 100%)" }} />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-40"
            style={{ background: "radial-gradient(circle, rgba(147,51,234,0.5) 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div className="absolute bottom-[20%] right-[-5%] w-[50%] h-[40%] rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)", filter: "blur(50px)" }} />
        </div>

        <div className="absolute inset-0 flex flex-col justify-between p-8 z-10">
          <div className="flex items-start justify-between">
            <Link href="/star-academy-tiktok" className="opacity-90 hover:opacity-100 transition">
              <Image src="/StarAcRes/sa-logo.png" alt="Star Academy" width={130} height={50} className="object-contain"
                style={{ filter: "drop-shadow(0 0 12px rgba(147,51,234,0.7)) brightness(1.2)" }} />
            </Link>
            <div className="flex items-center gap-1.5 rounded-full border border-[#ec4899]/40 bg-[#ec4899]/15 px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec4899] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ec4899]" />
              </span>
              <span className="text-[9px] font-black text-[#ec4899] uppercase tracking-widest">Staff</span>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 mb-4">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Recrutement Staff 2026</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-3">
              Deviens{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#f59e0b,#ec4899)" }}>
                coach ou membre du staff
              </span>
            </h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-sm">
              Tu as de l&apos;experience dans le coaching vocal, la direction musicale,
              la production ou la mise en scene ? Rejoins l&apos;equipe Star Academy TikTok.
            </p>

            <div className="mt-8 flex items-center gap-5">
              <Image src="/synaura_logotype.svg" alt="Synaura" width={80} height={22}
                style={{ filter: "brightness(0) invert(1) opacity(0.4)" }} />
              <span className="text-white/15 text-lg font-thin">x</span>
              <Image src="/StarAcRes/mixxpartywhitelog.png" alt="Mixx Party" width={70} height={26}
                style={{ filter: "brightness(0) invert(1) opacity(0.4)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 min-w-0 overflow-y-auto text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
        <div className="max-w-xl mx-auto px-5 py-8 lg:py-12 space-y-6">

          {/* Progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${
                  s.n < step ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : s.n === step ? "text-white border border-violet-500/50" : "bg-white/5 text-white/25 border border-white/10"
                }`}
                  style={s.n === step ? { background: "linear-gradient(135deg,#7c3aed,#db2777)" } : undefined}
                >
                  {s.n < step ? "✓" : s.n}
                </div>
                {i < STEPS.length - 1 && <div className="h-px flex-1 transition-all duration-300" style={{ background: s.n < step ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)" }} />}
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-xl font-black">{STEPS[step - 1].label}</h2>
            <p className="text-xs text-white/40 mt-1">Etape {step} sur 4</p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Step 1: Identite */}
          {step === 1 && (
            <div className="space-y-4 animate-[sa-fade-up_0.5s_ease-out_both]">
              <div>
                <label className={labelCls}>Nom complet *</label>
                <input type="text" className={inputCls} placeholder="Prenom Nom" value={fields.fullName} onChange={e => set("fullName", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Age *</label>
                  <input type="number" className={inputCls} placeholder="25" min={18} max={99} value={fields.age} onChange={e => set("age", e.target.value)} />
                  {fields.age && parseInt(fields.age) < 18 && (
                    <p className="text-xs text-amber-400 mt-1">18 ans minimum pour le staff</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Telephone</label>
                  <input type="tel" className={inputCls} placeholder="+33 6..." value={fields.phone} onChange={e => set("phone", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" className={inputCls} placeholder="ton@email.com" value={fields.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Ville / Region *</label>
                <input type="text" className={inputCls} placeholder="Paris, Lyon..." value={fields.location} onChange={e => set("location", e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Role */}
          {step === 2 && (
            <div className="space-y-4 animate-[sa-fade-up_0.5s_ease-out_both]">
              <div>
                <label className={labelCls}>Role souhaite *</label>
                <div className="grid gap-2.5">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => set("role", r.value)}
                      className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
                        fields.role === r.value
                          ? "border-violet-500/50 bg-violet-900/20 shadow-[0_0_0_3px_rgba(147,51,234,0.15)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="text-sm font-bold text-white">{r.label}</div>
                      <div className="text-xs text-white/40 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Experience *</label>
                <textarea
                  rows={3}
                  className={inputCls + " resize-none"}
                  placeholder="Decris ton parcours, tes experiences en coaching, production, enseignement musical..."
                  value={fields.experience}
                  onChange={e => set("experience", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Specialite</label>
                <input type="text" className={inputCls} placeholder="Technique vocale R&B, beatmaking, mise en scene live..."
                  value={fields.speciality} onChange={e => set("speciality", e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 3: Motivation */}
          {step === 3 && (
            <div className="space-y-4 animate-[sa-fade-up_0.5s_ease-out_both]">
              <div>
                <label className={labelCls}>Motivation *</label>
                <textarea
                  rows={5}
                  className={inputCls + " resize-none"}
                  placeholder="Pourquoi veux-tu rejoindre le staff Star Academy TikTok ? Qu'est-ce que tu peux apporter aux candidats ?"
                  maxLength={800}
                  value={fields.motivation}
                  onChange={e => set("motivation", e.target.value)}
                />
                <p className="text-right text-[10px] text-white/25 mt-1">{fields.motivation.length}/800</p>
              </div>
              <div>
                <label className={labelCls}>Disponibilites *</label>
                <textarea
                  rows={2}
                  className={inputCls + " resize-none"}
                  placeholder="Quand es-tu disponible ? (soirs, week-ends, live TikTok...)"
                  value={fields.availability}
                  onChange={e => set("availability", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>TikTok</label>
                <input type="text" className={inputCls} placeholder="@tonpseudo" value={fields.tiktok} onChange={e => set("tiktok", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Portfolio / Lien</label>
                <input type="url" className={inputCls} placeholder="https://..." value={fields.portfolioUrl} onChange={e => set("portfolioUrl", e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 4: Finaliser */}
          {step === 4 && (
            <div className="space-y-4 animate-[sa-fade-up_0.5s_ease-out_both]">
              {/* Recap */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">Recapitulatif</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div><span className="text-white/40">Nom :</span> <span className="text-white/80">{fields.fullName}</span></div>
                  <div><span className="text-white/40">Age :</span> <span className="text-white/80">{fields.age} ans</span></div>
                  <div><span className="text-white/40">Email :</span> <span className="text-white/80">{fields.email}</span></div>
                  <div><span className="text-white/40">Ville :</span> <span className="text-white/80">{fields.location}</span></div>
                  <div className="col-span-2"><span className="text-white/40">Role :</span> <span className="text-white/80">{ROLES.find(r => r.value === fields.role)?.label ?? fields.role}</span></div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Pseudo Synaura (optionnel)</label>
                <input type="text" className={inputCls} placeholder="@monpseudo" value={fields.synauraUsername} onChange={e => set("synauraUsername", e.target.value)} />
                <p className="text-[10px] text-white/30 mt-1">Si tu as deja un compte Synaura, indique ton pseudo</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={fields.consent}
                    onChange={e => set("consent", e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                    fields.consent ? "bg-violet-600 border-violet-500" : "border-white/20 bg-white/5 group-hover:border-white/30"
                  }`}>
                    {fields.consent && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-white/50 leading-relaxed">
                  J&apos;accepte le{" "}
                  <Link href="/star-academy-tiktok/reglement" target="_blank" className="text-violet-400 underline underline-offset-2">
                    reglement
                  </Link>{" "}
                  et les{" "}
                  <Link href="/legal/cgu" target="_blank" className="text-violet-400 underline underline-offset-2">
                    conditions d&apos;utilisation
                  </Link>
                  . Je confirme avoir 18 ans ou plus.
                </span>
              </label>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button onClick={prev} className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all">
                Retour
              </button>
            )}
            {step < 4 ? (
              <button onClick={next} disabled={!canNext()}
                className="flex-1 rounded-2xl px-6 py-3 text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
                style={{ background: "linear-gradient(90deg,#7c3aed,#9333ea,#db2777)", boxShadow: "0 0 20px rgba(147,51,234,0.3)" }}>
                Continuer
              </button>
            ) : (
              <button onClick={submit} disabled={loading || !canNext()}
                className="flex-1 rounded-2xl px-6 py-3 text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
                style={{ background: "linear-gradient(90deg,#059669,#10b981)", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
                {loading ? "Envoi en cours..." : "Envoyer ma candidature staff"}
              </button>
            )}
          </div>

          {/* Link to candidate inscription */}
          <div className="text-center pt-4">
            <p className="text-xs text-white/30 mb-2">Tu veux candidater en tant qu&apos;artiste ?</p>
            <Link href="/star-academy-tiktok/inscription" className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 transition">
              Inscription candidat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

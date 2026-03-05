"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5;

interface FormFields {
  fullName: string; age: string; email: string;
  phone: string; location: string; tiktok: string;
  category: string; level: string; link: string;
  bio: string; availability: string;
  synauraUsername: string; synauraPassword: string;
  consent: boolean;
}

const EMPTY: FormFields = {
  fullName: "", age: "", email: "", phone: "", location: "",
  tiktok: "", category: "", level: "", link: "",
  bio: "", availability: "",
  synauraUsername: "", synauraPassword: "", consent: false,
};

function humanMb(b: number) { return (b / 1048576).toFixed(1); }

const STEPS = [
  { n: 1, label: "Identité",    icon: "👤" },
  { n: 2, label: "Artiste",     icon: "🎤" },
  { n: 3, label: "Présentation",icon: "💬" },
  { n: 4, label: "CV Vocal",    icon: "🎵" },
  { n: 5, label: "Compte",      icon: "⭐" },
];

// ─── Main Component ───────────────────────────────────────
export default function InscriptionPage() {
  const [step, setStep] = useState<Step>(1);
  const [fields, setFields] = useState<FormFields>(EMPTY);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl]   = useState<string | null>(null);
  const [drag, setDrag]           = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [token, setToken]         = useState("");
  const [done, setDone]           = useState(false);
  const audioRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof FormFields>(k: K, v: FormFields[K]) =>
    setFields(f => ({ ...f, [k]: v })), []);

  const setFile = useCallback((f: File | null) => {
    if (!f) { setAudioFile(null); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); return; }
    if (!f.type.startsWith("audio/")) { setError("Fichier audio requis (MP3, WAV, M4A…)"); return; }
    if (f.size > 30 * 1024 * 1024) { setError("Max 30 MB"); return; }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(f); setAudioUrl(URL.createObjectURL(f)); setError("");
  }, [audioUrl]);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  // ── Validation par step ───────────────────────────────
  const canNext = useCallback((): boolean => {
    switch (step) {
      case 1: return !!(fields.fullName && fields.age && fields.email && fields.location);
      case 2: return !!(fields.tiktok && fields.category);
      case 3: return !!fields.bio;
      case 4: return !!audioFile;
      case 5: return fields.consent;
      default: return false;
    }
  }, [step, fields, audioFile]);

  const next = () => { setError(""); if (canNext()) setStep(s => Math.min(5, s + 1) as Step); else setError("Remplis les champs obligatoires."); };
  const prev = () => { setError(""); setStep(s => Math.max(1, s - 1) as Step); };

  // ── Submit ─────────────────────────────────────────────
  const submit = useCallback(async () => {
    setError(""); setLoading(true); setProgress(0);
    if (fields.synauraUsername && fields.synauraPassword.length < 8) {
      setError("Mot de passe Synaura : 8 caractères minimum."); setLoading(false); return;
    }
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (typeof v === "string") fd.append(k, v); });
    if (audioFile) fd.append("audio", audioFile, audioFile.name);

    try {
      const t = await new Promise<string>((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/star-academy/apply");
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 90)); };
        xhr.onload = () => {
          setProgress(100);
          try {
            const d = JSON.parse(xhr.responseText);
            xhr.status < 300 && d.ok ? res(d.trackingToken) : rej(new Error(d.error || "Erreur serveur"));
          } catch { rej(new Error("Réponse invalide")); }
        };
        xhr.onerror = () => rej(new Error("Erreur réseau"));
        xhr.send(fd);
      });
      setToken(t); setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [fields, audioFile]);

  // ─────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "radial-gradient(ellipse at 30% 50%, #2d0a4e 0%, #0a0014 60%)" }}>
      <div className="w-full max-w-md text-center space-y-6">
        {/* Confetti stars */}
        <div className="text-6xl animate-bounce">🌟</div>
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Candidature envoyée !</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Un email de confirmation arrive sur <strong className="text-white">{fields.email}</strong>.
            Utilise ton token pour suivre ta candidature.
          </p>
        </div>

        {/* Token box */}
        <div className="rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-5">
          <p className="text-xs text-[#f59e0b] font-bold uppercase tracking-widest mb-2">Ton lien de suivi</p>
          <code className="text-xs text-white/80 break-all">{token}</code>
        </div>

        <div className="flex flex-col gap-3">
          <Link href={`/star-academy-tiktok/suivi?token=${token}`}
            className="block rounded-2xl py-3.5 font-black text-white text-center"
            style={{ background: "linear-gradient(90deg,#9333ea,#ec4899)" }}>
            Suivre ma candidature →
          </Link>
          <Link href="/star-academy-tiktok"
            className="block rounded-2xl border border-white/15 py-3.5 text-sm text-white/60 text-center hover:text-white transition">
            ← Retour à Star Academy
          </Link>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // MAIN LAYOUT
  // ─────────────────────────────────────────────────────────

  const inputCls = "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#9333ea]/70 focus:bg-white/8 transition";
  const labelCls = "block text-xs font-bold text-white/50 uppercase tracking-wider mb-2";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "#0a0014" }}>

      {/* ══════════════════════════════════════════════════
          PANNEAU GAUCHE — Visuel immersif (desktop fixe)
          ══════════════════════════════════════════════════ */}
      <div className="relative lg:sticky lg:top-0 lg:h-screen lg:w-[44%] xl:w-[42%] shrink-0 overflow-hidden">

        {/* Photo de fond : mansion + foule */}
        <Image
          src="/StarAcRes/sa-hero-mansion.jpg"
          alt="Star Academy TikTok — La Mansion"
          fill
          className="object-cover object-center"
          priority
          sizes="44vw"
        />

        {/* Calque concert (overlay additionnel) */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(10,0,20,0.25) 0%, rgba(10,0,20,0.1) 40%, rgba(10,0,20,0.7) 80%, rgba(10,0,20,0.97) 100%)" }} />

        {/* Halo violet + gold */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-40"
            style={{ background: "radial-gradient(circle, rgba(147,51,234,0.5) 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div className="absolute bottom-[20%] right-[-5%] w-[50%] h-[40%] rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.5) 0%, transparent 70%)", filter: "blur(50px)" }} />
        </div>

        {/* Contenu du panneau gauche */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8 z-10">

          {/* Top : Logo + badge */}
          <div className="flex items-start justify-between">
            <Link href="/star-academy-tiktok" className="opacity-90 hover:opacity-100 transition">
              <Image
                src="/StarAcRes/sa-logo.png"
                alt="Star Academy TikTok"
                width={160}
                height={60}
                className="object-contain drop-shadow-lg"
                style={{ filter: "drop-shadow(0 0 12px rgba(147,51,234,0.6)) brightness(1.2)" }}
              />
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-[#ec4899]/40 bg-[#ec4899]/15 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec4899] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ec4899]" />
              </span>
              <span className="text-[10px] font-black text-[#ec4899] uppercase tracking-widest">Live</span>
            </div>
          </div>

          {/* Centre : Titre principal */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-[#f59e0b] uppercase tracking-widest mb-3">★ Nouvelle Saison 2026</p>
              <h1 className="text-4xl md:text-5xl font-black leading-none text-white" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
                Inscription<br/>
                <span style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Auditions
                </span>
              </h1>
            </div>

            {/* Info pills */}
            <div className="flex flex-wrap gap-2">
              {["🎤 Chant / Rap", "🎛️ Mix / DJ", "💃 Danse", "✨ Autre"].map(c => (
                <span key={c} className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs text-white/70">{c}</span>
              ))}
            </div>

            {/* Prize highlight */}
            <div className="rounded-2xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-sm font-black text-[#f59e0b]">3 mois Premium Synaura</p>
                  <p className="text-xs text-white/50">offerts aux candidats retenus</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom : step en cours (mobile hidden, affiché ici sur desktop) */}
          <div className="hidden lg:block">
            <p className="text-xs text-white/30 mb-3">Étape {step} sur 5</p>
            <div className="flex gap-1.5">
              {STEPS.map(s => (
                <div key={s.n} className="flex-1 h-1 rounded-full transition-all duration-500"
                  style={{ background: s.n <= step ? "linear-gradient(90deg,#9333ea,#ec4899)" : "rgba(255,255,255,0.12)" }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PANNEAU DROIT — Formulaire multi-étapes
          ══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center px-5 py-10 md:px-10 max-w-xl mx-auto w-full">

          {/* Progress mobile */}
          <div className="lg:hidden mb-8">
            <div className="flex gap-1.5 mb-3">
              {STEPS.map(s => (
                <div key={s.n} className="flex-1 h-1 rounded-full transition-all duration-500"
                  style={{ background: s.n <= step ? "linear-gradient(90deg,#9333ea,#ec4899)" : "rgba(255,255,255,0.1)" }} />
              ))}
            </div>
            <p className="text-xs text-white/40">Étape {step} sur 5</p>
          </div>

          {/* Step indicator pills */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
            {STEPS.map(s => (
              <div key={s.n}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-default"
                style={{
                  background: s.n === step ? "linear-gradient(90deg,rgba(147,51,234,0.3),rgba(236,72,153,0.3))"
                    : s.n < step ? "rgba(147,51,234,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${s.n === step ? "rgba(147,51,234,0.6)" : s.n < step ? "rgba(147,51,234,0.25)" : "rgba(255,255,255,0.08)"}`,
                  color: s.n <= step ? "#fff" : "rgba(255,255,255,0.3)"
                }}>
                {s.n < step ? "✓" : s.icon} {s.label}
              </div>
            ))}
          </div>

          {/* ── STEP 1 : Identité ─────────────────────── */}
          {step === 1 && (
            <FormCard title="Qui es-tu ?" subtitle="Les informations de base sur ta candidature.">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Nom / Prénom <Req /></label>
                  <input className={inputCls} placeholder="Marie Dupont" value={fields.fullName} onChange={e => set("fullName", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Âge <Req /></label>
                  <input className={inputCls} type="number" min={13} max={99} placeholder="18" value={fields.age} onChange={e => set("age", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Téléphone</label>
                  <input className={inputCls} placeholder="+33 6…" value={fields.phone} onChange={e => set("phone", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Email <Req /></label>
                  <input className={inputCls} type="email" placeholder="email@exemple.com" value={fields.email} onChange={e => set("email", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Ville / Pays <Req /></label>
                  <input className={inputCls} placeholder="Paris, France" value={fields.location} onChange={e => set("location", e.target.value)} />
                </div>
              </div>
            </FormCard>
          )}

          {/* ── STEP 2 : Profil artistique ────────────── */}
          {step === 2 && (
            <FormCard title="Ton profil artistique" subtitle="Dis-nous ce que tu fais et où te trouver.">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Pseudo TikTok <Req /></label>
                  <input className={inputCls} placeholder="@tonpseudo" value={fields.tiktok} onChange={e => set("tiktok", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Catégorie <Req /></label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[["Chant","🎤"],["Rap","🎤"],["Mix / DJ","🎛️"],["Performance / Danse","💃"],["Autre","✨"]].map(([v,ic]) => (
                      <button key={v} type="button"
                        onClick={() => set("category", v)}
                        className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-left transition-all duration-200"
                        style={{
                          background: fields.category === v ? "linear-gradient(90deg,rgba(147,51,234,0.3),rgba(236,72,153,0.2))" : "rgba(255,255,255,0.04)",
                          borderColor: fields.category === v ? "rgba(147,51,234,0.6)" : "rgba(255,255,255,0.08)",
                          color: fields.category === v ? "#fff" : "rgba(255,255,255,0.5)"
                        }}>
                        <span>{ic}</span> {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Niveau</label>
                  <div className="flex gap-2 flex-wrap">
                    {["Débutant","Intermédiaire","Confirmé","Pro"].map(l => (
                      <button key={l} type="button"
                        onClick={() => set("level", fields.level === l ? "" : l)}
                        className="rounded-full border px-4 py-1.5 text-xs font-semibold transition-all"
                        style={{
                          background: fields.level === l ? "rgba(147,51,234,0.25)" : "rgba(255,255,255,0.04)",
                          borderColor: fields.level === l ? "rgba(147,51,234,0.5)" : "rgba(255,255,255,0.1)",
                          color: fields.level === l ? "#fff" : "rgba(255,255,255,0.4)"
                        }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Lien portfolio (optionnel)</label>
                  <input className={inputCls} placeholder="TikTok / Instagram / YouTube / Synaura" value={fields.link} onChange={e => set("link", e.target.value)} />
                </div>
              </div>
            </FormCard>
          )}

          {/* ── STEP 3 : Présentation ─────────────────── */}
          {step === 3 && (
            <FormCard title="Présente-toi" subtitle="Parle-nous de toi, ton univers, ce que tu veux montrer.">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Ta présentation <Req /></label>
                  <textarea className={`${inputCls} resize-none`} rows={6}
                    placeholder="Mon univers, mon style, ce que j'ai envie de montrer en live, pourquoi Star Academy TikTok…"
                    value={fields.bio} onChange={e => set("bio", e.target.value)} />
                  <p className="text-right text-xs text-white/25 mt-1">{fields.bio.length} / 500</p>
                </div>
                <div>
                  <label className={labelCls}>Disponibilités (optionnel)</label>
                  <input className={inputCls} placeholder="Soirs, week-ends, vacances d'été…"
                    value={fields.availability} onChange={e => set("availability", e.target.value)} />
                </div>
              </div>
            </FormCard>
          )}

          {/* ── STEP 4 : CV Vocal ─────────────────────── */}
          {step === 4 && (
            <FormCard title="CV Vocal" subtitle="20 à 60 secondes suffisent. Montre-toi au meilleur de ta forme.">
              <div className="space-y-4">
                {/* Upload zone */}
                <div
                  onClick={() => !audioFile && audioRef.current?.click()}
                  onDragEnter={e => { e.preventDefault(); setDrag(true); }}
                  onDragOver={e => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={e => { e.preventDefault(); setDrag(false); }}
                  onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
                  className="relative rounded-3xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-300"
                  style={{
                    borderColor: drag ? "#9333ea" : audioFile ? "rgba(147,51,234,0.4)" : "rgba(255,255,255,0.12)",
                    background: drag ? "rgba(147,51,234,0.1)" : audioFile ? "rgba(147,51,234,0.06)" : "rgba(255,255,255,0.02)"
                  }}>
                  <input ref={audioRef} type="file" accept="audio/*" className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />

                  {!audioFile ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <div className="text-5xl mb-4">🎵</div>
                      <p className="text-sm font-semibold text-white/60">Glisse ton fichier ici</p>
                      <p className="text-xs text-white/30 mt-1">MP3 · WAV · M4A — max 30 MB</p>
                      <button type="button"
                        onClick={e => { e.stopPropagation(); audioRef.current?.click(); }}
                        className="mt-4 rounded-full border border-white/20 bg-white/5 px-5 py-2 text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition">
                        Choisir un fichier
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 space-y-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                            <span>🎵</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{audioFile.name}</p>
                            <p className="text-xs text-white/40">{humanMb(audioFile.size)} MB</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setFile(null)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:text-white transition shrink-0">
                          Retirer
                        </button>
                      </div>
                      {audioUrl && <audio className="w-full h-10 rounded-xl" controls src={audioUrl} />}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/8 p-4 text-xs text-[#f59e0b]/80 leading-relaxed">
                  💡 <strong>Conseil :</strong> Commence par ton passage le plus fort. Les 10 premières secondes sont décisives. Pas besoin d'un studio — un bon smartphone suffit.
                </div>
              </div>
            </FormCard>
          )}

          {/* ── STEP 5 : Compte Synaura + Consent ──────── */}
          {step === 5 && (
            <FormCard title="Compte Synaura" subtitle="Tu rejoins Synaura en même temps que tu candidatures.">
              <div className="space-y-5">
                {/* Synaura promo */}
                <div className="rounded-2xl overflow-hidden border border-violet-500/25"
                  style={{ background: "linear-gradient(135deg,rgba(147,51,234,0.12),rgba(236,72,153,0.08))" }}>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <p className="text-sm font-black text-white">3 mois Premium offerts</p>
                        <p className="text-xs text-white/50">Activé automatiquement si tu es retenu(e)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={labelCls}>Pseudonyme Synaura <span className="text-white/30 normal-case font-normal">(optionnel si tu as déjà un compte)</span></label>
                    <input className={inputCls} placeholder="@tonpseudo" value={fields.synauraUsername}
                      onChange={e => set("synauraUsername", e.target.value.replace(/\s/g, ""))} autoComplete="username" />
                  </div>
                  <div>
                    <label className={labelCls}>Mot de passe <span className="text-white/30 normal-case font-normal">(min. 8 caractères)</span></label>
                    <input className={inputCls} type="password" placeholder="••••••••"
                      value={fields.synauraPassword} onChange={e => set("synauraPassword", e.target.value)} autoComplete="new-password" />
                  </div>
                </div>

                {/* Consent */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input type="checkbox" className="sr-only" checked={fields.consent} onChange={e => set("consent", e.target.checked)} />
                    <div className="h-5 w-5 rounded-lg border-2 transition-all"
                      style={{
                        borderColor: fields.consent ? "#9333ea" : "rgba(255,255,255,0.2)",
                        background: fields.consent ? "linear-gradient(135deg,#9333ea,#ec4899)" : "transparent"
                      }}>
                      {fields.consent && <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">✓</span>}
                    </div>
                  </div>
                  <span className="text-xs text-white/40 leading-relaxed group-hover:text-white/60 transition">
                    Je confirme avoir les droits sur mon enregistrement audio, j'accepte d'être recontacté(e) par Synaura dans le cadre de ce concours et j'accepte les{" "}
                    <Link href="/legal/cgu" target="_blank" className="text-violet-400 hover:underline">Conditions Générales d'Utilisation</Link>.
                  </span>
                </label>

                {/* Submit */}
                {error && <div className="rounded-2xl border border-[#ec4899]/30 bg-[#ec4899]/10 px-4 py-3 text-sm text-[#ec4899]">⚠️ {error}</div>}

                {loading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/40">
                      <span>Envoi en cours…</span><span>{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-white/8">
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%`, background: "linear-gradient(90deg,#9333ea,#ec4899)" }} />
                    </div>
                  </div>
                )}

                <button type="button" disabled={loading || !fields.consent} onClick={submit}
                  className="w-full rounded-2xl py-4 font-black text-base text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: loading ? "rgba(147,51,234,0.4)" : "linear-gradient(90deg,#9333ea,#ec4899)", boxShadow: "0 0 30px rgba(147,51,234,0.3)" }}>
                  {loading ? "Envoi en cours…" : "🌟 Envoyer ma candidature"}
                </button>
              </div>
            </FormCard>
          )}

          {/* ── Error global (hors step 5) ─────────────── */}
          {error && step !== 5 && (
            <div className="mt-4 rounded-2xl border border-[#ec4899]/30 bg-[#ec4899]/10 px-4 py-3 text-sm text-[#ec4899]">
              ⚠️ {error}
            </div>
          )}

          {/* ── Navigation Prev / Next ─────────────────── */}
          {step < 5 && (
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button type="button" onClick={prev}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition">
                  ← Retour
                </button>
              )}
              <button type="button" onClick={next}
                className="flex-1 rounded-2xl py-3.5 font-black text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(90deg,#9333ea,#ec4899)", boxShadow: "0 0 20px rgba(147,51,234,0.25)" }}>
                Continuer →
              </button>
            </div>
          )}

          {/* ── Back on step 5 ────────────────────────── */}
          {step === 5 && (
            <button type="button" onClick={prev}
              className="mt-4 w-full rounded-2xl border border-white/8 py-3 text-sm text-white/40 hover:text-white/70 transition">
              ← Modifier ma présentation
            </button>
          )}

          <p className="text-center text-xs text-white/20 mt-6">Gratuit · Aucun engagement · Résultats par email</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────
function FormCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="text-sm text-white/40 mt-1">{subtitle}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Req() {
  return <span className="text-[#ec4899] ml-0.5">*</span>;
}

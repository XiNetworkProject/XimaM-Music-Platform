"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PrimeStageBackground } from "@/components/PrimeStageBackground";

// ─── Types ────────────────────────────────────────────────
type SubmitState = "idle" | "uploading" | "success" | "error";

interface FormFields {
  fullName: string;
  age: string;
  email: string;
  phone: string;
  location: string;
  tiktok: string;
  category: string;
  level: string;
  link: string;
  bio: string;
  availability: string;
  synauraUsername: string;
  synauraPassword: string;
  consent: boolean;
}

const EMPTY: FormFields = {
  fullName: "", age: "", email: "", phone: "", location: "",
  tiktok: "", category: "", level: "", link: "",
  bio: "", availability: "",
  synauraUsername: "", synauraPassword: "",
  consent: false,
};

function humanMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// ─── Component ────────────────────────────────────────────
export default function StarAcademyInscriptionPage() {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<FormFields>(EMPTY);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [trackingToken, setTrackingToken] = useState("");

  const set = useCallback(<K extends keyof FormFields>(k: K, v: FormFields[K]) => {
    setFields((f) => ({ ...f, [k]: v }));
  }, []);

  const setFile = useCallback((f: File | null) => {
    if (!f) {
      setAudioFile(null);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
      return;
    }
    if (!f.type.startsWith("audio/")) {
      setErrorMsg("Le fichier doit être un format audio (MP3, WAV, M4A…).");
      return;
    }
    if (f.size > 30 * 1024 * 1024) {
      setErrorMsg("Fichier trop lourd (max 30MB).");
      return;
    }
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioFile(f);
    setAudioPreviewUrl(URL.createObjectURL(f));
    setErrorMsg("");
  }, [audioPreviewUrl]);

  useEffect(() => {
    return () => { if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl); };
  }, [audioPreviewUrl]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fields.fullName || !fields.email || !fields.age || !fields.location || !fields.tiktok || !fields.category || !fields.bio) {
      setErrorMsg("Merci de remplir tous les champs obligatoires (*).");
      return;
    }
    if (!audioFile) {
      setErrorMsg("Un fichier audio (CV vocal) est requis.");
      return;
    }
    if (!fields.consent) {
      setErrorMsg("Tu dois accepter les conditions pour envoyer ta candidature.");
      return;
    }
    if (fields.synauraUsername && !fields.synauraPassword) {
      setErrorMsg("Renseigne un mot de passe pour créer ton compte Synaura.");
      return;
    }
    if (fields.synauraPassword && fields.synauraPassword.length < 8) {
      setErrorMsg("Le mot de passe Synaura doit contenir au moins 8 caractères.");
      return;
    }

    setSubmitState("uploading");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("fullName",        fields.fullName);
    formData.append("age",             fields.age);
    formData.append("email",           fields.email);
    formData.append("phone",           fields.phone);
    formData.append("location",        fields.location);
    formData.append("tiktok",          fields.tiktok);
    formData.append("category",        fields.category);
    formData.append("level",           fields.level);
    formData.append("link",            fields.link);
    formData.append("bio",             fields.bio);
    formData.append("availability",    fields.availability);
    formData.append("synauraUsername", fields.synauraUsername);
    formData.append("synauraPassword", fields.synauraPassword);
    formData.append("audio",           audioFile, audioFile.name);

    try {
      // XHR pour le suivi de progression
      const token = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/star-academy/apply");

        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(Math.round((ev.loaded / ev.total) * 90));
          }
        });

        xhr.addEventListener("load", () => {
          setUploadProgress(100);
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
              resolve(data.trackingToken);
            } else {
              reject(new Error(data.error || "Erreur serveur."));
            }
          } catch {
            reject(new Error("Réponse invalide du serveur."));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Erreur réseau. Vérifie ta connexion.")));
        xhr.send(formData);
      });

      setTrackingToken(token);
      setSubmitState("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue.");
      setSubmitState("error");
    }
  }, [fields, audioFile]);

  // ─── Success State ────────────────────────────────────────
  if (submitState === "success") {
    return (
      <div className="relative min-h-screen text-white overflow-x-hidden">
        <PrimeStageBackground intensity={0.7} />
        <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
          <div
            className="w-full max-w-md rounded-3xl border border-[#ffd47a]/30 p-8 md:p-10 backdrop-blur-xl"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(0,242,234,0.08))" }}
          >
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-black text-white mb-2">Candidature envoyée !</h1>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              Un email de confirmation a été envoyé à <strong className="text-white">{fields.email}</strong>.
              Utilise ton lien de suivi pour suivre l'évolution de ta candidature.
            </p>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6 text-left">
              <div className="text-xs text-white/40 mb-1">Ton lien de suivi</div>
              <code className="text-xs text-[#00f2ea] break-all">
                /star-academy-tiktok/suivi?token={trackingToken}
              </code>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={`/star-academy-tiktok/suivi?token=${trackingToken}`}
                className="rounded-2xl py-3 font-bold text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(90deg,#7c3aed,#00f2ea)" }}
              >
                Suivre ma candidature →
              </Link>
              <Link
                href="/star-academy-tiktok"
                className="rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 transition"
              >
                ← Retour à Star Academy
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────
  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#7c3aed]/60 focus:ring-1 focus:ring-[#7c3aed]/30 transition";
  const labelCls = "block text-xs font-semibold text-white/60 mb-1.5";
  const reqMark  = <span className="text-[#ff2d55] ml-0.5">*</span>;

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <PrimeStageBackground intensity={0.8} />

      <div className="relative z-20 max-w-4xl mx-auto px-4 py-8">

        {/* ── Nav ─────────────────────────────────────────── */}
        <nav className="flex items-center justify-between mb-8">
          <Link href="/star-academy-tiktok" className="text-sm text-white/50 hover:text-white transition">
            ← Star Academy TikTok
          </Link>
          <span className="text-xs text-[#ffd47a] font-bold uppercase tracking-widest">★ Auditions ouvertes</span>
        </nav>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff2d55]/30 bg-[#ff2d55]/10 px-4 py-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2d55] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff2d55]" />
            </span>
            <span className="text-xs font-bold text-[#ff2d55] tracking-widest uppercase">Live · Candidature officielle</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Inscription Star Academy TikTok</h1>
          <p className="text-white/50 text-sm max-w-lg mx-auto">
            Remplis ce formulaire et uploade ton CV vocal (20–60s). Tu t'inscris simultanément sur Synaura.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Section 1 : Identité ─────────────────────── */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#ffd47a] mb-5">01 — Identité</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nom / Prénom {reqMark}</label>
                <input className={inputCls} placeholder="Marie Dupont" value={fields.fullName} onChange={(e) => set("fullName", e.target.value)} required />
              </div>
              <div>
                <label className={labelCls}>Âge {reqMark}</label>
                <input className={inputCls} type="number" min={13} max={99} placeholder="18" value={fields.age} onChange={(e) => set("age", e.target.value)} required />
              </div>
              <div>
                <label className={labelCls}>Email {reqMark}</label>
                <input className={inputCls} type="email" placeholder="email@exemple.com" value={fields.email} onChange={(e) => set("email", e.target.value)} required />
              </div>
              <div>
                <label className={labelCls}>Téléphone</label>
                <input className={inputCls} placeholder="+33 6…" value={fields.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Ville / Pays {reqMark}</label>
                <input className={inputCls} placeholder="Paris, France" value={fields.location} onChange={(e) => set("location", e.target.value)} required />
              </div>
            </div>
          </div>

          {/* ── Section 2 : Profil artistique ───────────── */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#00f2ea] mb-5">02 — Profil artistique</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Pseudo TikTok {reqMark}</label>
                <input className={inputCls} placeholder="@tonpseudo" value={fields.tiktok} onChange={(e) => set("tiktok", e.target.value)} required />
              </div>
              <div>
                <label className={labelCls}>Catégorie {reqMark}</label>
                <select
                  className={`${inputCls} cursor-pointer`}
                  value={fields.category}
                  onChange={(e) => set("category", e.target.value)}
                  required
                >
                  <option value="">Sélectionner…</option>
                  <option value="Chant">🎤 Chant</option>
                  <option value="Rap">🎤 Rap</option>
                  <option value="Mix / DJ">🎛️ Mix / DJ</option>
                  <option value="Performance / Danse">💃 Performance / Danse</option>
                  <option value="Autre">✨ Autre</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Niveau</label>
                <select className={`${inputCls} cursor-pointer`} value={fields.level} onChange={(e) => set("level", e.target.value)}>
                  <option value="">Sélectionner…</option>
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Confirmé">Confirmé</option>
                  <option value="Pro">Pro</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Lien portfolio (optionnel)</label>
                <input className={inputCls} placeholder="TikTok / Insta / YouTube / Synaura" value={fields.link} onChange={(e) => set("link", e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Section 3 : Présentation ─────────────────── */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#7c3aed] mb-5">03 — Présentation</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Présente-toi {reqMark}</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  placeholder="Ton univers, ton style, ce que tu veux montrer en live…"
                  value={fields.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Disponibilités (optionnel)</label>
                <input className={inputCls} placeholder="Soirs, week-ends, vacances…" value={fields.availability} onChange={(e) => set("availability", e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Section 4 : CV Vocal ─────────────────────── */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#ff2d55] mb-5">04 — CV Vocal {reqMark}</h2>
            <p className="text-xs text-white/40 mb-4">Upload un fichier audio (20–60s conseillé). MP3, WAV, M4A — max 30MB.</p>

            <div
              className={`relative rounded-2xl border-2 border-dashed p-6 cursor-pointer transition text-center ${drag ? "border-[#00f2ea] bg-[#00f2ea]/10" : "border-white/15 hover:border-white/30"}`}
              onClick={() => audioInputRef.current?.click()}
              onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files?.[0];
                if (f) setFile(f);
              }}
            >
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
              />

              {!audioFile ? (
                <>
                  <div className="text-3xl mb-2">🎵</div>
                  <p className="text-sm text-white/60">Glisse ton fichier ici ou <span className="text-[#00f2ea] underline">clique pour choisir</span></p>
                </>
              ) : (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white truncate max-w-xs">{audioFile.name}</div>
                      <div className="text-xs text-white/40">{humanMb(audioFile.size)} MB · {audioFile.type}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      Retirer
                    </button>
                  </div>
                  {audioPreviewUrl && (
                    <audio className="w-full h-10 rounded-xl" controls src={audioPreviewUrl} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 5 : Compte Synaura ───────────────── */}
          <div
            className="rounded-3xl border border-[#7c3aed]/30 p-6 mb-4 backdrop-blur-sm"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.1),rgba(0,242,234,0.05))" }}
          >
            <div className="flex items-start gap-3 mb-5">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-[#a78bfa]">05 — Compte Synaura</h2>
                <p className="text-xs text-white/40 mt-1">
                  Tu t'inscris simultanément sur Synaura. Si tu as déjà un compte, laisse vide — on liera ta candidature à ton email.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Pseudonyme Synaura</label>
                <input
                  className={inputCls}
                  placeholder="@tonpseudo"
                  value={fields.synauraUsername}
                  onChange={(e) => set("synauraUsername", e.target.value.replace(/\s/g, ""))}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className={labelCls}>Mot de passe</label>
                <input
                  className={inputCls}
                  type="password"
                  placeholder="Min. 8 caractères"
                  value={fields.synauraPassword}
                  onChange={(e) => set("synauraPassword", e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-[#7c3aed]/20 bg-[#7c3aed]/10 px-4 py-3 text-xs text-[#c4b5fd]">
              🏆 Les candidats retenus reçoivent <strong>3 mois de Premium Synaura</strong> offerts, directement activés sur leur compte.
            </div>
          </div>

          {/* ── Consentement ─────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5 mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded accent-violet-500 cursor-pointer"
                checked={fields.consent}
                onChange={(e) => set("consent", e.target.checked)}
              />
              <span className="text-xs text-white/50 leading-relaxed">
                Je confirme disposer des droits nécessaires sur l'enregistrement audio envoyé,
                j'accepte d'être recontacté(e) par Synaura dans le cadre de ce concours et
                j'accepte les{" "}
                <Link href="/legal/cgu" className="text-[#7c3aed] hover:underline" target="_blank">CGU</Link>.
              </span>
            </label>
          </div>

          {/* ── Erreur ───────────────────────────────────── */}
          {errorMsg && (
            <div className="rounded-2xl border border-[#ff2d55]/30 bg-[#ff2d55]/10 px-4 py-3 text-sm text-[#ff2d55] mb-4">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ── Progress bar ─────────────────────────────── */}
          {submitState === "uploading" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <div className="flex justify-between text-xs text-white/60 mb-2">
                <span>Envoi en cours…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                    background: "linear-gradient(90deg,#7c3aed,#00f2ea)",
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Submit ───────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitState === "uploading"}
            className="w-full rounded-2xl py-4 font-black text-base text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(90deg,#7c3aed,#ff2d55)" }}
          >
            {submitState === "uploading" ? "Envoi en cours…" : "🎤 Envoyer ma candidature"}
          </button>

          <p className="text-center text-xs text-white/25 mt-4">
            Inscription gratuite · CV vocal requis · Résultats par email
          </p>
        </form>
      </div>
    </div>
  );
}

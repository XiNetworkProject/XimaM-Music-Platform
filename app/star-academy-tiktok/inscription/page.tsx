"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PrimeStageBackground } from "@/components/PrimeStageBackground";
import "./star-academy-inscription.css";

const SVG = {
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2l1.2 4.2L18 8l-4.8 1.8L12 14l-1.2-4.2L6 8l4.8-1.8L12 2z" />
      <path d="M5 13l.7 2.5L8 16l-2.3.5L5 19l-.7-2.5L2 16l2.3-.5L5 13z" />
      <path d="M19 12l.7 2.5L22 15l-2.3.5L19 18l-.7-2.5L16 15l2.3-.5L19 12z" />
    </svg>
  ),
  tv: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 9h18v6H3z" />
      <path d="M7 9V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
      <path d="M7 15v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 3v3m8-3v3" />
      <path d="M4 8h16" />
      <path d="M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v4" />
      <path d="M8 23h8" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2l8 4v6c0 5-3 9-8 10C7 21 4 17 4 12V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  hash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 9h16" />
      <path d="M4 15h16" />
      <path d="M10 3L8 21" />
      <path d="M16 3l-2 18" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 4h16v16H4z" />
      <path d="M4 4l8 8 8-8" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.4a2 2 0 0 1-.5 2.1L8.1 9.1a16 16 0 0 0 6.8 6.8l.9-1.1a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.4.6a2 2 0 0 1 1.7 2z" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10a8 8 0 0 0-16 0c0 6 8 10 8 10z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5-5 5 5" />
      <path d="M12 5v14" />
    </svg>
  ),
  music: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="7" cy="18" r="3" />
      <circle cx="19" cy="16" r="3" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 4 4 6-6" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 6v6l4 2" />
      <path d="M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" />
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 16.5a4.5 4.5 0 0 0-2.9-8.4A6 6 0 0 0 5 9.5a4 4 0 0 0 1 7.8" />
      <path d="M12 12v8" />
      <path d="M8 16l4-4 4 4" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M10 15v-3a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3" />
      <path d="M8 16h8" />
    </svg>
  ),
};

function humanMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function StarAcademyInscriptionPage() {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const [alert, setAlert] = useState<{ type: "ok" | "bad"; msg: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const rafRef = useRef<number>(0);

  const showAlert = useCallback((type: "ok" | "bad", msg: string) => {
    setAlert({ type, msg });
  }, []);

  const clearAlert = useCallback(() => {
    setAlert(null);
  }, []);

  const setFile = useCallback(
    (f: File | null) => {
      clearAlert();
      if (!f) {
        setAudioFile(null);
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
        return;
      }
      if (!f.type.startsWith("audio/")) {
        showAlert("bad", "Le fichier doit être un format audio.");
        return;
      }
      if (f.size > 25 * 1024 * 1024) {
        showAlert("bad", "Fichier trop lourd (max 25MB).");
        return;
      }
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioFile(f);
      setAudioPreviewUrl(URL.createObjectURL(f));
    },
    [audioPreviewUrl, clearAlert, showAlert]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      setMx(x);
      setMy(y);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      el.style.transform = `translate3d(${mx * 8}px, ${my * 6}px, 0)`;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mx, my]);

  const onChooseAudio = () => audioInputRef.current?.click();
  const onRemoveAudio = () => setFile(null);

  const onUploadDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const onUploadDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(true);
  };

  const onUploadDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearAlert();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      showAlert("bad", "Champs requis manquants : vérifie le formulaire et l’audio.");
      return;
    }
    if (!audioFile) {
      showAlert("bad", "Tu dois joindre un fichier audio (CV vocal).");
      return;
    }
    showAlert("ok", "Candidature prête à être envoyée. Backend à brancher (Synaura).");
  };

  return (
    <div className="sa-inscription">
      <PrimeStageBackground intensity={1} />

      <main className="sa-wrap sa-wrap-z">
        <div className="sa-parallax" ref={parallaxRef}>
          <section className="sa-glass sa-hero">
            <div className="sa-hero-top">
              <div>
                <div className="sa-badge">
                  {SVG.star}
                  Auditions ouvertes • Prime Stage
                </div>
                <h1>Star Academy TikTok • Inscription Live</h1>
                <p className="sa-sub">
                  Candidature officielle : informations + profil + upload audio (CV vocal).
                  Ambiance Star Academy (gold), énergie TikTok (cyan/pink), esthétique néon.
                </p>
                <div className="sa-actions">
                  <a className="sa-pill" href="#form">
                    <span className="sa-dot" /> Candidater
                  </a>
                  <a className="sa-pill" href="#steps">
                    <span className="sa-dot" style={{ animationDelay: "-0.5s" }} /> Règles
                  </a>
                </div>
              </div>
              <div className="sa-logo-card">
                <div className="sa-logo-glow" />
                <div className="sa-logo-inner">
                  <div className="sa-scanline" />
                  <Image
                    src="/mixxpartywhitelog.png"
                    alt="Logo Star Academy TikTok"
                    width={380}
                    height={120}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="sa-grid">
            <section className="sa-glass sa-card">
              <div className="sa-info-grid">
                <div className="sa-info">
                  <div className="sa-info-head">
                    {SVG.tv}
                    Format du jeu
                  </div>
                  <p>Lives TikTok : auditions, défis, évaluations, progression, moments prime.</p>
                </div>
                <div className="sa-info">
                  <div className="sa-info-head">
                    {SVG.calendar}
                    Sélection
                  </div>
                  <p>Audio écouté + profil validé → invitation en live si retenu.</p>
                </div>
                <div className="sa-info">
                  <div className="sa-info-head">
                    {SVG.mic}
                    Ce qui fait la diff
                  </div>
                  <p>20–60s, passage fort, identité claire, énergie scène immédiate.</p>
                </div>
                <div className="sa-info">
                  <div className="sa-info-head">
                    {SVG.shield}
                    Droits & respect
                  </div>
                  <p>En envoyant, tu confirmes disposer des droits nécessaires sur l’enregistrement.</p>
                </div>
              </div>

              <div className="sa-steps" id="steps">
                <div className="sa-step">
                  <div className="sa-num">01</div>
                  <div>
                    <b>Inscription</b>
                    <small>Profil + audio CV vocal</small>
                  </div>
                </div>
                <div className="sa-step">
                  <div className="sa-num">02</div>
                  <div>
                    <b>Pré-sélection</b>
                    <small>Écoute + validation</small>
                  </div>
                </div>
                <div className="sa-step">
                  <div className="sa-num">03</div>
                  <div>
                    <b>Live TikTok</b>
                    <small>Prestation + interaction</small>
                  </div>
                </div>
                <div className="sa-step">
                  <div className="sa-num">04</div>
                  <div>
                    <b>Progression</b>
                    <small>Évaluations / primes</small>
                  </div>
                </div>
              </div>
            </section>

            <aside className="sa-glass sa-card" id="form">
              <div className="sa-form-head">
                <div>
                  <h2>Candidature</h2>
                  <p>Champs requis * + audio. Aperçu instant dans le player.</p>
                </div>
              </div>

              {alert && (
                <div className={`sa-alert ${alert.type === "ok" ? "sa-ok" : "sa-bad"}`} role="alert">
                  {alert.msg}
                </div>
              )}

              <form className="sa-form" onSubmit={onSubmit} noValidate>
                <div className="sa-row">
                  <div>
                    <label>
                      {SVG.user}
                      Nom / Prénom <span className="sa-req">*</span>
                    </label>
                    <input name="fullName" required placeholder="Nom Prénom" />
                  </div>
                  <div>
                    <label>
                      {SVG.hash}
                      Âge <span className="sa-req">*</span>
                    </label>
                    <input name="age" type="number" min={13} max={99} required placeholder="18" />
                  </div>
                </div>

                <div className="sa-row">
                  <div>
                    <label>
                      {SVG.mail}
                      Email <span className="sa-req">*</span>
                    </label>
                    <input name="email" type="email" required placeholder="email@exemple.com" />
                  </div>
                  <div>
                    <label>
                      {SVG.phone}
                      Téléphone
                    </label>
                    <input name="phone" placeholder="+33 6…" />
                  </div>
                </div>

                <div className="sa-row">
                  <div>
                    <label>
                      {SVG.map}
                      Ville / Pays <span className="sa-req">*</span>
                    </label>
                    <input name="location" required placeholder="Lille, France" />
                  </div>
                  <div>
                    <label>
                      {SVG.upload}
                      Pseudo TikTok <span className="sa-req">*</span>
                    </label>
                    <input name="tiktok" required placeholder="@pseudo" />
                  </div>
                </div>

                <div className="sa-row">
                  <div>
                    <label>
                      {SVG.music}
                      Catégorie <span className="sa-req">*</span>
                    </label>
                    <select name="category" required>
                      <option value="">Sélectionner…</option>
                      <option value="Chant">Chant</option>
                      <option value="Rap">Rap</option>
                      <option value="Mix / DJ">Mix / DJ</option>
                      <option value="Performance / Danse">Performance / Danse</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label>
                      {SVG.chart}
                      Niveau
                    </label>
                    <select name="level">
                      <option value="">Sélectionner…</option>
                      <option value="Débutant">Débutant</option>
                      <option value="Intermédiaire">Intermédiaire</option>
                      <option value="Confirmé">Confirmé</option>
                      <option value="Pro">Pro</option>
                    </select>
                  </div>
                </div>

                <label>
                  {SVG.link}
                  Lien (optionnel)
                </label>
                <input name="link" placeholder="TikTok / Insta / YouTube / Synaura" />

                <label>
                  {SVG.message}
                  Présentation <span className="sa-req">*</span>
                </label>
                <textarea name="bio" required placeholder="Univers, style, ce que tu veux montrer en live…" />

                <label>
                  {SVG.clock}
                  Disponibilités (optionnel)
                </label>
                <input name="availability" placeholder="Soirs / week-end…" />

                <label>
                  {SVG.cloud}
                  Audio (CV vocal) <span className="sa-req">*</span>
                </label>

                <div
                  className={`sa-upload ${drag ? "sa-drag" : ""}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    onChooseAudio();
                  }}
                  onDragEnter={onUploadDragOver}
                  onDragOver={onUploadDragOver}
                  onDragLeave={onUploadDragLeave}
                  onDrop={onUploadDrop}
                >
                  <div className="sa-upload-top">
                    <div className="sa-upload-title">
                      {SVG.file}
                      Cliquer ou glisser-déposer un audio
                    </div>
                    <button type="button" className="sa-btn-small" onClick={onChooseAudio}>
                      Choisir
                    </button>
                  </div>
                  <div className="sa-hint">MP3 / WAV / M4A • 20–60s conseillé • max 25MB</div>

                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
                    aria-hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFile(f);
                    }}
                  />

                  <div className={`sa-file-box ${audioFile ? "" : "sa-file-box-hidden"}`}>
                    <div className="sa-file-head">
                      <div style={{ minWidth: 0 }}>
                        <div className="sa-file-name">{audioFile?.name ?? ""}</div>
                        <div className="sa-file-meta">
                          {audioFile
                            ? `${humanMb(audioFile.size)} MB • ${audioFile.type || "audio"}`
                            : ""}
                        </div>
                      </div>
                      <button type="button" className="sa-btn-small" onClick={onRemoveAudio}>
                        Retirer
                      </button>
                    </div>
                    {audioPreviewUrl && (
                      <audio className="sa-audio-player" controls src={audioPreviewUrl} />
                    )}
                  </div>
                </div>

                <div className="sa-consent">
                  <input id="consent" name="consent" type="checkbox" required />
                  <p>
                    Je confirme disposer des droits nécessaires sur l’audio envoyé et j’accepte d’être
                    recontacté.
                  </p>
                </div>

                <button type="submit" className="sa-btn">
                  Envoyer la candidature
                </button>
              </form>

              <div className="sa-footer">
                Star Academy TikTok • Inscription auditions • Synaura
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

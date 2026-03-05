"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────
type Phase = "intro" | "form" | "done";
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
  { n: 1, label: "Identité"     },
  { n: 2, label: "Artiste"      },
  { n: 3, label: "Présentation" },
  { n: 4, label: "CV Vocal"     },
  { n: 5, label: "Compte"       },
];

// ─── CSS Keyframes ────────────────────────────────────────
const KEYFRAMES = `
  @keyframes sa-fade-up {
    from { opacity: 0; transform: translateY(48px); filter: blur(8px); }
    to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
  }
  @keyframes sa-fade-out {
    from { opacity: 1; transform: translateY(0);    filter: blur(0);   }
    to   { opacity: 0; transform: translateY(-24px); filter: blur(8px); }
  }
  @keyframes sa-bg-zoom {
    from { opacity: 0; transform: scale(1.18); }
    to   { opacity: 1; transform: scale(1.04); }
  }
  @keyframes sa-logo-burst {
    0%   { opacity: 0; transform: scale(0.35); filter: blur(24px) brightness(5); }
    40%  { opacity: 1; transform: scale(1.12); filter: blur(3px)  brightness(2); }
    100% { opacity: 1; transform: scale(1);    filter: blur(0)    brightness(1); }
  }
  @keyframes sa-ring {
    from { transform: scale(0.8); opacity: 0.7; }
    to   { transform: scale(2.8); opacity: 0;   }
  }
  @keyframes sa-glow-pulse {
    0%,100% { box-shadow: 0 0 30px rgba(147,51,234,0.5), 0 0 60px rgba(147,51,234,0.2); }
    50%      { box-shadow: 0 0 60px rgba(147,51,234,0.9), 0 0 120px rgba(236,72,153,0.4), 0 0 200px rgba(147,51,234,0.15); }
  }
  @keyframes sa-gold-flicker {
    0%,85%,100% { filter: brightness(1) drop-shadow(0 0 8px rgba(245,158,11,0.4)); }
    90%         { filter: brightness(1.4) drop-shadow(0 0 20px rgba(245,158,11,0.9)); }
  }
  @keyframes sa-scan {
    from { top: -4%; }
    to   { top: 108%; }
  }
  @keyframes sa-letter-in {
    from { opacity: 0; transform: translateY(20px) rotateX(40deg); }
    to   { opacity: 1; transform: translateY(0)    rotateX(0deg);  }
  }
  @keyframes sa-particle {
    0%   { opacity: 0.8; transform: translate(0, 0) scale(1); }
    100% { opacity: 0;   transform: translate(var(--px), var(--py)) scale(0); }
  }
  @keyframes sa-divider-grow {
    from { transform: scaleX(0); opacity: 0; }
    to   { transform: scaleX(1); opacity: 1; }
  }
  @keyframes sa-badge-in {
    from { opacity: 0; transform: scale(0.7) translateY(10px); }
    to   { opacity: 1; transform: scale(1)   translateY(0);    }
  }
  @keyframes sa-video-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

// ─── Cinematic Intro ──────────────────────────────────────
function CinematicIntro({ onEnter }: { onEnter: () => void }) {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setScene(1), 200),   // bg + brand reveal
      setTimeout(() => setScene(2), 2400),  // s'associent pour...
      setTimeout(() => setScene(3), 3800),  // transition
      setTimeout(() => setScene(4), 4400),  // SA logo burst
      setTimeout(() => setScene(5), 6000),  // Nouvelle Saison
      setTimeout(() => setScene(6), 7400),  // CTA
    ];
    const autoSkip = setTimeout(onEnter, 10500);
    return () => { timers.forEach(clearTimeout); clearTimeout(autoSkip); };
  }, [onEnter]);

  // Particles
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    dx: (Math.random() - 0.5) * 200,
    dy: -80 - Math.random() * 150,
    delay: 0.5 + Math.random() * 3,
    dur: 3 + Math.random() * 4,
    color: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#9333ea" : "#ec4899",
  }));

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "#000", overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Background concert */}
      <div
        style={{
          position: "absolute", inset: 0,
          animation: "sa-bg-zoom 2s cubic-bezier(0.4,0,0.2,1) forwards",
        }}
      >
        <Image
          src="/StarAcRes/sa-concert-bg.jpg"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
      </div>

      {/* Dark vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)",
      }} />

      {/* Purple haze */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(147,51,234,0.25) 0%, transparent 50%, rgba(236,72,153,0.15) 100%)",
      }} />

      {/* Scanline */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: "2px",
        background: "linear-gradient(90deg, transparent, rgba(147,51,234,0.8), rgba(236,72,153,0.6), transparent)",
        animation: "sa-scan 3.5s linear 0.3s infinite",
      }} />

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          borderRadius: "50%",
          background: p.color,
          boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          animation: `sa-particle ${p.dur}s ease-out ${p.delay}s infinite`,
          // @ts-expect-error CSS custom properties
          "--px": `${p.dx}px`,
          "--py": `${p.dy}px`,
        }} />
      ))}

      {/* ── SCENE 1 : SYNAURA × MIXX PARTY ── */}
      {scene >= 1 && scene <= 3 && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 0,
          animation: scene >= 3 ? "sa-fade-out 0.8s ease-in forwards" : "sa-fade-up 1s ease-out forwards",
        }}>
          {/* Synaura logo */}
          <div style={{
            animation: "sa-fade-up 1s ease-out 0.1s both",
            marginBottom: "16px",
          }}>
            <Image
              src="/synaura_logotype.svg"
              alt="Synaura"
              width={180}
              height={56}
              style={{ filter: "brightness(0) invert(1) drop-shadow(0 0 20px rgba(147,51,234,0.8))" }}
            />
          </div>

          {/* Divider × */}
          <div style={{
            animation: "sa-fade-up 0.8s ease-out 0.5s both",
            display: "flex", alignItems: "center", gap: "20px",
            marginBottom: "16px",
          }}>
            <div style={{
              height: "1px", width: "60px",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4))",
              animation: "sa-divider-grow 0.8s ease-out 0.7s both",
              transformOrigin: "right",
            }} />
            <span style={{
              fontSize: "28px", fontWeight: 200, color: "rgba(255,255,255,0.5)",
              letterSpacing: "8px",
            }}>×</span>
            <div style={{
              height: "1px", width: "60px",
              background: "linear-gradient(90deg, rgba(255,255,255,0.4), transparent)",
              animation: "sa-divider-grow 0.8s ease-out 0.7s both",
              transformOrigin: "left",
            }} />
          </div>

          {/* Mixx Party */}
          <div style={{ animation: "sa-fade-up 1s ease-out 0.6s both" }}>
            <span style={{
              fontSize: "clamp(32px, 6vw, 64px)",
              fontWeight: 900,
              letterSpacing: "-1px",
              background: "linear-gradient(90deg, #00f2ea, #69c9d0, #ffffff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 16px rgba(0,242,234,0.5))",
              textTransform: "uppercase",
            }}>
              Mixx Party
            </span>
          </div>

          {/* Subtitle */}
          {scene >= 2 && (
            <div style={{
              marginTop: "32px",
              animation: "sa-fade-up 0.9s ease-out forwards",
              textAlign: "center",
              padding: "0 20px",
            }}>
              <p style={{
                fontSize: "clamp(14px, 2vw, 18px)",
                color: "rgba(255,255,255,0.6)",
                fontWeight: 300,
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}>
                s&apos;associent pour vous présenter
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── SCENE 2 : SA Logo burst ── */}
      {scene >= 4 && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "24px",
        }}>
          {/* Logo + rings */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Burst rings */}
            {[0, 0.2, 0.4].map((delay, i) => (
              <div key={i} style={{
                position: "absolute",
                width: "200px", height: "200px",
                borderRadius: "50%",
                border: `1px solid ${i === 0 ? "rgba(147,51,234,0.6)" : i === 1 ? "rgba(236,72,153,0.4)" : "rgba(245,158,11,0.3)"}`,
                animation: `sa-ring 2s ease-out ${delay}s infinite`,
              }} />
            ))}

            {/* Logo */}
            <div style={{ animation: "sa-logo-burst 1.2s cubic-bezier(0.16,1,0.3,1) forwards" }}>
              <Image
                src="/StarAcRes/sa-logo-transparent.png"
                alt="Star Academy TikTok"
                width={280}
                height={200}
                style={{
                  filter: "drop-shadow(0 0 30px rgba(147,51,234,0.7)) drop-shadow(0 0 60px rgba(236,72,153,0.4)) brightness(1.2)",
                  mixBlendMode: "screen",
                }}
              />
            </div>
          </div>

          {/* Saison text */}
          {scene >= 5 && (
            <div style={{
              textAlign: "center",
              animation: "sa-fade-up 0.9s ease-out forwards",
            }}>
              <div style={{
                fontSize: "clamp(11px, 1.5vw, 13px)",
                fontWeight: 700,
                letterSpacing: "8px",
                color: "rgba(245,158,11,0.8)",
                textTransform: "uppercase",
                marginBottom: "8px",
                animation: "sa-gold-flicker 3s ease-in-out 1s infinite",
              }}>
                Nouvelle Saison
              </div>
              <div style={{
                fontSize: "clamp(48px, 8vw, 96px)",
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-2px",
                background: "linear-gradient(135deg, #ffffff 0%, #f59e0b 40%, #ec4899 80%, #9333ea 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.5))",
              }}>
                2026
              </div>
            </div>
          )}

          {/* CTA */}
          {scene >= 6 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
              animation: "sa-badge-in 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}>
              <button
                onClick={onEnter}
                style={{
                  background: "linear-gradient(90deg, #9333ea, #ec4899)",
                  border: "none",
                  borderRadius: "100px",
                  padding: "16px 48px",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  animation: "sa-glow-pulse 2s ease-in-out infinite",
                }}
              >
                Candidater maintenant
              </button>
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "6px 16px",
                borderRadius: "100px",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}>
                <span style={{
                  display: "inline-block", width: "6px", height: "6px", borderRadius: "50%",
                  background: "#f59e0b",
                  boxShadow: "0 0 8px #f59e0b",
                  animation: "sa-glow-pulse 1.2s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(245,158,11,0.9)", letterSpacing: "2px", textTransform: "uppercase" }}>
                  Inscription gratuite
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skip button */}
      <button
        onClick={onEnter}
        style={{
          position: "absolute",
          top: "20px", right: "20px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "100px",
          padding: "8px 20px",
          color: "rgba(255,255,255,0.5)",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "1px",
          cursor: "pointer",
          textTransform: "uppercase",
          backdropFilter: "blur(10px)",
          transition: "all 0.2s",
          zIndex: 10,
        }}
        onMouseEnter={e => {
          (e.target as HTMLButtonElement).style.color = "#fff";
          (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)";
        }}
        onMouseLeave={e => {
          (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
          (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
        }}
      >
        Passer
      </button>

      {/* Bottom branding */}
      <div style={{
        position: "absolute", bottom: "24px", left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
        animation: "sa-fade-up 1s ease-out 1s both",
      }}>
        <span style={{ fontSize: "10px", letterSpacing: "4px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
          Une production
        </span>
        <Image src="/synaura_symbol.svg" alt="Synaura" width={16} height={16}
          style={{ filter: "brightness(0) invert(1) opacity(0.3)" }} />
        <Image src="/synaura_logotype.svg" alt="Synaura" width={60} height={18}
          style={{ filter: "brightness(0) invert(1) opacity(0.3)" }} />
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────
function SuccessScreen({ email, token }: { email: string; token: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{KEYFRAMES}</style>

      {/* Video background */}
      <video
        ref={videoRef}
        src="/StarAcRes/sa-video-intro.mp4"
        muted
        loop
        playsInline
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          animation: "sa-video-fade 1.5s ease-out forwards",
        }}
      />

      {/* Dark overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center top, rgba(10,0,30,0.5) 0%, rgba(0,0,0,0.88) 70%)",
      }} />

      {/* Purple/gold haze */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 30% 70%, rgba(147,51,234,0.3) 0%, transparent 60%)",
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 10,
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px",
        animation: "sa-fade-up 1s ease-out 0.5s both",
      }}>
        <div style={{ width: "100%", maxWidth: "440px", textAlign: "center" }}>

          {/* SA Logo */}
          <div style={{ marginBottom: "24px", animation: "sa-logo-burst 1s ease-out forwards" }}>
            <Image
              src="/StarAcRes/sa-logo-transparent.png"
              alt="Star Academy TikTok"
              width={160}
              height={100}
              style={{ filter: "drop-shadow(0 0 20px rgba(147,51,234,0.6)) brightness(1.2)", mixBlendMode: "screen" }}
            />
          </div>

          {/* Success title */}
          <div style={{ marginBottom: "8px", animation: "sa-fade-up 0.8s ease-out 0.8s both" }}>
            <div style={{
              display: "inline-block",
              borderRadius: "100px",
              padding: "6px 20px",
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              marginBottom: "16px",
            }}>
              <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "3px", color: "#4ade80", textTransform: "uppercase" }}>
                Candidature envoyee
              </span>
            </div>
            <h1 style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 900,
              color: "#fff",
              margin: 0,
              lineHeight: 1.1,
            }}>
              Tu es dans la course.
            </h1>
          </div>

          <p style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
            margin: "12px 0 28px",
            animation: "sa-fade-up 0.8s ease-out 1s both",
          }}>
            Un email de confirmation a été envoyé à{" "}
            <strong style={{ color: "rgba(255,255,255,0.8)" }}>{email}</strong>.
            Notre équipe écoute chaque candidature avec attention.
          </p>

          {/* Token box */}
          <div style={{
            borderRadius: "16px",
            border: "1px solid rgba(245,158,11,0.25)",
            background: "rgba(245,158,11,0.06)",
            padding: "16px 20px",
            marginBottom: "20px",
            animation: "sa-fade-up 0.8s ease-out 1.2s both",
          }}>
            <p style={{
              fontSize: "10px", fontWeight: 800, letterSpacing: "4px",
              color: "rgba(245,158,11,0.7)", textTransform: "uppercase",
              margin: "0 0 8px",
            }}>
              Code de suivi
            </p>
            <code style={{
              fontSize: "12px", color: "rgba(255,255,255,0.7)",
              wordBreak: "break-all", display: "block",
              fontFamily: "monospace",
            }}>
              {token}
            </code>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", animation: "sa-fade-up 0.8s ease-out 1.4s both" }}>
            <Link
              href={`/star-academy-tiktok/suivi?token=${token}`}
              style={{
                display: "block",
                borderRadius: "16px",
                padding: "16px 24px",
                background: "linear-gradient(90deg, #9333ea, #ec4899)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "15px",
                textDecoration: "none",
                textAlign: "center",
                boxShadow: "0 0 30px rgba(147,51,234,0.4)",
                animation: "sa-glow-pulse 2s ease-in-out 2s infinite",
              }}
            >
              Suivre ma candidature
            </Link>
            <Link
              href="/star-academy-tiktok"
              style={{
                display: "block",
                borderRadius: "16px",
                padding: "14px 24px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                fontWeight: 600,
                fontSize: "13px",
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Retour a Star Academy
            </Link>
          </div>

          {/* Promo badge */}
          <div style={{
            marginTop: "24px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            animation: "sa-fade-up 0.8s ease-out 1.6s both",
          }}>
            <div style={{
              fontSize: "11px", color: "rgba(255,255,255,0.3)",
              letterSpacing: "2px", textTransform: "uppercase",
            }}>
              Les gagnants recevront 3 mois Premium Synaura
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────
export default function InscriptionPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState<Step>(1);
  const [fields, setFields] = useState<FormFields>(EMPTY);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl]   = useState<string | null>(null);
  const [drag, setDrag]           = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [token, setToken]         = useState("");
  const audioRef = useRef<HTMLInputElement>(null);

  const enterForm = useCallback(() => setPhase("form"), []);

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
      setToken(t); setPhase("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [fields, audioFile]);

  // ── Phase routing ─────────────────────────────────────
  if (phase === "intro") return <CinematicIntro onEnter={enterForm} />;
  if (phase === "done")  return <SuccessScreen email={fields.email} token={token} />;

  // ── Form phase ────────────────────────────────────────
  const inputCls = "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#9333ea]/70 focus:bg-white/8 transition";
  const labelCls = "block text-xs font-bold text-white/50 uppercase tracking-wider mb-2";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "#0a0014" }}>
      <style>{KEYFRAMES}</style>

      {/* ══════ PANNEAU GAUCHE ══════ */}
      <div className="relative lg:sticky lg:top-0 lg:h-screen lg:w-[44%] xl:w-[42%] shrink-0 overflow-hidden">
        <Image
          src="/StarAcRes/sa-hero-mansion.jpg"
          alt="Star Academy TikTok"
          fill className="object-cover object-center" priority sizes="44vw"
        />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(10,0,20,0.25) 0%, rgba(10,0,20,0.1) 40%, rgba(10,0,20,0.7) 80%, rgba(10,0,20,0.97) 100%)" }} />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-40"
            style={{ background: "radial-gradient(circle, rgba(147,51,234,0.5) 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div className="absolute bottom-[20%] right-[-5%] w-[50%] h-[40%] rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.5) 0%, transparent 70%)", filter: "blur(50px)" }} />
        </div>

        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8 z-10">
          {/* Top */}
          <div className="flex items-start justify-between">
            <Link href="/star-academy-tiktok" className="opacity-90 hover:opacity-100 transition">
              <Image src="/StarAcRes/sa-logo.png" alt="Star Academy TikTok"
                width={160} height={60} className="object-contain drop-shadow-lg"
                style={{ filter: "drop-shadow(0 0 12px rgba(147,51,234,0.6)) brightness(1.2)" }} />
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-[#ec4899]/40 bg-[#ec4899]/15 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec4899] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ec4899]" />
              </span>
              <span className="text-[10px] font-black text-[#ec4899] uppercase tracking-widest">Live</span>
            </div>
          </div>

          {/* Centre */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-[#f59e0b] uppercase tracking-widest mb-3">Nouvelle Saison 2026</p>
              <h1 className="text-4xl md:text-5xl font-black leading-none text-white" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
                Inscription<br />
                <span style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Auditions
                </span>
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Chant / Rap", "Mix / DJ", "Danse", "Autre"].map(c => (
                <span key={c} className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs text-white/70">{c}</span>
              ))}
            </div>
            <div className="rounded-2xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#ec4899)" }}>
                  <span className="text-xs font-black text-white">3M</span>
                </div>
                <div>
                  <p className="text-sm font-black text-[#f59e0b]">3 mois Premium Synaura</p>
                  <p className="text-xs text-white/50">offerts aux candidats retenus</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom : step progress */}
          <div className="hidden lg:block">
            <p className="text-xs text-white/30 mb-3">Etape {step} sur 5</p>
            <div className="flex gap-1.5">
              {STEPS.map(s => (
                <div key={s.n} className="flex-1 h-1 rounded-full transition-all duration-500"
                  style={{ background: s.n <= step ? "linear-gradient(90deg,#9333ea,#ec4899)" : "rgba(255,255,255,0.12)" }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ PANNEAU DROIT — Formulaire ══════ */}
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
            <p className="text-xs text-white/40">Etape {step} sur 5</p>
          </div>

          {/* Step pills */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
            {STEPS.map(s => (
              <div key={s.n}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-default"
                style={{
                  background: s.n === step
                    ? "linear-gradient(90deg,rgba(147,51,234,0.3),rgba(236,72,153,0.3))"
                    : s.n < step ? "rgba(147,51,234,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${s.n === step ? "rgba(147,51,234,0.6)" : s.n < step ? "rgba(147,51,234,0.25)" : "rgba(255,255,255,0.08)"}`,
                  color: s.n <= step ? "#fff" : "rgba(255,255,255,0.3)"
                }}>
                {s.n < step ? "OK" : s.n} — {s.label}
              </div>
            ))}
          </div>

          {/* ── STEP 1 : Identité ─────────────────────── */}
          {step === 1 && (
            <FormCard title="Qui es-tu ?" subtitle="Les informations de base sur ta candidature.">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Nom / Prenom <Req /></label>
                  <input className={inputCls} placeholder="Marie Dupont" value={fields.fullName} onChange={e => set("fullName", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Age <Req /></label>
                  <input className={inputCls} type="number" min={13} max={99} placeholder="18" value={fields.age} onChange={e => set("age", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Telephone</label>
                  <input className={inputCls} placeholder="+33 6..." value={fields.phone} onChange={e => set("phone", e.target.value)} />
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
            <FormCard title="Ton profil artistique" subtitle="Dis-nous ce que tu fais et ou te trouver.">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Pseudo TikTok <Req /></label>
                  <input className={inputCls} placeholder="@tonpseudo" value={fields.tiktok} onChange={e => set("tiktok", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Categorie <Req /></label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[["Chant", "Voix"], ["Rap", "Rap"], ["Mix / DJ", "DJ"], ["Performance / Danse", "Scene"], ["Autre", "Autre"]].map(([v, short]) => (
                      <button key={v} type="button" onClick={() => set("category", v)}
                        className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-left transition-all duration-200"
                        style={{
                          background: fields.category === v ? "linear-gradient(90deg,rgba(147,51,234,0.3),rgba(236,72,153,0.2))" : "rgba(255,255,255,0.04)",
                          borderColor: fields.category === v ? "rgba(147,51,234,0.6)" : "rgba(255,255,255,0.08)",
                          color: fields.category === v ? "#fff" : "rgba(255,255,255,0.5)"
                        }}>
                        <span className="text-xs font-black opacity-60">{short}</span> {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Niveau</label>
                  <div className="flex gap-2 flex-wrap">
                    {["Debutant", "Intermediaire", "Confirme", "Pro"].map(l => (
                      <button key={l} type="button" onClick={() => set("level", fields.level === l ? "" : l)}
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
            <FormCard title="Presente-toi" subtitle="Parle-nous de toi, ton univers, ce que tu veux montrer.">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Ta presentation <Req /></label>
                  <textarea className={`${inputCls} resize-none`} rows={6}
                    placeholder="Mon univers, mon style, ce que j'ai envie de montrer en live, pourquoi Star Academy TikTok..."
                    value={fields.bio} onChange={e => set("bio", e.target.value)} />
                  <p className="text-right text-xs text-white/25 mt-1">{fields.bio.length} / 500</p>
                </div>
                <div>
                  <label className={labelCls}>Disponibilites (optionnel)</label>
                  <input className={inputCls} placeholder="Soirs, week-ends, vacances d'ete..."
                    value={fields.availability} onChange={e => set("availability", e.target.value)} />
                </div>
              </div>
            </FormCard>
          )}

          {/* ── STEP 4 : CV Vocal ─────────────────────── */}
          {step === 4 && (
            <FormCard title="CV Vocal" subtitle="20 a 60 secondes suffisent. Montre-toi au meilleur de ta forme.">
              <div className="space-y-4">
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
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(147,51,234,0.8)" strokeWidth="2">
                              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                            </svg>
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
                  Conseil : Commence par ton passage le plus fort. Les 10 premieres secondes sont decisives. Pas besoin d&apos;un studio — un bon smartphone suffit.
                </div>
              </div>
            </FormCard>
          )}

          {/* ── STEP 5 : Compte Synaura ────────────────── */}
          {step === 5 && (
            <FormCard title="Compte Synaura" subtitle="Tu rejoins Synaura en meme temps que tu candidatures.">
              <div className="space-y-5">
                <div className="rounded-2xl overflow-hidden border border-violet-500/25"
                  style={{ background: "linear-gradient(135deg,rgba(147,51,234,0.12),rgba(236,72,153,0.08))" }}>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#9333ea,#ec4899)" }}>
                        <span className="text-xs font-black text-white">3M</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">3 mois Premium offerts</p>
                        <p className="text-xs text-white/50">Active automatiquement si tu es retenu(e)</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={labelCls}>Pseudonyme Synaura <span className="text-white/30 normal-case font-normal">(optionnel si deja un compte)</span></label>
                    <input className={inputCls} placeholder="@tonpseudo" value={fields.synauraUsername}
                      onChange={e => set("synauraUsername", e.target.value.replace(/\s/g, ""))} autoComplete="username" />
                  </div>
                  <div>
                    <label className={labelCls}>Mot de passe <span className="text-white/30 normal-case font-normal">(min. 8 caracteres)</span></label>
                    <input className={inputCls} type="password" placeholder="••••••••"
                      value={fields.synauraPassword} onChange={e => set("synauraPassword", e.target.value)} autoComplete="new-password" />
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input type="checkbox" className="sr-only" checked={fields.consent} onChange={e => set("consent", e.target.checked)} />
                    <div className="h-5 w-5 rounded-lg border-2 transition-all"
                      style={{
                        borderColor: fields.consent ? "#9333ea" : "rgba(255,255,255,0.2)",
                        background: fields.consent ? "linear-gradient(135deg,#9333ea,#ec4899)" : "transparent"
                      }}>
                      {fields.consent && <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">OK</span>}
                    </div>
                  </div>
                  <span className="text-xs text-white/40 leading-relaxed group-hover:text-white/60 transition">
                    Je confirme avoir les droits sur mon enregistrement audio, j&apos;accepte d&apos;etre recontacte(e) par Synaura dans le cadre de ce concours et j&apos;accepte les{" "}
                    <Link href="/legal/cgu" target="_blank" className="text-violet-400 hover:underline">Conditions Generales d&apos;Utilisation</Link>.
                  </span>
                </label>

                {error && <div className="rounded-2xl border border-[#ec4899]/30 bg-[#ec4899]/10 px-4 py-3 text-sm text-[#ec4899]">— {error}</div>}
                {loading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/40">
                      <span>Envoi en cours...</span><span>{progress}%</span>
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
                  {loading ? "Envoi en cours..." : "Envoyer ma candidature"}
                </button>
              </div>
            </FormCard>
          )}

          {error && step !== 5 && (
            <div className="mt-4 rounded-2xl border border-[#ec4899]/30 bg-[#ec4899]/10 px-4 py-3 text-sm text-[#ec4899]">
              — {error}
            </div>
          )}

          {step < 5 && (
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button type="button" onClick={prev}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition">
                  Retour
                </button>
              )}
              <button type="button" onClick={next}
                className="flex-1 rounded-2xl py-3.5 font-black text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(90deg,#9333ea,#ec4899)", boxShadow: "0 0 20px rgba(147,51,234,0.25)" }}>
                Continuer
              </button>
            </div>
          )}

          {step === 5 && (
            <button type="button" onClick={prev}
              className="mt-4 w-full rounded-2xl border border-white/8 py-3 text-sm text-white/40 hover:text-white/70 transition">
              Modifier ma presentation
            </button>
          )}

          <p className="text-center text-xs text-white/20 mt-6">Gratuit — Aucun engagement — Resultats par email</p>
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

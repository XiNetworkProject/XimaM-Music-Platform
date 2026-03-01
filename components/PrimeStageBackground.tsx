"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./PrimeStageBackground.module.css";

const PARTICLE_COLORS = [
  "rgba(255,212,122,0.9)",
  "rgba(0,242,234,0.85)",
  "rgba(124,58,237,0.85)",
  "rgba(255,45,85,0.85)",
  "rgba(255,255,255,0.9)",
];

const PARTICLE_COUNT = 160;

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export interface PrimeStageBackgroundProps {
  /** Scale opacities of animated layers (default 1) */
  intensity?: number;
}

/**
 * Fullscreen fixed background for "Prime Stage" (Star Academy TikTok).
 * Layers order: stage (z:-50) -> nebula -> stageWash -> ledWall -> lasers -> particles -> grain (z:-44).
 * pointer-events: none so scroll and clicks pass through.
 */
export function PrimeStageBackground({ intensity = 1 }: PrimeStageBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = "prime-stage-background-portal";
    document.body.appendChild(el);
    setPortalTarget(el);
    return () => {
      document.body.removeChild(el);
      setPortalTarget(null);
    };
  }, []);

  useEffect(() => {
    if (!portalTarget) return;

    const init = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: rand(0, W()),
      y: rand(0, H()),
      r: rand(0.6, 2.2),
      vx: rand(-0.12, 0.22),
      vy: rand(-0.06, 0.18),
      a: rand(0.25, 0.95),
      tw: rand(0.006, 0.02),
      c: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }));

    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, W(), H());
      ctx.globalCompositeOperation = "lighter";

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = W() + 20;
        if (p.x > W() + 20) p.x = -20;
        if (p.y < -20) p.y = H() + 20;
        if (p.y > H() + 20) p.y = -20;

        p.a += Math.sin(t * (1 / p.tw)) * 0.002;
        const alpha = Math.max(
          0.08,
          Math.min(0.95, p.a + Math.sin((p.x + p.y) * 0.01 + t * 2) * 0.12)
        );
        ctx.beginPath();
        ctx.fillStyle = p.c.replace(/0\.\d+\)$/, `${alpha.toFixed(3)})`);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        if (p.r > 1.7) {
          ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.35).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - p.r * 2.2, p.y);
          ctx.lineTo(p.x + p.r * 2.2, p.y);
          ctx.moveTo(p.x, p.y - p.r * 2.2);
          ctx.lineTo(p.x, p.y + p.r * 2.2);
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "screen";
      const gx = W() * 0.28 + Math.sin(t * 0.6) * 40;
      const gy = H() * 0.25;
      const g = ctx.createRadialGradient(gx, gy, 20, gx, gy, 320);
      g.addColorStop(0, "rgba(255,212,122,0.08)");
      g.addColorStop(0.5, "rgba(124,58,237,0.05)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W(), H());

      rafId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafId) cancelAnimationFrame(rafId);
    };
    };

    let cleanup: (() => void) | undefined;
    if (canvasRef.current) {
      cleanup = init();
    } else {
      const frameId = requestAnimationFrame(() => {
        cleanup = init();
      });
      return () => {
        cancelAnimationFrame(frameId);
        cleanup?.();
      };
    }
    return cleanup;
  }, [portalTarget]);

  const opacity = (base: number) => Math.min(1, base * intensity);

  const layers = (
    <>
      {/* a) Stage gradient base - z:-50 */}
      <div className={styles.stage} />

      {/* b) Nebula conic wash - z:-49 */}
      <div
        className={styles.nebula}
        style={{ opacity: opacity(0.85) }}
      />

      {/* c) StageWash - removes half-dark cut - z:-48 */}
      <div
        className={styles.stageWash}
        style={{ opacity: opacity(0.95) }}
      />

      {/* d) LedWall overlay - z:-47 */}
      <div
        className={styles.ledWall}
        style={{ opacity: opacity(0.2) }}
      />

      {/* e) Lasers - z:-46 */}
      <div
        className={styles.lasers}
        style={{ opacity: opacity(0.65) }}
      >
        <div className={`${styles.laser} ${styles.laser1}`} />
        <div className={`${styles.laser} ${styles.laser2}`} />
        <div className={`${styles.laser} ${styles.laser3}`} />
        <div className={`${styles.laser} ${styles.laser4}`} />
        <div className={`${styles.laser} ${styles.laser5}`} />
      </div>

      {/* f) Canvas glitter particles - z:-45 */}
      <canvas
        ref={canvasRef}
        className={styles.particles}
        style={{ opacity: intensity }}
      />

      {/* g) Grain - z:-44 */}
      <div
        className={styles.grain}
        style={{ opacity: opacity(0.07) }}
      />
    </>
  );

  if (!portalTarget || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      {layers}
    </div>,
    portalTarget
  );
}

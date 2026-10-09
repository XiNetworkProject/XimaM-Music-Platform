'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Three from 'three';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { auroraFragmentShader, auroraVertexShader } from './auroraBackdropShader';
import './aurora-backdrop.css';

const IMAGE = '/brand/celestial/sanctuary-v1.webp';
type Runtime = { invalidate: () => void; pulse: () => void; tap: (x: number, y: number) => void };

/** Decorative only: no sound, video, queries or input interception. */
export default function AuroraBackdrop({ paused = false, pulse = 0, interactive = false, positionX = .68, positionY = .45 }: {
  paused?: boolean; pulse?: number; interactive?: boolean; positionX?: number; positionY?: number;
}) {
  const { enabled } = useLivingMotion();
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const current = useRef({ moving: false, interactive, positionX, positionY });
  const previousPulse = useRef(pulse);
  const [state, setState] = useState<'loading' | 'webgl' | 'fallback'>('loading');
  current.current = { moving: enabled && !paused, interactive, positionX, positionY };

  useEffect(() => { runtime.current?.invalidate(); }, [enabled, paused, positionX, positionY]);
  useEffect(() => {
    if (pulse > previousPulse.current) runtime.current?.pulse();
    previousPulse.current = pulse;
  }, [pulse]);

  useEffect(() => {
    const node = root.current, target = canvas.current;
    if (!node || !target) return;
    const surface = node.closest('[data-chamber-product],.celestial-world,.celestial-auth,.celestial-onboarding') || node;
    let disposed = false, failed = false, visible = true;
    let frame = 0, previousTime = 0, elapsed = 0, rippleIndex = 0;
    let pointerX = 0, pointerY = 0;
    let pointerDown: { x: number; y: number; id: number } | null = null;
    let renderer: Three.WebGLRenderer | undefined;
    let material: Three.ShaderMaterial | undefined;
    let geometry: Three.PlaneGeometry | undefined;
    let texture: Three.Texture | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const stop = () => { cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
    const fallback = () => { failed = true; stop(); if (!disposed) setState('fallback'); };
    const onPointer = (event: Event) => {
      const e = event as PointerEvent;
      if (e.pointerType !== 'mouse' || !current.current.moving) return;
      const box = node.getBoundingClientRect();
      pointerX = Math.max(-1, Math.min(1, (e.clientX - box.left) / Math.max(1, box.width) * 2 - 1));
      pointerY = Math.max(-1, Math.min(1, (e.clientY - box.top) / Math.max(1, box.height) * 2 - 1));
    };
    const leave = () => { pointerX = 0; pointerY = 0; pointerDown = null; };
    const isControl = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('button,a,input,textarea,select,label,[role="button"],[contenteditable="true"],[data-fennec-root]'));
    const down = (event: Event) => {
      const e = event as PointerEvent;
      if (current.current.interactive && current.current.moving && e.isPrimary && e.button === 0 && !isControl(e.target)) pointerDown = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const up = (event: Event) => {
      const e = event as PointerEvent, start = pointerDown;
      pointerDown = null;
      if (!start || start.id !== e.pointerId || isControl(e.target) || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
      const box = node.getBoundingClientRect();
      runtime.current?.tap((e.clientX - box.left) / Math.max(1, box.width), 1 - (e.clientY - box.top) / Math.max(1, box.height));
    };
    const cancel = () => { pointerDown = null; };
    const visibility = () => { if (document.hidden) stop(); else runtime.current?.invalidate(); };
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (!visible) stop(); else runtime.current?.invalidate();
    });
    intersection.observe(node);
    surface.addEventListener('pointermove', onPointer, { passive: true });
    surface.addEventListener('pointerleave', leave, { passive: true });
    surface.addEventListener('pointerdown', down, { passive: true });
    surface.addEventListener('pointerup', up, { passive: true });
    surface.addEventListener('pointercancel', cancel, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    target.addEventListener('webglcontextlost', fallback);

    async function initialize() {
      try {
        const THREE = await import('three');
        if (disposed) return;
        renderer = new THREE.WebGLRenderer({ canvas: target!, alpha: false, antialias: false, powerPreference: 'low-power' });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        const loaded = await new THREE.TextureLoader().loadAsync(IMAGE);
        if (disposed || failed) { loaded.dispose(); return; }
        texture = loaded;
        texture.colorSpace = THREE.SRGBColorSpace;
        const uniforms = {
          uImage: { value: texture }, uAspect: { value: 1 }, uTime: { value: 0 },
          uInteractive: { value: interactive ? 1 : 0 }, uMoving: { value: 0 },
          uRipples: { value: Array.from({ length: 4 }, () => new THREE.Vector4(.765, .78, -100, 0)) },
          uPointer: { value: new THREE.Vector2() }, uPosition: { value: new THREE.Vector2(positionX, positionY) },
          uBeacon: { value: new THREE.Vector2(.765, .78) },
        };
        material = new THREE.ShaderMaterial({ uniforms, vertexShader: auroraVertexShader, fragmentShader: auroraFragmentShader, depthWrite: false });
        geometry = new THREE.PlaneGeometry(2, 2);
        const scene = new THREE.Scene();
        scene.add(new THREE.Mesh(geometry, material));
        const pointerTarget = new THREE.Vector2();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const request = (): void => { if (!frame && !disposed && !failed && visible && !document.hidden) frame = requestAnimationFrame(render); };
        const render = (timestamp: number): void => {
          frame = 0;
          if (disposed || failed || !visible || document.hidden) return;
          const moving = current.current.moving;
          // Slow celestial movement stays bounded to 24 rendered frames per second.
          if (moving && previousTime && timestamp - previousTime < 1000 / 24) { request(); return; }
          const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, .1) : 0;
          previousTime = moving ? timestamp : 0;
          if (moving) elapsed += delta;
          uniforms.uTime.value = elapsed;
          uniforms.uMoving.value = moving ? 1 : 0;
          uniforms.uInteractive.value = current.current.interactive ? 1 : 0;
          uniforms.uPosition.value.set(current.current.positionX, current.current.positionY);
          const aspect = uniforms.uAspect.value, imageAspect = 1672 / 941;
          const cropX = aspect > imageAspect ? 1 : aspect / imageAspect;
          const cropY = aspect > imageAspect ? imageAspect / aspect : 1;
          uniforms.uBeacon.value.set(.74 * cropX + (1 - cropX) * current.current.positionX, .78 * cropY + (1 - cropY) * (1 - current.current.positionY));
          if (moving) uniforms.uPointer.value.lerp(pointerTarget.set(pointerX, pointerY), 1 - Math.exp(-delta * 3));
          else uniforms.uPointer.value.set(0, 0);
          try { renderer!.render(scene, camera); } catch { fallback(); return; }
          if (moving) request();
        };
        const resize = () => {
          if (disposed || failed) return;
          const box = node!.getBoundingClientRect();
          const width = Math.max(1, box.width), height = Math.max(1, box.height);
          renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, width <= 760 ? 1 : 1.25));
          renderer!.setSize(width, height, false);
          uniforms.uAspect.value = width / height;
          request();
        };
        const emitRipple = (x: number, y: number) => {
          if (!current.current.moving || !current.current.interactive || document.hidden || !visible) return;
          uniforms.uRipples.value[rippleIndex].set(x, y, elapsed, 1);
          rippleIndex = (rippleIndex + 1) % 4;
          request();
        };
        runtime.current = {
          invalidate: request,
          pulse: () => emitRipple(uniforms.uBeacon.value.x, uniforms.uBeacon.value.y),
          tap: (x, y) => {
            const aspect = uniforms.uAspect.value, imageAspect = 1672 / 941;
            const cropX = aspect > imageAspect ? 1 : aspect / imageAspect;
            const cropY = aspect > imageAspect ? imageAspect / aspect : 1;
            const imageX = x * cropX + (1 - cropX) * current.current.positionX;
            const imageY = y * cropY + (1 - cropY) * (1 - current.current.positionY);
            // A tap away from the sky wakes its little light; UI controls and swipes are ignored.
            if (imageX < .44 || imageX > .96 || imageY < .66) emitRipple(uniforms.uBeacon.value.x, uniforms.uBeacon.value.y);
            else emitRipple(imageX, imageY);
          },
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(node!);
        resize();
        setState('webgl');
      } catch { fallback(); }
    }
    void initialize();
    return () => {
      disposed = true; stop(); runtime.current = null;
      intersection.disconnect(); resizeObserver?.disconnect();
      surface.removeEventListener('pointermove', onPointer); surface.removeEventListener('pointerleave', leave);
      surface.removeEventListener('pointerdown', down); surface.removeEventListener('pointerup', up); surface.removeEventListener('pointercancel', cancel);
      document.removeEventListener('visibilitychange', visibility); target.removeEventListener('webglcontextlost', fallback);
      geometry?.dispose(); material?.dispose(); texture?.dispose(); renderer?.dispose(); renderer?.forceContextLoss();
    };
  }, []);

  return <div ref={root} className="aurora-backdrop" data-aurora-renderer={state} data-aurora-moving={enabled && !paused} aria-hidden="true">
    <img src={IMAGE} alt="" width="1672" height="941" decoding="async" fetchPriority="high" draggable={false} style={{ objectPosition: `${positionX * 100}% ${positionY * 100}%` }}/>
    <canvas ref={canvas} hidden={state !== 'webgl'} />
  </div>;
}

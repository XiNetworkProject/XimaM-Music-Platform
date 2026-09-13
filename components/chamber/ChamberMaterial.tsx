'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Three from 'three';

export type ChamberMaterialProps = {
  progress: number;
  paused: boolean;
  playing: boolean;
  pulse: number;
  className?: string;
};

type MaterialRuntime = { invalidate: () => void; sendPulse: (count: number) => void; tap: (x: number, y: number) => void };

const TEXTURE_URL = '/brand/chambre/membrane-cobalt.png';
const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
type Composition = { x: number; y: number; scale: number; rotation: number; opacity: number };

// Six viewpoints of the same approved object, not six different visual themes.
// x/y use viewport fractions from its center. Entry is the approved composition.
const DESKTOP_COMPOSITIONS: readonly Composition[] = [
  { x: .265, y: .016, scale: 1, rotation: 0, opacity: 1 },
  { x: .035, y: -.10, scale: 1.29, rotation: -.055, opacity: .95 },
  { x: -.31, y: -.035, scale: 1.10, rotation: .125, opacity: 1 },
  { x: .10, y: -.115, scale: 1.88, rotation: -.31, opacity: 1 },
  { x: -.025, y: -.11, scale: 1.38, rotation: .06, opacity: .73 },
  { x: .32, y: -.11, scale: 1.15, rotation: -.16, opacity: .22 },
];
const MOBILE_COMPOSITIONS: readonly Composition[] = [
  { x: .15, y: -.093, scale: 1, rotation: 0, opacity: 1 },
  { x: .015, y: -.155, scale: 1.26, rotation: -.07, opacity: .95 },
  { x: -.24, y: -.14, scale: 1.14, rotation: .12, opacity: .92 },
  { x: .13, y: -.19, scale: 1.85, rotation: -.32, opacity: 1 },
  { x: 0, y: -.17, scale: 1.35, rotation: .07, opacity: .72 },
  { x: .28, y: -.26, scale: 1.02, rotation: -.14, opacity: .18 },
];

function sampleComposition(progress: number, mobile: boolean): Composition {
  const frames = mobile ? MOBILE_COMPOSITIONS : DESKTOP_COMPOSITIONS;
  const position = clamp(progress) * (frames.length - 1);
  const index = Math.min(frames.length - 2, Math.floor(position));
  const fraction = position - index;
  const blend = fraction * fraction * (3 - 2 * fraction);
  const from = frames[index];
  const to = frames[index + 1];
  return {
    x: from.x + (to.x - from.x) * blend,
    y: from.y + (to.y - from.y) * blend,
    scale: from.scale + (to.scale - from.scale) * blend,
    rotation: from.rotation + (to.rotation - from.rotation) * blend,
    opacity: from.opacity + (to.opacity - from.opacity) * blend,
  };
}

// The approved sculpture remains the same 2.5D textured membrane. Playback state
// adds breathing only: this component never analyses or reroutes musical audio.
const vertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uMotion;
  uniform float uAudio;
  void main() {
    vUv = uv;
    vec3 p = position;
    float envelope = sin(uv.x * 3.14159) * sin(uv.y * 3.14159);
    p.x += sin(uv.y * 8.0 + uTime * .62) * .011 * envelope * uMotion;
    p.y += sin(uv.x * 7.0 - uTime * .53) * (.012 + uAudio * .019) * envelope * uMotion;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uAudio;
  uniform float uMotion;
  uniform float uProgress;
  uniform vec2 uPointer;
  uniform vec4 uPulses[4];
  void main() {
    vec2 uv = vUv;
    vec2 warp = vec2(sin(uv.y * 12.0 + uTime * .73), cos(uv.x * 10.0 - uTime * .58));
    uv += warp * (.003 + uAudio * .008) * sin(uv.x * 3.14159) * uMotion;
    float rippleLight = 0.0;
    for (int i = 0; i < 4; i++) {
      vec4 pulse = uPulses[i];
      float age = uTime - pulse.z;
      float radius = length((uv - pulse.xy) * vec2(1.5, 1.0));
      float envelope = exp(-pow((radius - age * .28) * 13.0, 2.0)) * exp(-age * .7) * step(0.0, age) * uMotion;
      uv += normalize(uv - pulse.xy + vec2(.0001)) * sin(radius * 46.0 - age * 8.0) * envelope * .018;
      rippleLight += envelope * .28;
    }
    vec4 texel = texture2D(uTexture, clamp(uv, .001, .999));
    float value = max(max(texel.r, texel.g), texel.b);
    // The approved asset has a black matte; only its near-black exterior is keyed.
    float alpha = smoothstep(.009, .05, value);
    float silver = min(texel.r, min(texel.g, texel.b));
    float sweep = .5 + .5 * sin(uv.x * 4.0 - uv.y * 3.0 + uTime * .48 + uPointer.x * 1.3);
    vec3 color = texel.rgb * (.73 + sweep * .3 + rippleLight + uAudio * .12);
    color += vec3(.09, .2, .44) * pow(sweep, 6.0) * silver * .38 * uMotion;
    color += vec3(.12, .28, .65) * rippleLight * value;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export default function ChamberMaterial({ progress, paused, playing, pulse, className = '' }: ChamberMaterialProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<MaterialRuntime | null>(null);
  const propsRef = useRef({ progress, paused, playing });
  const previousPulseRef = useRef(pulse);
  const [rendererState, setRendererState] = useState<'loading' | 'webgl' | 'fallback'>('loading');
  propsRef.current = { progress, paused, playing };

  useEffect(() => {
    runtimeRef.current?.invalidate();
  }, [progress, paused, playing]);

  useEffect(() => {
    const difference = pulse - previousPulseRef.current;
    previousPulseRef.current = pulse;
    if (difference > 0) runtimeRef.current?.sendPulse(Math.min(4, Math.floor(difference)));
  }, [pulse]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    // Listen within this candidate, including its foreground siblings. The
    // decorative material itself must not steal pointer input from real controls.
    const pointerSurface = root.closest<HTMLElement>('[data-chamber-product]') || root;
    let disposed = false;
    let failed = false;
    let frame = 0;
    let dirty = true;
    let elapsed = 0;
    let previousTime = 0;
    let renderedProgress = clamp(propsRef.current.progress);
    let pulseIndex = 0;
    let width = 1;
    let height = 1;
    let renderer: Three.WebGLRenderer | undefined;
    let geometry: Three.PlaneGeometry | undefined;
    let material: Three.ShaderMaterial | undefined;
    let texture: Three.Texture | undefined;
    let observer: ResizeObserver | undefined;
    let runtime: MaterialRuntime | undefined;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerDown: { x: number; y: number; id: number } | null = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionPaused = () => propsRef.current.paused || reducedMotion.matches;

    function stopFrame() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    }

    function fallback() {
      if (disposed) return;
      failed = true;
      stopFrame();
      setRendererState('fallback');
    }

    function onPointerMove(event: PointerEvent) {
      if (motionPaused() || event.pointerType === 'touch') return;
      const bounds = root!.getBoundingClientRect();
      pointerTargetX = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
      pointerTargetY = 1 - clamp((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2;
      runtime?.invalidate();
    }

    function onPointerLeave() {
      pointerDown = null;
      pointerTargetX = 0;
      pointerTargetY = 0;
      runtime?.invalidate();
    }

    function isControl(target: EventTarget | null) {
      return target instanceof Element && Boolean(target.closest('button, a, input, textarea, select, label, [contenteditable="true"], [role="button"]'));
    }

    function onPointerDown(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0 || motionPaused() || isControl(event.target)) return;
      pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }

    function onPointerCancel() { pointerDown = null; }

    function onPointerUp(event: PointerEvent) {
      if (!pointerDown || event.pointerId !== pointerDown.id) return;
      const down = pointerDown;
      pointerDown = null;
      if (motionPaused() || isControl(event.target) || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10) return;
      const bounds = root!.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const relativeX = x / Math.max(1, bounds.width);
      const relativeY = y / Math.max(1, bounds.height);
      const chapter = Math.round(clamp(propsRef.current.progress) * 5);
      const inside = chapter === 0
        ? bounds.width <= 760
          ? relativeX >= 0 && relativeX <= 1 && relativeY > .43 && relativeY < .78
          : relativeX > .45 && relativeX <= 1 && relativeY > .18 && relativeY < .8
        : chapter < 5 && relativeX >= 0 && relativeX <= 1 && relativeY > .16 && relativeY < .9;
      if (inside) runtime?.tap(x, y);
    }

    function onVisibilityChange() {
      if (document.hidden) { pointerDown = null; stopFrame(); }
      else runtime?.invalidate();
    }

    function onMotionChange() {
      previousTime = 0;
      runtime?.invalidate();
    }

    pointerSurface.addEventListener('pointermove', onPointerMove, { passive: true });
    pointerSurface.addEventListener('pointerleave', onPointerLeave, { passive: true });
    pointerSurface.addEventListener('pointerdown', onPointerDown, { passive: true });
    pointerSurface.addEventListener('pointerup', onPointerUp, { passive: true });
    pointerSurface.addEventListener('pointercancel', onPointerCancel, { passive: true });
    canvas.addEventListener('webglcontextlost', fallback);
    document.addEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.addEventListener('change', onMotionChange);
    setRendererState('loading');

    async function initialize() {
      try {
        const THREE = await import('three');
        if (disposed) return;
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
        camera.position.z = 2;
        const pointer = new THREE.Vector2(0, 0);
        const pointerTarget = new THREE.Vector2(0, 0);
        const pulses = Array.from({ length: 4 }, () => new THREE.Vector4(.5, .5, -100, 0));
        const uniforms = {
          uTexture: { value: null as Three.Texture | null },
          uTime: { value: 0 }, uAudio: { value: 0 },
          uPointer: { value: pointer }, uPulses: { value: pulses },
          uMotion: { value: motionPaused() ? 0 : 1 }, uProgress: { value: renderedProgress },
        };
        renderer = new THREE.WebGLRenderer({ canvas: canvas!, alpha: true, antialias: false, powerPreference: 'low-power' });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        const loadedTexture = await new THREE.TextureLoader().loadAsync(TEXTURE_URL);
        if (disposed || failed) { loadedTexture.dispose(); return; }
        texture = loadedTexture;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        uniforms.uTexture.value = texture;
        material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false });
        geometry = new THREE.PlaneGeometry(1, 1, 60, 40);
        const sculpture = new THREE.Mesh(geometry, material);
        scene.add(sculpture);

        const requestFrame = () => {
          if (!frame && !disposed && !failed && !document.hidden) frame = requestAnimationFrame(renderFrame);
        };

        const renderFrame = (timestamp: number) => {
          frame = 0;
          if (disposed || failed || document.hidden) return;
          const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, .05) : 0;
          previousTime = timestamp;
          const stopped = motionPaused();
          if (!stopped) elapsed += delta;
          const targetProgress = clamp(propsRef.current.progress);
          renderedProgress = stopped ? Math.round(targetProgress * 5) / 5 : renderedProgress + (targetProgress - renderedProgress) * (1 - Math.exp(-delta * 11));
          if (!stopped && Math.abs(targetProgress - renderedProgress) < .0001) renderedProgress = targetProgress;
          pointerTarget.set(stopped ? 0 : pointerTargetX, stopped ? 0 : pointerTargetY);
          if (stopped) pointer.set(0, 0);
          else pointer.lerp(pointerTarget, 1 - Math.exp(-delta * 5));
          // A state-driven visual accent, not a claimed measurement of the song.
          const playbackAccent = propsRef.current.playing && !stopped ? .28 : 0;
          uniforms.uAudio.value = stopped ? 0 : uniforms.uAudio.value + (playbackAccent - uniforms.uAudio.value) * (1 - Math.exp(-delta * 8));
          uniforms.uMotion.value = stopped ? 0 : 1;
          if (dirty || !stopped) {
            const mobile = width <= 760;
            const composition = sampleComposition(renderedProgress, mobile);
            const baseWidth = mobile ? width * 1.38 : Math.min(width * .85, height * 1.41);
            sculpture.scale.set(baseWidth * composition.scale, baseWidth / 1.5 * composition.scale, 1);
            sculpture.position.x = width * composition.x;
            sculpture.position.y = height * composition.y;
            sculpture.position.x += pointer.x * (mobile ? 0 : 14);
            sculpture.position.y += pointer.y * 9;
            sculpture.rotation.z = composition.rotation + (stopped ? 0 : Math.sin(elapsed * .23) * .012);
            canvas!.style.opacity = String(composition.opacity);
            uniforms.uProgress.value = renderedProgress;
            uniforms.uTime.value = elapsed;
            try { renderer!.render(scene, camera); } catch { fallback(); return; }
            dirty = false;
          }
          if (!stopped) requestFrame();
        };

        const resize = () => {
          if (disposed || failed) return;
          const bounds = root!.getBoundingClientRect();
          width = Math.max(1, bounds.width);
          height = Math.max(1, bounds.height);
          renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, width <= 760 ? 1.5 : 1.75));
          renderer!.setSize(width, height, false);
          camera.left = -width / 2; camera.right = width / 2;
          camera.top = height / 2; camera.bottom = -height / 2;
          camera.updateProjectionMatrix();
          dirty = true;
          requestFrame();
        };

        const queuePulse = (x: number, y: number) => {
          if (motionPaused() || disposed || failed || document.hidden) return;
          pulses[pulseIndex].set(clamp(x), clamp(y), elapsed, 1);
          pulseIndex = (pulseIndex + 1) % pulses.length;
          dirty = true;
          requestFrame();
        };

        runtime = {
          invalidate() { dirty = true; requestFrame(); },
          sendPulse(count) {
            for (let index = 0; index < count; index += 1) queuePulse(.65, .55);
          },
          tap(x, y) {
            const dx = x - width / 2 - sculpture.position.x;
            const dy = height / 2 - y - sculpture.position.y;
            const cosine = Math.cos(sculpture.rotation.z);
            const sine = Math.sin(sculpture.rotation.z);
            const nx = (dx * cosine + dy * sine) / sculpture.scale.x + .5;
            const ny = (-dx * sine + dy * cosine) / sculpture.scale.y + .5;
            if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) queuePulse(nx, ny);
          },
        };
        runtimeRef.current = runtime;
        observer = new ResizeObserver(resize);
        observer.observe(root!);
        resize();
        setRendererState('webgl');
      } catch {
        fallback();
      }
    }

    void initialize();
    return () => {
      disposed = true;
      stopFrame();
      observer?.disconnect();
      pointerSurface.removeEventListener('pointermove', onPointerMove);
      pointerSurface.removeEventListener('pointerleave', onPointerLeave);
      pointerSurface.removeEventListener('pointerdown', onPointerDown);
      pointerSurface.removeEventListener('pointerup', onPointerUp);
      pointerSurface.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('webglcontextlost', fallback);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reducedMotion.removeEventListener('change', onMotionChange);
      if (runtimeRef.current === runtime) runtimeRef.current = null;
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  }, []);

  return (
    <div ref={rootRef} className={`chamber-material ${className}`} data-renderer={rendererState} data-material-chapter={Math.round(clamp(progress) * 5)} aria-hidden="true">
      {/* A decorative fallback remains available before the local GPU asset loads. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="chamber-material__fallback" src={TEXTURE_URL} alt="" draggable={false} hidden={rendererState === 'webgl'} />
      <canvas ref={canvasRef} className="chamber-material__canvas" aria-hidden="true" hidden={rendererState !== 'webgl'} />
    </div>
  );
}

'use client';

import { Bloom, EffectComposer, GodRays, ToneMapping, Vignette } from '@react-three/postprocessing';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { BlendFunction, KernelSize, ToneMappingMode } from 'postprocessing';
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { SYNAURA_BRAND } from '@/lib/brand';
import {
  SONIC_SCENE,
  SONIC_TIMELINE,
  selectSonicQuality,
  type SonicQualityProfile,
} from './synauraSonicScene.config';
import {
  AURA_FRAGMENT_SHADER,
  BEAM_SHEET_FRAGMENT_SHADER,
  BEAM_SHEET_VERTEX_SHADER,
  LOGO_FRAGMENT_SHADER,
  LOGO_VERTEX_SHADER,
  PARTICLE_FRAGMENT_SHADER,
  PARTICLE_VERTEX_SHADER,
  SCREEN_PLANE_VERTEX_SHADER,
  SOURCE_GLOW_FRAGMENT_SHADER,
  VOLUMETRIC_FRAGMENT_SHADER,
  VOLUMETRIC_VERTEX_SHADER,
} from './synauraSonicShaders';
import styles from './SynauraSonicIntro.module.css';

export type SonicPerformanceMetrics = {
  fps: number;
  frameTimeMs: number;
  frames: number;
  quality: SonicQualityProfile['name'];
};

type SceneProps = {
  active: boolean;
  reducedMotion: boolean;
  quality: SonicQualityProfile;
  debugTime: number | null;
  onReady: () => void;
  onComplete: () => void;
  onMetrics: (metrics: SonicPerformanceMetrics) => void;
};

const UP = new THREE.Vector3(0, 1, 0);
const BEAM_LENGTH = SONIC_SCENE.beam.length;
const BEAM_SHEET_WIDTH = 3.35;
const BEAM_MOTION_START = 0.12;
const BEAM_MOTION_END = 2.715;
const BEAM_TRAIL_SAMPLE_SECONDS = 1 / 240;
const HIGHLIGHT_TRAIL_SAMPLE_SECONDS = 1 / 320;
const NORMAL_BEAM_PATH = new THREE.CubicBezierCurve3(
  new THREE.Vector3(4.9, 2.3, -0.42),
  new THREE.Vector3(-0.5, -0.5, -0.36),
  new THREE.Vector3(-4.5, -1.6, -1),
  new THREE.Vector3(-5.7, -2.1, -1.35),
);
const MOBILE_BEAM_PATH = new THREE.CubicBezierCurve3(
  new THREE.Vector3(1.8, 3.1, -0.42),
  new THREE.Vector3(0.4, -0.5, -0.36),
  new THREE.Vector3(-1.7, -2.2, -1),
  new THREE.Vector3(-2.1, -3.2, -1.35),
);
const REDUCED_BEAM_PATH = new THREE.CubicBezierCurve3(
  new THREE.Vector3(0.7, 0.18, -0.42),
  new THREE.Vector3(0.65, 0.18, -0.4),
  new THREE.Vector3(-0.25, -0.05, -1),
  new THREE.Vector3(-0.4, -0.12, -1.35),
);

function smootherStep(time: number, start: number, end: number) {
  const progress = THREE.MathUtils.clamp((time - start) / (end - start), 0, 1);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function beamPathProgress(time: number) {
  return THREE.MathUtils.clamp((time - BEAM_MOTION_START) / (BEAM_MOTION_END - BEAM_MOTION_START), 0, 1);
}

function cuePulse(time: number, center: number, attack: number, release: number) {
  if (time <= center) return smootherStep(time, center - attack, center);
  return 1 - smootherStep(time, center, center + release);
}

function lightPositionX(time: number, reducedMotion: boolean) {
  const start = reducedMotion ? 1 : 0.72;
  const end = reducedMotion ? 2.7 : 2.18;
  return THREE.MathUtils.lerp(
    reducedMotion ? 0.7 : 0.72,
    reducedMotion ? -0.12 : -0.2,
    smootherStep(time, start, end),
  );
}

function seededPositions(count: number) {
  let seed = 0x51a7a;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = -4.7 + random() * 10.1;
    positions[index * 3 + 1] = -2.8 + random() * 5.8;
    positions[index * 3 + 2] = -1.15 + random() * 4.3;
  }
  return positions;
}

function SynauraRealtimeScene({
  active,
  reducedMotion,
  quality,
  debugTime,
  onReady,
  onComplete,
  onMetrics,
}: SceneProps) {
  const logoTexture = useLoader(THREE.TextureLoader, SYNAURA_BRAND.symbol);
  const { camera, gl } = useThree();
  const targetRef = useRef<THREE.Object3D>(null);
  const sourceRef = useRef<THREE.Mesh>(null);
  const coneRef = useRef<THREE.Mesh>(null);
  const beamSheetRef = useRef<THREE.Mesh>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const logoMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const volumeMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const beamSheetMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const particleMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const sourceGlowMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const ghostMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const auraMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const backgroundPulseRef = useRef<THREE.Mesh>(null);
  const particleCloudRef = useRef<THREE.Points>(null);
  const logoGroupRef = useRef<THREE.Group>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const masterClockStartRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const metricRef = useRef({ frames: 0, seconds: 0, reported: false });
  const positions = useMemo(() => seededPositions(quality.particles), [quality.particles]);
  const sourcePosition = useMemo(() => new THREE.Vector3(...(
    quality.name === 'LOW' ? [2.5, 3.1, 3.05] as const : SONIC_SCENE.source.position
  )), [quality.name]);
  const sourceCuePosition = useMemo(() => new THREE.Vector3(
    quality.name === 'LOW' ? 1.75 : SONIC_SCENE.sourceCue.position[0],
    quality.name === 'LOW' ? 2.55 : SONIC_SCENE.sourceCue.position[1],
    SONIC_SCENE.sourceCue.position[2],
  ), [quality.name]);
  const logoSize = quality.name === 'LOW' ? SONIC_SCENE.logo.lowSize : SONIC_SCENE.logo.highSize;
  const volumeUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uViolet: { value: new THREE.Color(SONIC_SCENE.beam.violet) },
    uCyan: { value: new THREE.Color(SONIC_SCENE.beam.cyan) },
    uWhite: { value: new THREE.Color(SONIC_SCENE.beam.white) },
  }), []);
  const beamSheetUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uTrailOffset: { value: 0 },
    uViolet: { value: new THREE.Color(SONIC_SCENE.beam.violet) },
    uCyan: { value: new THREE.Color(SONIC_SCENE.beam.cyan) },
    uWhite: { value: new THREE.Color(SONIC_SCENE.beam.white) },
  }), []);
  const particleUniforms = useMemo(() => ({
    uBeamOrigin: { value: sourcePosition.clone() },
    uBeamDirection: { value: new THREE.Vector3(-1, 0, -0.5).normalize() },
    uOpacity: { value: 0 },
    uPixelRatio: { value: Math.min(gl.getPixelRatio(), quality.dpr[1]) },
  }), [gl, quality.dpr, sourcePosition]);
  const logoUniforms = useMemo(() => ({
    uMap: { value: logoTexture },
    uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
    uDepth: { value: SONIC_SCENE.logo.relief },
    uLightX: { value: 0.72 },
    uLightY: { value: 0.57 },
    uReveal: { value: 0 },
    uHighlight: { value: 0 },
    uHighlightTrail: { value: 0 },
    uWavePulse: { value: 0 },
    uArcPulse: { value: 0 },
    uTime: { value: 0 },
  }), [logoTexture]);
  const sourceGlowUniforms = useMemo(() => ({ uOpacity: { value: 0 }, uGhost: { value: 0 } }), []);
  const ghostUniforms = useMemo(() => ({ uOpacity: { value: 0 }, uGhost: { value: 1 } }), []);
  const auraUniforms = useMemo(() => ({ uOpacity: { value: 0 } }), []);
  const rightEdgeUniforms = useMemo(() => ({ uOpacity: { value: 0 }, uGhost: { value: 1 } }), []);
  const leftEdgeUniforms = useMemo(() => ({ uOpacity: { value: 0 }, uGhost: { value: 1 } }), []);
  const backgroundPulseUniforms = useMemo(() => ({ uOpacity: { value: 0 }, uGhost: { value: 1 } }), []);
  const workingDirection = useMemo(() => new THREE.Vector3(), []);
  const normalizedDirection = useMemo(() => new THREE.Vector3(), []);
  const coneDirection = useMemo(() => new THREE.Vector3(), []);
  const workingMidpoint = useMemo(() => new THREE.Vector3(), []);
  const workingQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const workingPlanarDirection = useMemo(() => new THREE.Vector2(), []);
  const previousTargetPosition = useMemo(() => new THREE.Vector3(), []);
  const previousPlanarDirection = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    logoTexture.colorSpace = THREE.SRGBColorSpace;
    logoTexture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    logoTexture.needsUpdate = true;
    onReady();
  }, [gl, logoTexture, onReady]);

  useEffect(() => {
    const spot = spotRef.current;
    const target = targetRef.current;
    if (!spot || !target) return;
    spot.target = target;
  }, []);

  useLayoutEffect(() => {
    if (!active) return;
    const target = targetRef.current;
    const spot = spotRef.current;
    const source = sourceRef.current;
    const logoMaterial = logoMaterialRef.current;
    const volumeMaterial = volumeMaterialRef.current;
    const beamSheetMaterial = beamSheetMaterialRef.current;
    const particleMaterial = particleMaterialRef.current;
    const sourceGlowMaterial = sourceGlowMaterialRef.current;
    const ghostMaterial = ghostMaterialRef.current;
    const auraMaterial = auraMaterialRef.current;
    const aura = auraRef.current;
    const logoGroup = logoGroupRef.current;
    if (!target || !spot || !source || !logoMaterial || !volumeMaterial || !beamSheetMaterial
      || !particleMaterial || !sourceGlowMaterial || !ghostMaterial || !auraMaterial || !aura || !logoGroup) return;

    const sourceMaterial = source.material as THREE.MeshBasicMaterial;
    const timeline = gsap.timeline({ paused: true });
    timelineRef.current = timeline;
    masterClockStartRef.current = null;
    completedRef.current = false;
    metricRef.current = { frames: 0, seconds: 0, reported: false };

    timeline
      .addLabel('start', SONIC_TIMELINE.labels.start)
      .set(spot, { intensity: 0, angle: 0.12, penumbra: 0.72 }, 'start')
      .set(sourceMaterial, { opacity: 0 }, 'start')
      .set(sourceGlowUniforms.uOpacity, { value: 0 }, 'start')
      .set(ghostUniforms.uOpacity, { value: 0 }, 'start')
      .set(volumeUniforms.uOpacity, { value: 0 }, 'start')
      .set(beamSheetUniforms.uOpacity, { value: 0 }, 'start')
      .set(particleUniforms.uOpacity, { value: 0 }, 'start')
      .set(logoUniforms.uLightX, { value: reducedMotion ? 0.7 : 0.72 }, 'start')
      .set(logoUniforms.uLightY, { value: 0.57 }, 'start')
      .set(logoUniforms.uReveal, { value: 0 }, 'start')
      .set(logoUniforms.uHighlight, { value: 0 }, 'start')
      .set(logoUniforms.uHighlightTrail, { value: 0 }, 'start')
      .set(logoUniforms.uWavePulse, { value: 0 }, 'start')
      .set(logoUniforms.uArcPulse, { value: 0 }, 'start')
      .set(auraUniforms.uOpacity, { value: 0 }, 'start')
      .set(rightEdgeUniforms.uOpacity, { value: 0 }, 'start')
      .set(leftEdgeUniforms.uOpacity, { value: 0 }, 'start')
      .set(backgroundPulseUniforms.uOpacity, { value: 0 }, 'start')
      .set(aura.scale, { x: 0.84, y: 0.84, z: 0.84 }, 'start')
      .set(logoGroup.position, { x: 0.04, y: -0.015 }, 'start')
      .addLabel('lightEnter', SONIC_TIMELINE.labels.lightEnter)
      .to(sourceMaterial, { opacity: reducedMotion ? 0.12 : 0.28, duration: 0.27, ease: 'power2.out' }, 'lightEnter')
      .to(sourceGlowUniforms.uOpacity, { value: reducedMotion ? 0.08 : 0.24, duration: 0.31, ease: 'power2.out' }, 'lightEnter')
      .to(ghostUniforms.uOpacity, { value: reducedMotion ? 0.012 : 0.034, duration: 0.36, ease: 'power2.out' }, 'lightEnter')
      .to(volumeUniforms.uOpacity, { value: reducedMotion ? 0.055 : 0.24, duration: 0.34, ease: 'power2.out' }, 'lightEnter')
      .to(beamSheetUniforms.uOpacity, { value: reducedMotion ? 0.11 : 0.48, duration: 0.34, ease: 'power2.out' }, 'lightEnter')
      .to(particleUniforms.uOpacity, { value: reducedMotion ? 0.14 : 0.3, duration: 0.35, ease: 'power1.out' }, 'lightEnter')
      .addLabel('pulseOne', SONIC_TIMELINE.labels.pulseOne)
      .addLabel('pulseTwo', SONIC_TIMELINE.labels.pulseTwo)
      .addLabel('logoContact', SONIC_TIMELINE.labels.logoContact)
      .to(logoUniforms.uHighlight, { value: reducedMotion ? 0.18 : 0.48, duration: 0.22, ease: 'power3.out' }, 'logoContact')
      .to(particleUniforms.uOpacity, { value: reducedMotion ? 0.14 : 0.62, duration: 0.18, ease: 'power2.out' }, 'logoContact')
      .to(volumeUniforms.uOpacity, { value: reducedMotion ? 0.055 : 0.29, duration: 0.16, ease: 'power2.out' }, 'logoContact')
      .to(beamSheetUniforms.uOpacity, { value: reducedMotion ? 0.11 : 0.56, duration: 0.16, ease: 'power2.out' }, 'logoContact')
      .addLabel('logoReveal', SONIC_TIMELINE.labels.logoReveal);

    if (reducedMotion) {
      timeline
        .to(logoUniforms.uReveal, { value: 1, duration: 1.45, ease: 'sine.inOut' }, 'logoReveal')
        .to(logoUniforms.uWavePulse, { value: 1, duration: 0.58, ease: 'sine.inOut' }, 1.5)
        .to(logoUniforms.uArcPulse, { value: 1, duration: 0.36, ease: 'sine.inOut' }, 2.08);
    } else {
      timeline
        .to(logoUniforms.uReveal, { value: 1, duration: 0.3, ease: 'power2.inOut' }, 'logoContact')
        .to(logoUniforms.uHighlight, { value: 0.78, duration: 0.14, ease: 'power3.out' }, 1.1)
        .to(logoUniforms.uHighlight, { value: 0.11, duration: 0.17, ease: 'power3.in' }, 1.54)
        .to(logoUniforms.uWavePulse, { value: 1, duration: 0.24, ease: 'power2.inOut' }, SONIC_TIMELINE.labels.impact - 0.075)
        .to(logoUniforms.uArcPulse, { value: 1, duration: 0.28, ease: 'power2.out' }, SONIC_TIMELINE.labels.impact + 0.075)
        .to(logoGroup.position, { x: -0.015, y: 0.012, duration: 1.8, ease: 'sine.inOut' }, 0.78);
    }

    timeline
      .addLabel('impact', SONIC_TIMELINE.labels.impact)
      .to(logoUniforms.uHighlight, { value: reducedMotion ? 0.2 : 0.42, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.out' }, 'impact')
      .to(auraUniforms.uOpacity, { value: reducedMotion ? 0.1 : 0.24, duration: reducedMotion ? 0.2 : 0.1, ease: 'power2.out' }, reducedMotion ? 2.45 : 'impact')
      .to(auraUniforms.uOpacity, { value: reducedMotion ? 0.1 : 0.11, duration: reducedMotion ? 0 : 0.22, ease: 'power2.inOut' }, reducedMotion ? 2.89 : SONIC_TIMELINE.labels.impact + 0.1)
      .to(aura.scale, { x: 1.03, y: 1.03, z: 1.03, duration: reducedMotion ? 0.44 : 0.15, ease: 'power2.out' }, reducedMotion ? 2.45 : 'impact')
      .to(aura.scale, { x: reducedMotion ? 1.03 : 0.98, y: reducedMotion ? 1.03 : 0.98, z: reducedMotion ? 1.03 : 0.98, duration: reducedMotion ? 0 : 0.28, ease: 'power2.inOut' }, reducedMotion ? 2.89 : SONIC_TIMELINE.labels.impact + 0.15)
      .addLabel('lightExit', SONIC_TIMELINE.labels.lightExit)
      .to(sourceMaterial, { opacity: 0, duration: 0.38, ease: 'power2.in' }, 'lightExit')
      .to(sourceGlowUniforms.uOpacity, { value: 0, duration: 0.36, ease: 'power2.in' }, 'lightExit')
      .to(ghostUniforms.uOpacity, { value: 0, duration: 0.3, ease: 'power2.in' }, 'lightExit')
      .to(volumeUniforms.uOpacity, { value: reducedMotion ? 0.02 : 0, duration: 0.36, ease: 'power2.in' }, 'lightExit')
      .to(beamSheetUniforms.uOpacity, { value: 0, duration: 0.34, ease: 'power2.in' }, 'lightExit')
      .to(particleUniforms.uOpacity, { value: 0, duration: 0.36, ease: 'power2.in' }, 'lightExit')
      .addLabel('resolve', SONIC_TIMELINE.labels.resolve)
      .set(logoUniforms.uReveal, { value: 1 }, 'resolve')
      .to(logoUniforms.uHighlight, { value: 0, duration: 0.25, ease: 'sine.out' }, 'resolve')
      .to(auraUniforms.uOpacity, { value: 0.055, duration: 0.42, ease: 'sine.out' }, 'resolve')
      .to({}, { duration: Math.max(0, SONIC_TIMELINE.duration - timeline.duration()) });

    timeline.pause(debugTime ?? 0, true);

    return () => {
      timeline.kill();
      timelineRef.current = null;
      masterClockStartRef.current = null;
      completedRef.current = false;
      camera.position.set(...SONIC_SCENE.camera.position);
    };
  }, [active, camera, debugTime, onComplete, reducedMotion]);

  useFrame(({ clock }, delta) => {
    const timeline = timelineRef.current;
    let sceneTime = debugTime ?? timeline?.time() ?? 0;
    if (active && timeline) {
      if (debugTime === null) {
        if (masterClockStartRef.current === null) masterClockStartRef.current = clock.elapsedTime;
        sceneTime = THREE.MathUtils.clamp(
          clock.elapsedTime - masterClockStartRef.current,
          0,
          SONIC_TIMELINE.duration,
        );
      }
      timeline.time(sceneTime, true);
    }

    const currentLightX = lightPositionX(sceneTime, reducedMotion);
    const previousLightX = lightPositionX(sceneTime - HIGHLIGHT_TRAIL_SAMPLE_SECONDS, reducedMotion);
    logoUniforms.uLightX.value = currentLightX;
    logoUniforms.uLightY.value = reducedMotion
      ? 0.57
      : THREE.MathUtils.lerp(0.57, 0.47, smootherStep(sceneTime, 0.88, 1.96));
    logoUniforms.uHighlightTrail.value = THREE.MathUtils.clamp(previousLightX - currentLightX, -0.014, 0.014);

    const ignitionPulse = reducedMotion ? 0 : cuePulse(sceneTime, SONIC_TIMELINE.labels.lightEnter, 0.012, 0.07);
    const pulseOne = reducedMotion ? 0 : cuePulse(sceneTime, SONIC_TIMELINE.labels.pulseOne, 0.025, 0.075);
    const pulseTwo = reducedMotion ? 0 : cuePulse(sceneTime, SONIC_TIMELINE.labels.pulseTwo, 0.028, 0.09);
    const contactPulse = reducedMotion ? 0 : cuePulse(sceneTime, SONIC_TIMELINE.labels.logoContact, 0.035, 0.14);
    const revealPulse = reducedMotion ? 0 : cuePulse(sceneTime, SONIC_TIMELINE.labels.logoReveal, 0.04, 0.16);
    const impactPulse = reducedMotion ? 0 : cuePulse(sceneTime, SONIC_TIMELINE.labels.impact, 0.045, 0.12);
    const beamProgress = beamPathProgress(sceneTime);

    const target = targetRef.current;
    const cone = coneRef.current;
    const beamSheet = beamSheetRef.current;
    const particleMaterial = particleMaterialRef.current;
    const spot = spotRef.current;
    if (target && cone && spot) {
      const beamPath = reducedMotion ? REDUCED_BEAM_PATH : quality.name === 'LOW' ? MOBILE_BEAM_PATH : NORMAL_BEAM_PATH;
      const progress = beamProgress;
      const previousProgress = beamPathProgress(sceneTime - BEAM_TRAIL_SAMPLE_SECONDS);
      beamPath.getPoint(progress, target.position);
      beamPath.getPoint(previousProgress, previousTargetPosition);

      const lightEnvelope = smootherStep(sceneTime, SONIC_TIMELINE.labels.lightEnter, SONIC_TIMELINE.labels.logoReveal)
        * (1 - smootherStep(sceneTime, SONIC_TIMELINE.labels.lightExit, 2.715));
      const rhythmicIntensity = ignitionPulse * 12 + pulseOne * 8 + pulseTwo * 13
        + contactPulse * 18 + revealPulse * 8 + impactPulse * 24;
      spot.intensity = (reducedMotion ? 34 : 96) * lightEnvelope + rhythmicIntensity;
      spot.angle = THREE.MathUtils.lerp(
        0.12,
        reducedMotion ? 0.18 : 0.22,
        smootherStep(sceneTime, SONIC_TIMELINE.labels.lightEnter, 1.04),
      ) + pulseOne * 0.006 - pulseTwo * 0.004 + contactPulse * 0.008 + impactPulse * 0.01;

      workingDirection.copy(target.position).sub(sourcePosition);
      const distance = workingDirection.length();
      normalizedDirection.copy(workingDirection).normalize();
      workingMidpoint.copy(sourcePosition).add(target.position).multiplyScalar(0.5);
      coneDirection.copy(normalizedDirection).negate();
      workingQuaternion.setFromUnitVectors(UP, coneDirection);
      cone.position.copy(workingMidpoint);
      cone.quaternion.copy(workingQuaternion);
      cone.scale.set(1, distance / BEAM_LENGTH, 1);
      if (beamSheet) {
        workingPlanarDirection.set(sourcePosition.x - target.position.x, sourcePosition.y - target.position.y);
        previousPlanarDirection.set(
          sourcePosition.x - previousTargetPosition.x,
          sourcePosition.y - previousTargetPosition.y,
        );
        const planarDistance = workingPlanarDirection.length();
        const currentAngle = Math.atan2(workingPlanarDirection.y, workingPlanarDirection.x);
        const previousAngle = Math.atan2(previousPlanarDirection.y, previousPlanarDirection.x);
        const angularDelta = Math.atan2(
          Math.sin(currentAngle - previousAngle),
          Math.cos(currentAngle - previousAngle),
        );
        beamSheet.position.set(
          (sourcePosition.x + target.position.x) * 0.5,
          (sourcePosition.y + target.position.y) * 0.5,
          0.56,
        );
        beamSheet.rotation.z = currentAngle;
        beamSheet.scale.set(planarDistance, 1, 1);
        beamSheetUniforms.uTrailOffset.value = THREE.MathUtils.clamp(
          angularDelta * planarDistance / BEAM_SHEET_WIDTH,
          -0.022,
          0.022,
        );
      }
      particleUniforms.uBeamDirection.value.copy(normalizedDirection);
    }

    if (!reducedMotion) {
      const sourceMaterial = sourceRef.current?.material as THREE.MeshBasicMaterial | undefined;
      if (sourceMaterial) sourceMaterial.opacity = THREE.MathUtils.clamp(
        sourceMaterial.opacity + ignitionPulse * 0.13 + pulseOne * 0.025 + pulseTwo * 0.035 + impactPulse * 0.04,
        0,
        0.42,
      );
      sourceGlowUniforms.uOpacity.value = THREE.MathUtils.clamp(
        sourceGlowUniforms.uOpacity.value + ignitionPulse * 0.14 + pulseOne * 0.035 + pulseTwo * 0.05 + impactPulse * 0.045,
        0,
        0.42,
      );
      ghostUniforms.uOpacity.value = THREE.MathUtils.clamp(
        ghostUniforms.uOpacity.value + pulseOne * 0.012 + pulseTwo * 0.018 + contactPulse * 0.012,
        0,
        0.08,
      );
      volumeUniforms.uOpacity.value = THREE.MathUtils.clamp(
        volumeUniforms.uOpacity.value + pulseOne * 0.015 + pulseTwo * 0.024 + contactPulse * 0.035 + impactPulse * 0.045,
        0,
        0.38,
      );
      beamSheetUniforms.uOpacity.value = THREE.MathUtils.clamp(
        beamSheetUniforms.uOpacity.value + pulseOne * 0.035 + pulseTwo * 0.05 + contactPulse * 0.07 + impactPulse * 0.08,
        0,
        0.72,
      );
      particleUniforms.uOpacity.value = THREE.MathUtils.clamp(
        particleUniforms.uOpacity.value + contactPulse * 0.1 + impactPulse * 0.12,
        0,
        0.78,
      );
    }

    const rightEdgePresence = (1 - smootherStep(sceneTime, 0.56, 1.12))
      * smootherStep(sceneTime, 0.16, 0.22);
    const leftEdgePresence = smootherStep(sceneTime, 1.22, 1.66)
      * (1 - smootherStep(sceneTime, SONIC_TIMELINE.labels.lightExit, 2.58));
    rightEdgeUniforms.uOpacity.value = reducedMotion ? 0 : rightEdgePresence * 0.085
      + ignitionPulse * 0.1 + pulseOne * 0.032 + pulseTwo * 0.045 + impactPulse * 0.045;
    leftEdgeUniforms.uOpacity.value = reducedMotion ? 0 : leftEdgePresence * 0.075
      + contactPulse * 0.018 + impactPulse * 0.11;
    backgroundPulseUniforms.uOpacity.value = reducedMotion ? 0 : impactPulse * 0.15;

    if (backgroundPulseRef.current) {
      const expansion = 1 + impactPulse * 0.07;
      backgroundPulseRef.current.scale.set(expansion, expansion, 1);
    }
    if (particleCloudRef.current) {
      particleCloudRef.current.position.set(
        reducedMotion ? 0 : THREE.MathUtils.lerp(0.1, -0.14, beamProgress),
        reducedMotion ? 0 : THREE.MathUtils.lerp(0.07, -0.06, beamProgress),
        0,
      );
    }
    if (logoGroupRef.current) {
      const logoHit = 1 + impactPulse * 0.015;
      logoGroupRef.current.scale.setScalar(logoHit);
    }

    if (sceneTime >= SONIC_TIMELINE.labels.resolve) {
      const reverbProgress = (sceneTime - SONIC_TIMELINE.labels.resolve)
        / (SONIC_TIMELINE.duration - SONIC_TIMELINE.labels.resolve);
      auraUniforms.uOpacity.value *= 0.96 + Math.sin(reverbProgress * Math.PI) * 0.04;
    }

    const baseCameraZ = THREE.MathUtils.lerp(
      SONIC_SCENE.camera.position[2],
      9,
      smootherStep(sceneTime, 0.55, 3.13),
    );
    camera.position.z = baseCameraZ - contactPulse * 0.045 - impactPulse * 0.135;
    const cameraTravel = smootherStep(sceneTime, 0.19, 2.12)
      * (1 - smootherStep(sceneTime, 2.36, 3.12));
    camera.position.x = SONIC_SCENE.camera.position[0] - cameraTravel * 0.055;
    camera.position.y = SONIC_SCENE.camera.position[1] - cameraTravel * 0.026;
    volumeUniforms.uTime.value = sceneTime;
    beamSheetUniforms.uTime.value = sceneTime;
    logoUniforms.uTime.value = sceneTime;

    if (active && !metricRef.current.reported) {
      metricRef.current.frames += 1;
      metricRef.current.seconds += Math.min(delta, 0.1);
      if (metricRef.current.seconds >= 2.65) {
        metricRef.current.reported = true;
        const fps = metricRef.current.frames / metricRef.current.seconds;
        onMetrics({
          fps: Number(fps.toFixed(1)),
          frameTimeMs: Number((1000 / fps).toFixed(2)),
          frames: metricRef.current.frames,
          quality: quality.name,
        });
      }
    }

    if (active && debugTime === null && sceneTime >= SONIC_TIMELINE.duration && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  });

  const glowX = sourceCuePosition.x;
  const ghostX = quality.name === 'LOW' ? 1.42 : 4.75;
  const edgeX = quality.name === 'LOW' ? 1.82 : 5.86;
  const edgeY = quality.name === 'LOW' ? 2.5 : 1.62;
  const backgroundSize: [number, number] = quality.name === 'LOW' ? [5.6, 10.2] : [13.4, 7.8];

  return (
    <>
      <color attach="background" args={['#000002']} />
      <fogExp2 attach="fog" args={['#05030b', SONIC_SCENE.fogDensity]} />

      <object3D ref={targetRef} />
      <spotLight
        ref={spotRef}
        position={sourcePosition}
        color="#fff3df"
        distance={13}
        decay={1.8}
        angle={0.12}
        penumbra={0.72}
        intensity={0}
      />
      <mesh ref={sourceRef} position={sourceCuePosition} renderOrder={2} frustumCulled={false}>
        <sphereGeometry args={[quality.name === 'LOW' ? 0.04 : 0.045, 20, 20]} />
        <meshBasicMaterial color="#fff1d5" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[glowX, sourceCuePosition.y, 0.28]} renderOrder={2} frustumCulled={false}>
        <planeGeometry args={[1.7, 2.15]} />
        <shaderMaterial
          ref={sourceGlowMaterialRef}
          vertexShader={SCREEN_PLANE_VERTEX_SHADER}
          fragmentShader={SOURCE_GLOW_FRAGMENT_SHADER}
          uniforms={sourceGlowUniforms}
          transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </mesh>
      <mesh position={[ghostX, quality.name === 'LOW' ? 0.82 : 0.76, -0.4]} scale={[0.32, 0.32, 0.32]} renderOrder={2}>
        <planeGeometry args={[1.6, 1.6]} />
        <shaderMaterial
          ref={ghostMaterialRef}
          vertexShader={SCREEN_PLANE_VERTEX_SHADER}
          fragmentShader={SOURCE_GLOW_FRAGMENT_SHADER}
          uniforms={ghostUniforms}
          transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </mesh>
      <mesh position={[edgeX, edgeY, -0.3]} renderOrder={1} frustumCulled={false}>
        <planeGeometry args={[quality.name === 'LOW' ? 2.4 : 3.4, quality.name === 'LOW' ? 4.2 : 4.8]} />
        <shaderMaterial
          vertexShader={SCREEN_PLANE_VERTEX_SHADER}
          fragmentShader={SOURCE_GLOW_FRAGMENT_SHADER}
          uniforms={rightEdgeUniforms}
          transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </mesh>
      <mesh position={[-edgeX, -edgeY * 0.72, -0.34]} renderOrder={1} frustumCulled={false}>
        <planeGeometry args={[quality.name === 'LOW' ? 2.6 : 3.8, quality.name === 'LOW' ? 4.6 : 4.4]} />
        <shaderMaterial
          vertexShader={SCREEN_PLANE_VERTEX_SHADER}
          fragmentShader={SOURCE_GLOW_FRAGMENT_SHADER}
          uniforms={leftEdgeUniforms}
          transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </mesh>
      <mesh ref={backgroundPulseRef} position={[0, 0, -1.25]} renderOrder={0} frustumCulled={false}>
        <planeGeometry args={backgroundSize} />
        <shaderMaterial
          vertexShader={SCREEN_PLANE_VERTEX_SHADER}
          fragmentShader={SOURCE_GLOW_FRAGMENT_SHADER}
          uniforms={backgroundPulseUniforms}
          transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </mesh>

      <mesh ref={coneRef} renderOrder={1} frustumCulled={false}>
        <coneGeometry args={[SONIC_SCENE.beam.radius, BEAM_LENGTH, quality.name === 'HIGH' ? 72 : 36, 1, true]} />
        <shaderMaterial
          ref={volumeMaterialRef}
          vertexShader={VOLUMETRIC_VERTEX_SHADER}
          fragmentShader={VOLUMETRIC_FRAGMENT_SHADER}
          uniforms={volumeUniforms}
          side={THREE.DoubleSide} transparent depthWrite={false} depthTest={false}
          blending={THREE.AdditiveBlending} toneMapped
        />
      </mesh>

      <mesh ref={beamSheetRef} renderOrder={1} frustumCulled={false}>
        <planeGeometry args={[1, BEAM_SHEET_WIDTH]} />
        <shaderMaterial
          ref={beamSheetMaterialRef}
          vertexShader={BEAM_SHEET_VERTEX_SHADER}
          fragmentShader={BEAM_SHEET_FRAGMENT_SHADER}
          uniforms={beamSheetUniforms}
          transparent depthWrite={false} depthTest={false}
          blending={THREE.AdditiveBlending} toneMapped
        />
      </mesh>

      <points ref={particleCloudRef} frustumCulled={false} renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={particleMaterialRef}
          vertexShader={PARTICLE_VERTEX_SHADER}
          fragmentShader={PARTICLE_FRAGMENT_SHADER}
          uniforms={particleUniforms}
          transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </points>

      <group ref={logoGroupRef} position={[0, 0, SONIC_SCENE.logo.z]} rotation={[0.015, -0.045, -0.008]}>
        <mesh position={[0, 0, -0.055]} scale={[1.008, 1.008, 1.008]} renderOrder={2}>
          <planeGeometry args={[logoSize, logoSize]} />
          <meshBasicMaterial map={logoTexture} color="#010102" transparent opacity={0.035} alphaTest={0.018} depthWrite />
        </mesh>
        <mesh renderOrder={3}>
          <planeGeometry args={[logoSize, logoSize, quality.name === 'HIGH' ? 96 : 64, quality.name === 'HIGH' ? 96 : 64]} />
          <shaderMaterial
            ref={logoMaterialRef}
            vertexShader={LOGO_VERTEX_SHADER}
            fragmentShader={LOGO_FRAGMENT_SHADER}
            uniforms={logoUniforms}
          transparent alphaTest={0.012} depthWrite toneMapped
          />
        </mesh>
      </group>

      <mesh ref={auraRef} position={[0, 0, -0.68]} scale={[0.84, 0.84, 0.84]} renderOrder={0}>
        <planeGeometry args={[7.2, 5.8]} />
        <shaderMaterial
          ref={auraMaterialRef}
          vertexShader={SCREEN_PLANE_VERTEX_SHADER}
          fragmentShader={AURA_FRAGMENT_SHADER}
          uniforms={auraUniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </mesh>

      <EffectComposer multisampling={0} depthBuffer={false}>
        <GodRays
          sun={sourceRef as React.MutableRefObject<THREE.Mesh>}
          blendFunction={BlendFunction.SCREEN}
          samples={quality.godRays.samples}
          density={quality.godRays.density}
          decay={quality.godRays.decay}
          weight={quality.godRays.weight}
          exposure={quality.godRays.exposure}
          resolutionScale={quality.godRays.resolutionScale}
          kernelSize={KernelSize.SMALL}
          blur={quality.godRays.blur}
        />
        <Bloom
          intensity={quality.bloom.intensity}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.08}
          mipmapBlur={quality.bloom.mipmapBlur}
        />
        <Vignette offset={0.16} darkness={0.48} opacity={0.5} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

export default function SynauraSonicScene({
  active,
  reducedMotion,
  debugTime,
  onReady,
  onComplete,
  onContextLost,
}: {
  active: boolean;
  reducedMotion: boolean;
  debugTime: number | null;
  onReady: () => void;
  onComplete: () => void;
  onContextLost: () => void;
}) {
  const [quality] = useState(selectSonicQuality);
  const [metrics, setMetrics] = useState<SonicPerformanceMetrics | null>(null);
  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMappingExposure = 0.86;
    gl.domElement.addEventListener('webglcontextlost', onContextLost, { once: true });
  }, [onContextLost]);

  return (
    <div
      className={styles.webglStage}
      data-sonic-webgl
      data-quality={quality.name}
      data-fps={metrics?.fps}
      data-frame-time={metrics?.frameTimeMs}
      data-god-rays-samples={quality.godRays.samples}
      data-particles={quality.particles}
    >
      <Canvas
        camera={SONIC_SCENE.camera}
        dpr={quality.dpr}
        frameloop="always"
        gl={(canvas) => new THREE.WebGLRenderer({
          canvas,
          alpha: false,
          antialias: quality.antialias,
          depth: true,
          stencil: false,
          powerPreference: 'high-performance',
        })}
        onCreated={handleCreated}
      >
        <Suspense fallback={null}>
          <SynauraRealtimeScene
            active={active}
            reducedMotion={reducedMotion}
            quality={quality}
            debugTime={debugTime}
            onReady={onReady}
            onComplete={onComplete}
            onMetrics={setMetrics}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

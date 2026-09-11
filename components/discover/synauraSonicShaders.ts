export const VOLUMETRIC_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const VOLUMETRIC_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uViolet;
  uniform vec3 uCyan;
  uniform vec3 uWhite;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float faceVisibility = pow(abs(dot(viewDirection, normalize(vWorldNormal))), 2.25);
    float axialFade = smoothstep(0.025, 0.2, vUv.y) * (1.0 - smoothstep(0.84, 0.995, vUv.y));
    float distanceFade = mix(0.38, 0.92, smoothstep(0.08, 0.82, vUv.y));
    float slowNoise = mix(0.58, 1.0, noise(vec2(vUv.y * 5.2 - uTime * 0.035, vUv.x * 4.0)));
    float dither = 0.72 + 0.28 * noise(gl_FragCoord.xy * 0.42 + uTime * 0.3);
    float longitudinal = 0.42 + 0.58 * pow(0.5 + 0.5 * sin(vUv.x * 78.0 + noise(vec2(vUv.y * 3.0, uTime * 0.02)) * 5.0), 7.0);
    float density = faceVisibility * axialFade * distanceFade * slowNoise * dither * longitudinal * uOpacity;
    float coolFringe = pow(1.0 - faceVisibility, 2.0) * 0.11;
    vec3 secondary = mix(uCyan, uViolet, smoothstep(0.18, 0.76, vUv.y));
    vec3 color = mix(uWhite, secondary, coolFringe);
    gl_FragColor = vec4(color * density * 0.72, density * 0.16);
  }
`;

export const BEAM_SHEET_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const BEAM_SHEET_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uTrailOffset;
  uniform vec3 uViolet;
  uniform vec3 uCyan;
  uniform vec3 uWhite;
  varying vec2 vUv;
  float beamHash(vec2 p) { return fract(sin(dot(p, vec2(41.17, 289.31))) * 15731.743); }
  float beamNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(beamHash(i), beamHash(i + vec2(1.0, 0.0)), f.x),
      mix(beamHash(i + vec2(0.0, 1.0)), beamHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    float halfWidth = mix(0.47, 0.025, smoothstep(0.0, 1.0, vUv.x));
    float trailShift = uTrailOffset * (1.0 - vUv.x);
    float lateral0 = abs(vUv.y - 0.5) / halfWidth;
    float lateral1 = abs(vUv.y - 0.5 + trailShift) / halfWidth;
    float lateral2 = abs(vUv.y - 0.5 + trailShift * 2.0) / halfWidth;
    float lateral3 = abs(vUv.y - 0.5 + trailShift * 3.0) / halfWidth;
    float outerBeam = exp(-pow(lateral0 * 1.56, 2.2)) * 0.68
      + exp(-pow(lateral1 * 1.56, 2.2)) * 0.19
      + exp(-pow(lateral2 * 1.56, 2.2)) * 0.09
      + exp(-pow(lateral3 * 1.56, 2.2)) * 0.04;
    float innerCore = exp(-pow(lateral0 * 4.55, 2.0)) * 0.68
      + exp(-pow(lateral1 * 4.55, 2.0)) * 0.19
      + exp(-pow(lateral2 * 4.55, 2.0)) * 0.09
      + exp(-pow(lateral3 * 4.55, 2.0)) * 0.04;
    float axial = smoothstep(0.015, 0.14, vUv.x) * (1.0 - smoothstep(0.91, 0.995, vUv.x));
    float mist = mix(0.56, 1.0, beamNoise(vec2(vUv.x * 6.0 - uTime * 0.035, vUv.y * 5.0)));
    float rayPattern = pow(0.5 + 0.5 * sin((vUv.y - 0.5) * 108.0 + beamNoise(vec2(vUv.x * 4.0, uTime * 0.018)) * 5.0), 12.0);
    float streaks = 0.44 + rayPattern * 0.56;
    float sourceGain = mix(0.52, 1.12, smoothstep(0.42, 0.96, vUv.x));
    float density = (outerBeam * 0.055 + innerCore * (0.24 + streaks * 0.28)) * axial * mist * sourceGain * uOpacity;
    float fringe = outerBeam * (1.0 - innerCore) * 0.075;
    vec3 coolLayer = mix(uCyan, uViolet, smoothstep(0.18, 0.82, vUv.x));
    vec3 color = mix(uWhite, coolLayer, fringe);
    float opticalAlpha = axial * (0.14 + innerCore * 0.3) * mix(0.78, 1.0, mist);
    gl_FragColor = vec4(color * density * 1.36, opticalAlpha);
  }
`;

export const LOGO_VERTEX_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uDepth;
  varying vec2 vUv;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    float alpha = texture2D(uMap, uv).a;
    vec3 sculpted = position + normal * alpha * uDepth;
    vec4 viewPosition = modelViewMatrix * vec4(sculpted, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const LOGO_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform float uLightX;
  uniform float uLightY;
  uniform float uReveal;
  uniform float uHighlight;
  uniform float uHighlightTrail;
  uniform float uWavePulse;
  uniform float uArcPulse;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vViewPosition;
  void main() {
    vec4 mark = texture2D(uMap, vUv);
    if (mark.a < 0.012) discard;
    float aL = texture2D(uMap, vUv - vec2(uTexel.x, 0.0)).a;
    float aR = texture2D(uMap, vUv + vec2(uTexel.x, 0.0)).a;
    float aD = texture2D(uMap, vUv - vec2(0.0, uTexel.y)).a;
    float aU = texture2D(uMap, vUv + vec2(0.0, uTexel.y)).a;
    float aL2 = texture2D(uMap, vUv - vec2(uTexel.x * 2.2, 0.0)).a;
    float aR2 = texture2D(uMap, vUv + vec2(uTexel.x * 2.2, 0.0)).a;
    float aD2 = texture2D(uMap, vUv - vec2(0.0, uTexel.y * 2.2)).a;
    float aU2 = texture2D(uMap, vUv + vec2(0.0, uTexel.y * 2.2)).a;
    vec2 gradient = vec2((aL - aR) * 0.64 + (aL2 - aR2) * 0.36, (aD - aU) * 0.64 + (aD2 - aU2) * 0.36);
    float edge = smoothstep(0.012, 0.24, length(gradient));
    vec3 normal = normalize(vec3(gradient * 4.6, 0.94));
    vec3 lightDirection = normalize(vec3(vec2(uLightX, uLightY) - vUv, 0.38));
    vec3 viewDirection = normalize(-vViewPosition);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float roughnessVariation = 0.5 + 0.5 * sin(vUv.x * 37.0 + vUv.y * 29.0);
    float specularPower = mix(32.0, 58.0, edge * (0.74 + roughnessVariation * 0.26));
    float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), specularPower);
    float distanceFromFront = vUv.x + (vUv.y - 0.5) * 0.14 - uLightX;
    float broadFront = exp(-pow(distanceFromFront * 15.8, 2.0)) * 0.66
      + exp(-pow((distanceFromFront - uHighlightTrail) * 15.8, 2.0)) * 0.2
      + exp(-pow((distanceFromFront - uHighlightTrail * 2.0) * 15.8, 2.0)) * 0.09
      + exp(-pow((distanceFromFront - uHighlightTrail * 3.0) * 15.8, 2.0)) * 0.05;
    float sharpFront = exp(-pow(distanceFromFront * 48.0, 2.0)) * 0.66
      + exp(-pow((distanceFromFront - uHighlightTrail) * 48.0, 2.0)) * 0.2
      + exp(-pow((distanceFromFront - uHighlightTrail * 2.0) * 48.0, 2.0)) * 0.09
      + exp(-pow((distanceFromFront - uHighlightTrail * 3.0) * 48.0, 2.0)) * 0.05;
    float coralFringe = exp(-pow((distanceFromFront + 0.02) * 46.0, 2.0));
    float violetFringe = exp(-pow(distanceFromFront * 56.0, 2.0));
    float cyanFringe = exp(-pow((distanceFromFront - 0.02) * 46.0, 2.0));
    float passedLight = smoothstep(-0.22, 0.72, distanceFromFront) * uReveal;
    float irregularReveal = clamp(passedLight * (0.92 + 0.08 * sin(vUv.y * 31.0 + uTime * 0.7)), 0.0, 1.0);
    float waveRegion = smoothstep(0.35, 0.4, vUv.x) * (1.0 - smoothstep(0.62, 0.67, vUv.x))
      * smoothstep(0.42, 0.48, vUv.y) * (1.0 - smoothstep(0.64, 0.7, vUv.y));
    float wavePhase = clamp(uWavePulse, 0.0, 1.0) * 5.4;
    float bar1 = exp(-pow((vUv.x - 0.422) * 92.0, 2.0));
    float bar2 = exp(-pow((vUv.x - 0.458) * 92.0, 2.0));
    float bar3 = exp(-pow((vUv.x - 0.495) * 92.0, 2.0));
    float bar4 = exp(-pow((vUv.x - 0.529) * 92.0, 2.0));
    float bar5 = exp(-pow((vUv.x - 0.564) * 92.0, 2.0));
    float barMask = clamp((bar1 + bar2 + bar3 + bar4 + bar5) * waveRegion, 0.0, 1.0);
    float barReveal = clamp((
      bar1 * smoothstep(0.04, 0.35, wavePhase)
      + bar2 * smoothstep(1.04, 1.35, wavePhase)
      + bar3 * smoothstep(2.04, 2.35, wavePhase)
      + bar4 * smoothstep(3.04, 3.35, wavePhase)
      + bar5 * smoothstep(4.04, 4.35, wavePhase)
    ) * waveRegion, 0.0, 1.0);
    float waveSequence = (
      bar1 * exp(-pow((wavePhase - 0.35) * 2.35, 2.0))
      + bar2 * exp(-pow((wavePhase - 1.35) * 2.35, 2.0))
      + bar3 * exp(-pow((wavePhase - 2.35) * 2.35, 2.0))
      + bar4 * exp(-pow((wavePhase - 3.35) * 2.35, 2.0))
      + bar5 * exp(-pow((wavePhase - 4.35) * 2.35, 2.0))
    ) * waveRegion * smoothstep(0.015, 0.07, uWavePulse);
    float pulseRadius = clamp(uArcPulse, 0.0, 1.0) * 0.52;
    float radius = distance(vUv, vec2(0.5, 0.535));
    float arcPropagation = exp(-pow((radius - pulseRadius) * 36.0, 2.0))
      * smoothstep(0.015, 0.08, uArcPulse);
    vec3 darkMaterial = vec3(0.0008, 0.0007, 0.0014) + vec3(0.0045, 0.003, 0.0075) * diffuse;
    vec3 brand = pow(mark.rgb, vec3(1.08));
    float localLight = broadFront * (0.1 + diffuse * 0.44 + specular * 0.56) * uHighlight;
    vec3 surface = darkMaterial + brand * (irregularReveal * 0.68 + localLight * 0.42);
    surface *= 1.0 - barMask * 0.82 + barReveal * 0.82;
    vec2 edgeDirection = normalize(gradient + vec2(0.0001));
    vec2 planarLight = normalize(vec2(uLightX, uLightY) - vUv + vec2(0.0001));
    float directionalRim = edge * pow(max(dot(edgeDirection, planarLight), 0.0), 1.8);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.5);
    vec3 refraction = vec3(1.0, 0.25, 0.18) * coralFringe * 0.34;
    refraction += vec3(0.48, 0.2, 0.9) * violetFringe * 0.42;
    refraction += vec3(0.12, 0.66, 0.88) * cyanFringe * 0.3;
    refraction *= (0.24 + edge * 0.76) * uHighlight;
    float whiteCore = sharpFront * (0.14 + directionalRim * 0.38 + specular * 0.32) * uHighlight;
    vec3 signature = vec3(1.0, 0.86, 0.7) * whiteCore * 1.48 + refraction;
    vec3 internalEnergy = mix(vec3(0.92, 0.24, 0.19), vec3(0.24, 0.76, 0.94), vUv.x);
    vec3 waveEnergy = mix(internalEnergy, vec3(0.48, 0.18, 0.86), 0.46);
    vec3 arcEnergy = mix(pow(max(brand, vec3(0.0)), vec3(1.32)), vec3(0.38, 0.06, 0.9), 0.18);
    signature += waveEnergy * waveSequence * 1.65;
    signature += arcEnergy * arcPropagation * 1.7;
    vec3 materialResponse = vec3(0.32, 0.2, 0.46) * directionalRim * (0.025 + uHighlight * 0.1);
    materialResponse += brand * fresnel * (0.018 + irregularReveal * 0.035);
    vec3 cinematicColor = max(surface + signature + materialResponse, vec3(0.0));
    cinematicColor = vec3(1.0) - exp(-cinematicColor * 0.92);
    gl_FragColor = vec4(cinematicColor, mark.a);
  }
`;

export const PARTICLE_VERTEX_SHADER = /* glsl */ `
  uniform vec3 uBeamOrigin;
  uniform vec3 uBeamDirection;
  uniform float uOpacity;
  uniform float uPixelRatio;
  varying float vIllumination;
  varying float vHue;
  void main() {
    vec3 fromSource = position - uBeamOrigin;
    float alongBeam = dot(fromSource, uBeamDirection);
    vec3 closest = uBeamOrigin + uBeamDirection * max(alongBeam, 0.0);
    float radialDistance = distance(position, closest);
    float coneRadius = mix(0.08, 1.62, clamp(alongBeam / 8.8, 0.0, 1.0));
    float insideBeam = 1.0 - smoothstep(coneRadius * 0.46, coneRadius * 1.06, radialDistance);
    float alongFade = smoothstep(0.15, 0.8, alongBeam) * (1.0 - smoothstep(7.6, 9.0, alongBeam));
    vIllumination = insideBeam * alongFade * uOpacity;
    vHue = clamp(position.y * 0.12 + 0.5, 0.0, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (0.9 + vIllumination * 2.1) * uPixelRatio * (18.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  varying float vIllumination;
  varying float vHue;
  void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float point = 1.0 - smoothstep(0.08, 0.5, distanceToCenter);
    vec3 color = mix(vec3(0.82, 0.92, 1.0), vec3(1.0, 0.94, 0.82), vHue);
    gl_FragColor = vec4(color * vIllumination * 0.72, point * vIllumination * 0.32);
  }
`;

export const SCREEN_PLANE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SOURCE_GLOW_FRAGMENT_SHADER = /* glsl */ `
  uniform float uOpacity;
  uniform float uGhost;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.35);
    float radius = length(p);
    float core = exp(-radius * radius * 42.0);
    float spill = exp(-radius * radius * 8.5);
    vec3 color = mix(vec3(0.76, 0.86, 1.0), vec3(1.0, 0.92, 0.78), core);
    float alpha = (core * 1.45 + spill * 0.18) * uOpacity;
    gl_FragColor = vec4(color * alpha * mix(0.82, 0.28, uGhost), alpha * 0.42);
  }
`;

export const AURA_FRAGMENT_SHADER = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 center = vUv - vec2(0.47, 0.515);
    float angle = atan(center.y, center.x);
    float organic = sin(angle * 3.0 + 0.7) * 0.025 + sin(angle * 5.0 - 0.4) * 0.014;
    float radius = length(center * vec2(0.92, 1.14));
    float innerFalloff = smoothstep(0.08, 0.25, radius);
    float outerFalloff = 1.0 - smoothstep(0.2 + organic, 0.53 + organic, radius);
    float asymmetry = mix(0.44, 1.0, smoothstep(-0.42, 0.36, center.x + center.y * 0.24));
    float grain = 0.93 + 0.07 * sin(vUv.x * 31.0 + sin(vUv.y * 17.0)) * sin(vUv.y * 27.0 - vUv.x * 4.0);
    float halo = innerFalloff * outerFalloff * asymmetry * grain;
    vec3 color = mix(vec3(0.12, 0.55, 0.74), vec3(0.46, 0.15, 0.78), smoothstep(-0.32, 0.34, center.x));
    gl_FragColor = vec4(color * halo * 0.62, halo * uOpacity);
  }
`;

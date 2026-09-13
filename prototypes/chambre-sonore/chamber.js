import * as THREE from '/vendor/three.module.js';

// Isolated visual study: no application state, API, persistence or AudioCore imports.
const stage = document.querySelector('#chamber-stage');
const canvas = document.querySelector('#chamber-canvas');
const audio = document.querySelector('#chamber-audio');
const soundToggle = document.querySelector('#sound-toggle');
const motionToggle = document.querySelector('#motion-toggle');
const enterButton = document.querySelector('#enter-chamber');
const announcement = document.querySelector('#chamber-announcement');
const copies = [...document.querySelectorAll('[data-copy]')];
const chapterButtons = [...document.querySelectorAll('[data-chapter-target]')];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 760px)');
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
let paused = reduceMotion.matches;
let targetProgress = 0;
let progress = 0;
let chapter = 0;
let elapsed = 0;
let previousTime = 0;
let frame = 0;
let renderer;
let material;
let sculpture;
let analyser;
let audioContext;
let frequencyData;
let pulseIndex = 0;
let dirty = true;
let width = innerWidth;
let height = innerHeight;
const pointer = new THREE.Vector2(0, 0);
const pointerTarget = new THREE.Vector2(0, 0);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
camera.position.z = 2;
const pulses = Array.from({ length: 4 }, () => new THREE.Vector4(.5, .5, -100, 0));
const uniforms = {
  uTexture: { value: null }, uTime: { value: 0 }, uAudio: { value: 0 },
  uPointer: { value: pointer }, uPulses: { value: pulses },
  uMotion: { value: paused ? 0 : 1 }, uProgress: { value: 0 },
};

function announce(message) { announcement.textContent = message; }
function currentScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  return maxScroll > 0 ? clamp(scrollY / maxScroll) : 0;
}
function goToChapter(index) {
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  scrollTo({ top: maxScroll * index / 2, behavior: paused ? 'instant' : 'smooth' });
}
chapterButtons.forEach(button => button.addEventListener('click', () => goToChapter(Number(button.dataset.chapterTarget))));
enterButton.addEventListener('click', () => {
  if (chapter < 2) goToChapter(chapter + 1);
  else sendPulse(.65, .55);
});
document.querySelector('#material-pulse').addEventListener('click', () => sendPulse(.65, .55));

function syncMotion() {
  document.body.classList.toggle('motion-paused', paused);
  motionToggle.setAttribute('aria-pressed', String(paused));
  motionToggle.setAttribute('aria-label', paused ? 'Reprendre les animations' : 'Mettre les animations en pause');
  motionToggle.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
  motionToggle.querySelector('.motion-label').textContent = paused ? 'En pause' : 'Mouvement';
  uniforms.uMotion.value = paused ? 0 : 1;
  dirty = true;
  requestFrame();
}
motionToggle.addEventListener('click', () => {
  paused = !paused;
  syncMotion();
  announce(paused ? 'Animations en pause. Vous pouvez toujours explorer les trois chapitres.' : 'Animations reprises.');
});
reduceMotion.addEventListener('change', () => { paused = reduceMotion.matches; syncMotion(); });

function syncAudio() {
  const playing = !audio.paused && !audio.ended;
  stage.dataset.audio = playing ? 'playing' : 'silent';
  soundToggle.setAttribute('aria-pressed', String(playing));
  soundToggle.setAttribute('aria-label', playing ? 'Arrêter la signature sonore' : 'Écouter la signature Synaura, 3,2 secondes');
  soundToggle.querySelector('.sound-label').textContent = playing ? 'Son activé' : audio.currentTime > 0 ? 'Rejouer le son' : 'Activer le son';
}
soundToggle.addEventListener('click', async () => {
  if (!audio.paused) { audio.pause(); syncAudio(); return; }
  try {
    // One existing media element, connected once; analysis never starts playback.
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = .85;
        audioContext.createMediaElementSource(audio).connect(analyser);
        analyser.connect(audioContext.destination);
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
      }
    }
    if (audioContext?.state === 'suspended') await audioContext.resume();
    audio.currentTime = 0;
    await audio.play();
    syncAudio();
    announce('Signature Synaura. La matière réagit au son.');
  } catch {
    syncAudio();
    announce('Lecture indisponible. Vous pouvez réessayer avec le bouton son.');
  }
});
['play', 'pause', 'ended'].forEach(event => audio.addEventListener(event, syncAudio));
audio.addEventListener('ended', () => announce('Signature terminée. Vous pouvez la rejouer.'));

function sendPulse(x, y) {
  if (!sculpture || stage.dataset.renderer !== 'webgl') {
    announce('La matière est affichée en image. Les chapitres restent accessibles.');
    return;
  }
  if (paused) { announce('Onde désactivée : les animations sont en pause.'); return; }
  pulses[pulseIndex].set(x, y, elapsed, 1);
  pulseIndex = (pulseIndex + 1) % pulses.length;
  dirty = true;
  requestFrame();
  announce('Une onde traverse la matière.');
}
addEventListener('pointermove', event => {
  if (event.pointerType === 'touch' || paused) return;
  pointerTarget.set(event.clientX / width * 2 - 1, 1 - event.clientY / height * 2);
}, { passive: true });
addEventListener('pointerout', event => { if (!event.relatedTarget) pointerTarget.set(0, 0); }, { passive: true });
let pointerDown = null;
addEventListener('pointerdown', event => {
  if (event.target.closest('button, a') || !event.isPrimary) return;
  pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId };
}, { passive: true });
addEventListener('pointercancel', () => { pointerDown = null; }, { passive: true });
addEventListener('pointerup', event => {
  if (!pointerDown || event.pointerId !== pointerDown.id) return;
  const down = pointerDown;
  pointerDown = null;
  // Never intercept a scroll or swipe; pulse only a stationary tap on the sculpture region.
  if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10) return;
  const x = event.clientX / width, y = event.clientY / height;
  if ((mobileQuery.matches && y > .43 && y < .78) || (!mobileQuery.matches && x > .45 && y > .18 && y < .8)) {
    if (!sculpture || stage.dataset.renderer !== 'webgl') {
      announce('La matière est affichée en image. Les chapitres restent accessibles.');
      return;
    }
    const nx = (event.clientX - width / 2 - sculpture.position.x) / sculpture.scale.x + .5;
    const ny = ((height / 2 - event.clientY) - sculpture.position.y) / sculpture.scale.y + .5;
    sendPulse(clamp(nx), clamp(ny));
  }
}, { passive: true });

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
    // The generated asset has a black matte, not alpha. Key only its near-black exterior.
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

function resize() {
  width = innerWidth;
  height = innerHeight;
  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobileQuery.matches ? 1.5 : 1.75));
    renderer.setSize(width, height, false);
    camera.left = -width / 2; camera.right = width / 2;
    camera.top = height / 2; camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
  }
  targetProgress = currentScrollProgress();
  dirty = true;
  requestFrame();
}

function updateChapters() {
  const continuousChapter = progress * 2;
  const nextChapter = Math.round(continuousChapter);
  if (nextChapter !== chapter) {
    chapter = nextChapter;
    stage.dataset.chapter = String(chapter);
    document.querySelector('#chapter-number').textContent = `0${chapter + 1}`;
    document.querySelector('.large-index').textContent = `0${chapter + 1}`;
    document.querySelector('#scroll-label').textContent = chapter === 2 ? 'VOTRE GESTE. VOTRE ONDE.' : 'SCROLLEZ POUR RESSENTIR';
    enterButton.querySelector('span').textContent = ['Entrer dans le son', 'Laisser une empreinte', 'Envoyer une onde'][chapter];
    chapterButtons.forEach((button, i) => {
      if (i === chapter) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    copies.forEach((copy, i) => {
      copy.classList.toggle('is-active', i === chapter);
      copy.inert = i !== chapter;
      copy.setAttribute('aria-hidden', String(i !== chapter));
    });
  }
  copies.forEach((copy, i) => {
    const distance = continuousChapter - i;
    const visible = Math.abs(distance) <= .5;
    const opacity = paused ? Number(i === chapter) : clamp(1 - Math.pow(Math.abs(distance) * 1.95, 2));
    copy.style.opacity = String(opacity);
    copy.style.visibility = visible ? 'visible' : 'hidden';
    copy.style.transform = paused ? 'none' : `translate3d(${distance * -28}px, ${distance * -70}px, 0)`;
  });
  document.documentElement.style.setProperty('--progress', String(progress));
}

function updateSculpture() {
  if (!sculpture) return;
  const travel = progress * 2;
  const middle = Math.sin(progress * Math.PI);
  const isMobile = mobileQuery.matches;
  const baseWidth = isMobile ? width * 1.38 : Math.min(width * .85, height * 1.41);
  const scale = 1 + middle * (isMobile ? .2 : .31) + progress * .025;
  sculpture.scale.set(baseWidth * scale, baseWidth / 1.5 * scale, 1);
  const px = paused ? 0 : pointer.x;
  const py = paused ? 0 : pointer.y;
  sculpture.position.x = isMobile ? width * (.15 - middle * .08) : width * (.265 + middle * .045);
  sculpture.position.y = isMobile ? -height * (.093 + middle * .055) : height * (.016 - middle * .09);
  sculpture.position.x += px * (isMobile ? 0 : 14);
  sculpture.position.y += py * 9;
  sculpture.rotation.z = -.08 * travel + (paused ? 0 : Math.sin(elapsed * .23) * .012);
  uniforms.uProgress.value = progress;
  uniforms.uTime.value = elapsed;
}

function requestFrame() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(renderFrame);
}
function renderFrame(timestamp) {
  frame = 0;
  const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, .05) : 0;
  previousTime = timestamp;
  if (!paused) elapsed += delta;
  const blend = 1 - Math.exp(-delta * 11);
  progress = paused ? targetProgress : progress + (targetProgress - progress) * blend;
  if (Math.abs(targetProgress - progress) < .0001) progress = targetProgress;
  pointer.lerp(pointerTarget, 1 - Math.exp(-delta * 5));
  if (analyser && !audio.paused && !paused) {
    analyser.getByteFrequencyData(frequencyData);
    let sum = 0;
    for (let i = 0; i < 28; i++) sum += frequencyData[i];
    uniforms.uAudio.value += (sum / (28 * 255) - uniforms.uAudio.value) * .16;
  } else uniforms.uAudio.value *= .9;
  if (dirty || !paused) {
    updateChapters();
    updateSculpture();
    if (renderer && material) renderer.render(scene, camera);
    document.documentElement.style.setProperty('--px', String(pointer.x));
    document.documentElement.style.setProperty('--py', String(pointer.y));
    dirty = false;
  }
  if (!paused) requestFrame();
}
addEventListener('scroll', () => { targetProgress = currentScrollProgress(); dirty = true; requestFrame(); }, { passive: true });
addEventListener('resize', resize, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(frame); frame = 0;
    // This prototype owns only the explicitly played sonic signature, never the site's music.
    audio.pause();
  } else { previousTime = 0; dirty = true; requestFrame(); }
});
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  stage.dataset.renderer = 'fallback';
  paused = true; syncMotion();
  announce('Mode image activé. Le défilement et les commandes restent disponibles.');
});

async function initialize() {
  syncMotion();
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const texture = await new THREE.TextureLoader().loadAsync('/assets/membrane-cobalt.png');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    uniforms.uTexture.value = texture;
    material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false });
    sculpture = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 60, 40), material);
    scene.add(sculpture);
    resize();
    stage.dataset.renderer = 'webgl';
  } catch {
    stage.dataset.renderer = 'fallback';
    paused = true;
    syncMotion();
    announce('La scène est affichée en mode image sur ce navigateur.');
  }
  document.body.classList.add('is-ready');
  resize();
}
initialize();

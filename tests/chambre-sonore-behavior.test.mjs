import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../prototypes/chambre-sonore/chamber.js', import.meta.url), 'utf8');
const browserImport = /^import \* as THREE from ['"]\/vendor\/three\.module\.js['"];\r?\n/;
assert.match(source, browserImport);
// Execute the actual interaction module. Only its browser-only Three import is
// replaced; these tests do not try to validate shaders, layout, or WebGL output.
const executableSource = source.replace(browserImport, '');

class EventTargetStub {
  listeners = new Map();
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, event = {}) {
    return Promise.all((this.listeners.get(type) ?? []).map((listener) => listener({ type, target: this, ...event })));
  }
}

class ElementStub extends EventTargetStub {
  dataset = {};
  attributes = new Map();
  children = new Map();
  textContent = '';
  inert = false;
  style = { setProperty(name, value) { this[name] = value; } };
  classNames = new Set();
  classList = {
    add: (...names) => names.forEach((name) => this.classNames.add(name)),
    remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
    contains: (name) => this.classNames.has(name),
    toggle: (name, force = !this.classNames.has(name)) => {
      if (force) this.classNames.add(name); else this.classNames.delete(name);
      return force;
    },
  };
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelector(selector) { return this.children.get(selector) ?? null; }
  closest() { return null; }
}

class AudioStub extends ElementStub {
  paused = true;
  ended = false;
  currentTime = 0;
  playCalls = 0;
  pauseCalls = 0;
  async play() {
    this.playCalls++;
    this.paused = false;
    this.ended = false;
    await this.dispatch('play');
  }
  pause() {
    this.pauseCalls++;
    const wasPlaying = !this.paused;
    this.paused = true;
    if (wasPlaying) return this.dispatch('pause');
  }
}

function createHarness({ reducedMotion = false, rendererMode = 'ready' } = {}) {
  const elements = new Map([
    '#chamber-stage', '#chamber-canvas', '#sound-toggle', '#motion-toggle',
    '#enter-chamber', '#chamber-announcement', '#material-pulse',
    '#chapter-number', '.large-index', '#scroll-label',
  ].map((selector) => [selector, new ElementStub()]));
  const audio = new AudioStub();
  const unrelatedAudio = new AudioStub();
  unrelatedAudio.paused = false;
  elements.set('#chamber-audio', audio);
  for (const [parent, selectors] of [
    ['#sound-toggle', ['.sound-label']],
    ['#motion-toggle', ['.motion-icon', '.motion-label']],
    ['#enter-chamber', ['span']],
  ]) {
    for (const selector of selectors) elements.get(parent).children.set(selector, new ElementStub());
  }
  const stage = elements.get('#chamber-stage');
  Object.assign(stage.dataset, { chapter: '0', renderer: 'loading' });
  const chapters = Array.from({ length: 3 }, (_, index) => {
    const button = new ElementStub();
    button.dataset.chapterTarget = String(index);
    if (index === 0) button.setAttribute('aria-current', 'step');
    return button;
  });
  const copies = Array.from({ length: 3 }, (_, index) => {
    const copy = new ElementStub();
    copy.dataset.copy = String(index);
    copy.inert = index !== 0;
    copy.setAttribute('aria-hidden', String(index !== 0));
    return copy;
  });

  const document = new EventTargetStub();
  document.hidden = false;
  document.body = new ElementStub();
  document.documentElement = new ElementStub();
  document.documentElement.scrollHeight = 2720;
  document.querySelector = (selector) => elements.get(selector) ?? null;
  document.querySelectorAll = (selector) => {
    if (selector === '[data-copy]') return copies;
    if (selector === '[data-chapter-target]') return chapters;
    if (selector === 'audio') return [audio, unrelatedAudio];
    return [];
  };
  const browserEvents = new EventTargetStub();
  const motionPreference = new EventTargetStub();
  motionPreference.matches = reducedMotion;
  const mobilePreference = new EventTargetStub();
  mobilePreference.matches = false;
  const frames = new Map();
  const scrollCalls = [];
  const mediaSources = [];
  let nextFrame = 0;
  let time = 0;
  let contextCount = 0;
  let resolveTexture;
  const textureReady = rendererMode === 'loading'
    ? new Promise((resolve) => { resolveTexture = resolve; })
    : Promise.resolve({});

  class VectorStub {
    constructor(...values) { this.set(...values); }
    set(x = 0, y = 0, z = 0, w = 0) { Object.assign(this, { x, y, z, w }); return this; }
    lerp(target, alpha) {
      this.x += (target.x - this.x) * alpha;
      this.y += (target.y - this.y) * alpha;
      return this;
    }
  }
  class RendererStub {
    constructor() {
      if (rendererMode === 'unavailable') throw new Error('WebGL is unavailable');
      this.capabilities = { getMaxAnisotropy: () => 1 };
    }
    setClearColor() {}
    setPixelRatio() {}
    setSize() {}
    render() {}
  }
  class AudioContextStub {
    state = 'suspended';
    destination = {};
    constructor() { contextCount++; }
    async resume() { this.state = 'running'; }
    createAnalyser() {
      return { frequencyBinCount: 128, connect() {}, getByteFrequencyData(data) { data.fill(0); } };
    }
    createMediaElementSource(element) {
      mediaSources.push(element);
      return { connect() {} };
    }
  }

  const sandbox = {
    document,
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    scrollY: 0,
    AudioContext: AudioContextStub,
    addEventListener: browserEvents.addEventListener.bind(browserEvents),
    matchMedia: (query) => query.includes('prefers-reduced-motion') ? motionPreference : mobilePreference,
    requestAnimationFrame: (callback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id) => frames.delete(id),
    scrollTo: (options) => {
      scrollCalls.push(options);
      sandbox.scrollY = options.top;
      browserEvents.dispatch('scroll');
    },
    THREE: {
      Vector2: VectorStub,
      Vector4: VectorStub,
      Scene: class { add() {} },
      OrthographicCamera: class { position = {}; updateProjectionMatrix() {} },
      WebGLRenderer: RendererStub,
      TextureLoader: class { loadAsync() { return textureReady; } },
      ShaderMaterial: class {},
      PlaneGeometry: class {},
      Mesh: class { position = new VectorStub(); scale = new VectorStub(1, 1, 1); rotation = {}; },
      SRGBColorSpace: 'srgb',
      LinearMipmapLinearFilter: 1008,
    },
  };
  sandbox.window = sandbox;
  const ready = runInNewContext(executableSource, sandbox, { filename: 'chamber.js', timeout: 1000 });

  return {
    audio, unrelatedAudio, document, browserEvents, stage, chapters, copies,
    motionPreference, frames, scrollCalls, mediaSources, ready,
    contextCount: () => contextCount,
    element: (selector) => elements.get(selector),
    click: (selector) => elements.get(selector).dispatch('click'),
    finishLoading: () => { resolveTexture?.({}); return ready; },
    renderFrames(count = 1) {
      for (let i = 0; i < count; i++) {
        const pending = [...frames.entries()];
        time += 1000 / 60;
        for (const [id, callback] of pending) {
          frames.delete(id);
          callback(time);
        }
      }
    },
    async tapMaterial() {
      const event = { clientX: 960, clientY: 400, pointerId: 1, isPrimary: true, target: new ElementStub() };
      await browserEvents.dispatch('pointerdown', event);
      await browserEvents.dispatch('pointerup', event);
    },
  };
}

test('audio starts only on an explicit sound click and reuses one media source', async () => {
  const ui = createHarness();
  await ui.ready;
  ui.renderFrames(3);
  assert.equal(ui.audio.playCalls, 0);
  assert.equal(ui.contextCount(), 0);

  await ui.click('#sound-toggle');
  assert.equal(ui.audio.playCalls, 1);
  assert.equal(ui.contextCount(), 1);
  assert.deepEqual(ui.mediaSources, [ui.audio]);
  assert.equal(ui.element('#sound-toggle').getAttribute('aria-pressed'), 'true');

  await ui.click('#sound-toggle');
  assert.equal(ui.audio.playCalls, 1, 'a stop click does not start a second playback');
  assert.equal(ui.audio.paused, true);
  assert.equal(ui.element('#sound-toggle').getAttribute('aria-pressed'), 'false');

  await ui.click('#sound-toggle');
  assert.equal(ui.audio.playCalls, 2);
  assert.equal(ui.contextCount(), 1);
  assert.deepEqual(ui.mediaSources, [ui.audio], 'replays never reconnect the media element');
});

test('chapter navigation and material interactions leave audio playback alone', async () => {
  const ui = createHarness({ reducedMotion: true });
  await ui.ready;
  for (const chapter of ui.chapters) {
    await chapter.dispatch('click');
    ui.renderFrames();
  }
  await ui.click('#enter-chamber');
  await ui.click('#material-pulse');
  await ui.tapMaterial();
  assert.equal(ui.audio.playCalls, 0);
  assert.equal(ui.audio.pauseCalls, 0);
  assert.equal(ui.contextCount(), 0);

  await ui.click('#sound-toggle');
  for (const chapter of ui.chapters) {
    await chapter.dispatch('click');
    ui.renderFrames();
  }
  await ui.click('#material-pulse');
  assert.equal(ui.audio.playCalls, 1);
  assert.equal(ui.audio.pauseCalls, 0);
  assert.equal(ui.audio.paused, false);
});

test('reduced-motion preference initializes paused and stops the continuous frame loop', async () => {
  const ui = createHarness({ reducedMotion: true });
  await ui.ready;
  assert.equal(ui.stage.dataset.renderer, 'webgl');
  assert.equal(ui.document.body.classList.contains('motion-paused'), true);
  assert.equal(ui.element('#motion-toggle').getAttribute('aria-pressed'), 'true');
  assert.match(ui.element('#motion-toggle').getAttribute('aria-label'), /Reprendre/);
  ui.renderFrames();
  assert.equal(ui.frames.size, 0);
  assert.equal(ui.audio.playCalls, 0);
});

test('manual pause preserves native chapter navigation and accessible chapter state', async () => {
  const ui = createHarness();
  await ui.ready;
  await ui.click('#motion-toggle');
  ui.renderFrames();
  assert.equal(ui.element('#motion-toggle').getAttribute('aria-pressed'), 'true');

  for (const index of [1, 2, 0]) {
    await ui.chapters[index].dispatch('click');
    ui.renderFrames();
    assert.equal(ui.scrollCalls.at(-1).behavior, 'instant');
    assert.equal(ui.stage.dataset.chapter, String(index));
    assert.equal(ui.chapters[index].getAttribute('aria-current'), 'step');
    assert.equal(ui.element('#chapter-number').textContent, `0${index + 1}`);
    ui.copies.forEach((copy, copyIndex) => {
      assert.equal(copy.inert, copyIndex !== index);
      assert.equal(copy.getAttribute('aria-hidden'), String(copyIndex !== index));
      assert.equal(copy.style.opacity, copyIndex === index ? '1' : '0');
    });
    assert.equal(ui.frames.size, 0, 'chapter changes do not restart the continuous animation');
  }
});

test('material taps and pulse buttons remain safe while WebGL is loading or unavailable', async () => {
  for (const rendererMode of ['loading', 'unavailable']) {
    const ui = createHarness({ rendererMode, reducedMotion: true });
    if (rendererMode === 'unavailable') await ui.ready;
    assert.equal(ui.stage.dataset.renderer, rendererMode === 'loading' ? 'loading' : 'fallback');
    await assert.doesNotReject(ui.tapMaterial());
    await assert.doesNotReject(ui.click('#material-pulse'));
    await ui.chapters[2].dispatch('click');
    ui.renderFrames();
    assert.equal(ui.stage.dataset.chapter, '2');
    await assert.doesNotReject(ui.click('#enter-chamber'));
    assert.match(ui.element('#chamber-announcement').textContent, /image/);
    assert.equal(ui.audio.playCalls, 0);
    await ui.finishLoading();
  }
});

test('hiding the page pauses only owned audio, stops frames, and never autoplays on return', async () => {
  const ui = createHarness();
  await ui.ready;
  await ui.click('#sound-toggle');
  assert.equal(ui.frames.size, 1);
  ui.document.hidden = true;
  await ui.document.dispatch('visibilitychange');
  assert.equal(ui.audio.pauseCalls, 1);
  assert.equal(ui.audio.paused, true);
  assert.equal(ui.element('#sound-toggle').getAttribute('aria-pressed'), 'false');
  assert.equal(ui.unrelatedAudio.pauseCalls, 0);
  assert.equal(ui.unrelatedAudio.paused, false);
  assert.equal(ui.frames.size, 0);

  ui.document.hidden = false;
  await ui.document.dispatch('visibilitychange');
  ui.renderFrames();
  assert.equal(ui.audio.playCalls, 1, 'visibility restoration requires a new sound click');
  assert.equal(ui.audio.paused, true);
  assert.equal(ui.unrelatedAudio.playCalls, 0);
});

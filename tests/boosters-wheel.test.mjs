import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import {
  WHEEL_SEGMENTS,
  readWheelOutcome,
  wheelArc,
  wheelLanding,
} from '../components/boosters/wheelModel.ts';
const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('daily wheel sectors match the real server ordering, probabilities and labels', () => {
  const source = read('lib/boosters/spin.ts');
  const ast = ts.createSourceFile(
    'spin.ts',
    source,
    ts.ScriptTarget.Latest,
    true
  );
  const declaration = ast.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((node) => node.name.getText(ast) === 'WHEEL');
  assert.ok(declaration?.initializer);
  const actual = vm.runInNewContext(
    `(${declaration.initializer.getText(ast)})`
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        actual.map((segment) => ({
          key: segment.key,
          weight: segment.weight,
          label: segment.reward.label,
          kind: segment.reward.kind,
        }))
      )
    ),
    WHEEL_SEGMENTS.map(({ key, weight, label, kind }) => ({
      key,
      weight,
      label,
      kind,
    }))
  );
  assert.equal(
    WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0),
    100
  );
});

test('all seven server results stop at the fixed pointer, including the 1 percent sector', () => {
  for (let index = 0; index < WHEEL_SEGMENTS.length; index++) {
    const arc = wheelArc(index);
    assert.ok(
      Math.abs(arc.end - arc.start - WHEEL_SEGMENTS[index].weight * 3.6) <
        0.00001
    );
    for (const current of [0, 19.8, 359.99, 720, 4029.21, 190021.14]) {
      const landing = wheelLanding(index, current);
      assert.ok(landing - current >= 1800);
      assert.ok(landing - current < 2160);
      const localAtPointer = (360 - (landing % 360)) % 360;
      assert.ok(Math.abs(localAtPointer - arc.middle) < 0.00001);
    }
  }
  assert.ok(Math.abs(wheelArc(6).end - 360) < 0.00001);
});

test('only a coherent authoritative result can land the wheel', () => {
  WHEEL_SEGMENTS.forEach((segment, index) => {
    const value = {
      index,
      resultKey: segment.key,
      reward: { kind: segment.kind, label: segment.label },
    };
    assert.equal(readWheelOutcome(value), value);
    assert.equal(readWheelOutcome({ ...value, resultKey: 'different' }), null);
  });
  for (const value of [
    null,
    {},
    { index: -1 },
    { index: 7 },
    { index: 1.5 },
    { index: '1' },
    {
      index: 1,
      resultKey: 'credits_10',
      reward: { kind: 'booster', label: 'wrong' },
    },
  ])
    assert.equal(readWheelOutcome(value), null);
});

const source = read('components/boosters/DailyRewardWheel.tsx');
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
function wheelRuntime({ onSpin, reduced = false }) {
  const state = [],
    refs = [],
    effects = [],
    exports = {};
  let slot = 0,
    refSlot = 0;
  const flatten = (tree) =>
    Array.isArray(tree)
      ? tree.flatMap(flatten)
      : tree && typeof tree === 'object'
      ? [tree, ...flatten(tree.props?.children)]
      : [];
  const animations = [];
  const node = {
    style: {},
    animate: (frames, options) => {
      const animation = {
        currentTime: 175,
        frames,
        options,
        cancelled: false,
        cancel() {
          this.cancelled = true;
        },
        finish() {},
        finished: Promise.resolve(),
      };
      animations.push(animation);
      return animation;
    },
  };
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === 'react')
        return {
          useState(initial) {
            const index = slot++;
            if (!(index in state)) state[index] = initial;
            return [
              state[index],
              (value) => {
                state[index] = value;
              },
            ];
          },
          useRef(initial) {
            const index = refSlot++;
            if (!refs[index])
              refs[index] = { current: index === 0 ? node : initial };
            return refs[index];
          },
          useEffect(fn) {
            effects.push(fn);
          },
        };
      if (name === 'react/jsx-runtime')
        return {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        };
      if (name === 'lucide-react')
        return {
          ArrowRight: 'arrow',
          RotateCw: 'rotate',
          Sparkles: 'sparkles',
        };
      if (name === './BoosterDialog' || name === './RewardWheel')
        return { default: name };
      if (name === './wheelModel') return { WHEEL_SEGMENTS, wheelLanding };
      if (name.includes('useLivingMotion'))
        return {
          useLivingMotion: () => ({ preferred: true, constrained: reduced }),
        };
      throw new Error(name);
    },
  });
  function render(canSpin = true) {
    slot = 0;
    refSlot = 0;
    return flatten(
      exports.default({ canSpin, onSpin, onClose() {}, onInventory() {} })
    );
  }
  const rendered = render();
  const cleanups = effects.map((effect) => effect()).filter(Boolean);
  return {
    state,
    node,
    animations,
    render,
    spin: rendered.find((node) => node.type === 'button').props.onClick,
    unmount: () => cleanups.forEach((fn) => fn()),
  };
}
const win = {
  ok: true,
  result: {
    index: 6,
    resultKey: 'legendary_booster',
    reward: { kind: 'booster', label: 'Booster légendaire' },
  },
};

test('double-clicks send just one spin; the final angle reflects the server result', async () => {
  let requests = 0,
    resolve;
  const ui = wheelRuntime({
    onSpin: () => {
      requests++;
      return new Promise((done) => {
        resolve = done;
      });
    },
  });
  const pending = ui.spin();
  await ui.spin();
  assert.equal(requests, 1);
  assert.equal(ui.state[0], 'spinning');
  resolve(win);
  await pending;
  assert.equal(ui.state[0], 'result');
  assert.equal(ui.state[1].index, 6);
  assert.equal(ui.animations.length, 2);
  assert.equal(ui.animations[0].cancelled, true);
  assert.equal(
    ui.node.style.transform,
    `rotate(${wheelLanding(6, (175 / 800) * 360)}deg)`
  );
});

test('reduced motion skips rotation but still waits for the real reward', async () => {
  const ui = wheelRuntime({ reduced: true, onSpin: async () => win });
  await ui.spin();
  assert.equal(ui.state[0], 'result');
  assert.equal(ui.animations.length, 0);
  assert.equal(ui.node.style.transform, `rotate(${wheelLanding(6, 0)}deg)`);
});

test('a closed pending wheel cleans animation without rendering a late reward', async () => {
  let resolve;
  const ui = wheelRuntime({
    onSpin: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  const pending = ui.spin();
  ui.unmount();
  resolve(win);
  await pending;
  assert.equal(ui.animations[0].cancelled, true);
  assert.equal(ui.state[1], null);
  assert.equal(ui.animations.length, 1);
});

test('a failed spin never reveals or retries a reward automatically', async () => {
  let calls = 0;
  const ui = wheelRuntime({
    onSpin: async () => {
      calls++;
      return { ok: false, error: 'Indisponible' };
    },
  });
  await ui.spin();
  await ui.spin();
  assert.equal(calls, 1);
  assert.equal(ui.state[0], 'error');
  assert.equal(ui.state[1], null);
  assert.equal(ui.state[2], 'Indisponible');
});

test('wheel preview is development-only and cannot spend real spins', () => {
  assert.match(
    read('app/dev/boosters-wheel/page.tsx'),
    /NODE_ENV !== 'development'/
  );
  assert.match(read('app/dev/boosters-wheel/page.tsx'), /notFound\(\)/);
  assert.doesNotMatch(
    read('app/dev/boosters-wheel/WheelPreview.tsx'),
    /fetch\(|useBoosters|\/api\//
  );
  assert.doesNotMatch(source, /fetch\(|Math.random|new Audio|useAudioPlayer/);
});

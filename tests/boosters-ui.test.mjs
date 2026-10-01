import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as policy from '../lib/boosters/policy.ts';
import * as wheelModel from '../components/boosters/wheelModel.ts';
import * as campaigns from '../lib/boosters/campaigns.ts';
const source = readFileSync(
  new URL('../app/boosters/BoostersClient.tsx', import.meta.url),
  'utf8'
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const flatten = (tree) =>
  Array.isArray(tree)
    ? tree.flatMap(flatten)
    : tree && typeof tree === 'object'
    ? [tree, ...flatten(tree.props?.children)]
    : [];
const text = (tree) =>
  Array.isArray(tree)
    ? tree.map(text).join('')
    : tree && typeof tree === 'object'
    ? text(tree.props?.children)
    : tree == null || typeof tree === 'boolean'
    ? ''
    : String(tree);
const booster = {
  id: 'catalog1',
  key: 'rare',
  name: 'Élan',
  description: '',
  type: 'track',
  rarity: 'rare',
  multiplier: 2,
  duration_hours: 12,
  enabled: true,
};
const item = {
  id: 'inventory1',
  status: 'owned',
  booster,
  obtained_at: new Date().toISOString(),
};
function runtime(options = {}) {
  const states = [],
    calls = [],
    reads = [],
    exports = {};
  let index = 0;
  const result = {
    ok: true,
    data: { boost: { expiresAt: '2026-10-05T12:00:00Z' } },
  };
  const state = {
    inventory: [item, { ...item, id: 'inventory2' }],
    identity: 'owner',
    revision: 0,
    now: Date.now(),
    plan: 'free',
    packs: {},
    canOpen: true,
    remainingMs: 0,
    streak: 0,
    cooldownMs: 86400000,
    ready: true,
    loading: false,
    busy: false,
    error: null,
    odds: [],
    openDaily: async () => {
      calls.push(['daily']);
      return { ok: true, received: { inventoryId: 'new', booster } };
    },
    useOnTrack: async (id, target) => {
      calls.push(['track', id, target]);
      return result;
    },
    useOnArtist: async (id) => {
      calls.push(['artist', id]);
      return result;
    },
    perform: async (url, body) => {
      calls.push([url, body]);
      return { ok: true, data: { received: [] } };
    },
    ...options.boosts,
  };
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === 'react')
        return {
          useState: (initial) => {
            const slot = index++;
            if (!(slot in states)) states[slot] = initial;
            return [
              states[slot],
              (value) =>
                (states[slot] =
                  typeof value === 'function' ? value(states[slot]) : value),
            ];
          },
          useMemo: (fn) => fn(),
          useEffect: () => {},
        };
      if (name === 'react/jsx-runtime')
        return {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        };
      if (name === 'next-auth/react')
        return {
          useSession: () => ({
            status: 'authenticated',
            data: { user: { id: 'owner', name: 'Fixture' } },
          }),
        };
      if (name === '@/hooks/useBoosters') return { useBoosters: () => state };
      if (name === '@/lib/boosters/policy') return policy;
      if (name === '@/lib/boosters/campaigns') return campaigns;
      if (name === '@/components/boosters/wheelModel') return wheelModel;
      if (name === '@/components/boosters/useBoosterResource')
        return {
          useBoosterResource: (url) => {
            reads.push(url);
            return {
              loading: false,
              error: null,
              reload: () => {},
              data:
                url === '/api/boosters/my-active'
                  ? { boosts: options.active || [], artistBoosts: [] }
                  : url === '/api/boosters/targets'
                  ? {
                      tracks: [
                        {
                          id: 'mine',
                          title: 'Mon son',
                          coverUrl: '/cover.jpg',
                        },
                        { id: 'ai-no', title: 'IA exclue' },
                      ],
                    }
                  : url === '/api/missions'
                  ? { missions: [] }
                  : url === '/api/daily-spin'
                  ? { canSpin: true }
                  : null,
            };
          },
        };
      if (name === 'lucide-react')
        return new Proxy({}, { get: (_, key) => `icon-${String(key)}` });
      if (name.endsWith('.css')) return {};
      if (
        [
          'next/link',
          '@/components/ambient/ExperienceMotionFrame',
          '@/components/boosters/BoosterDialog',
          '@/components/boosters/BoosterOpening',
          '@/components/boosters/BoosterCatalog',
          '@/components/boosters/DailyRewardWheel',
          '@/components/boosters/RewardWheel',
        ].includes(name)
      )
        return { default: name };
      throw new Error(name);
    },
  });
  const render = () => {
    index = 0;
    const tree = exports.default();
    return { tree, nodes: flatten(tree) };
  };
  const button = (label) => {
    const node = render().nodes.find(
      (n) => n.type === 'button' && text(n).trim() === label
    );
    assert.ok(node, label);
    return node;
  };
  return { calls, reads, states, state, render, button };
}
test('inventory groups duplicate copies; initial render never claims or loads inactive rewards', () => {
  const ui = runtime();
  const { nodes } = ui.render();
  assert.equal(
    nodes.filter((n) => n.props?.className === 'boost-card').length,
    1
  );
  assert.ok(
    text(nodes.find((n) => n.props?.className === 'boost-card')).includes('×2')
  );
  assert.deepEqual(ui.calls, []);
  assert.ok(!ui.reads.includes('/api/missions'));
  assert.ok(!ui.reads.includes('/api/boosters/targets'));
});
test('choosing a track and continuing do not consume; final confirmation forwards exact inventory and target', async () => {
  const ui = runtime();
  ui.button('Choisir mon morceau').props.onClick();
  let nodes = ui.render().nodes;
  assert.deepEqual(ui.calls, []);
  const radios = nodes.filter(
    (n) => n.type === 'input' && n.props.type === 'radio'
  );
  assert.equal(radios.length, 1);
  assert.equal(ui.button('Continuer').props.disabled, true);
  radios[0].props.onChange();
  assert.equal(ui.button('Continuer').props.disabled, false);
  ui.button('Continuer').props.onClick();
  assert.deepEqual(ui.calls, []);
  await ui.button('Confirmer l’activation').props.onClick();
  assert.deepEqual(ui.calls, [['track', 'inventory1', 'mine']]);
  assert.equal(
    ui
      .render()
      .nodes.some((n) => n.type === '@/components/boosters/BoosterDialog'),
    false
  );
});
test('cancel and back preserve inventory without invoking a mutation', () => {
  const ui = runtime();
  ui.button('Choisir mon morceau').props.onClick();
  ui.button('Annuler').props.onClick();
  assert.deepEqual(ui.calls, []);
  assert.equal(ui.state.inventory.length, 2);
  ui.button('Choisir mon morceau').props.onClick();
  ui.render()
    .nodes.find((n) => n.type === 'input' && n.props.type === 'radio')
    .props.onChange();
  ui.button('Continuer').props.onClick();
  ui.button('Changer de morceau').props.onClick();
  assert.equal(ui.button('Continuer').props.disabled, false);
  assert.deepEqual(ui.calls, []);
});
test('artist boost also requires confirmation and targets current owner only', async () => {
  const ui = runtime({
    boosts: {
      inventory: [{ ...item, booster: { ...booster, type: 'artist' } }],
    },
  });
  ui.button('Booster mon profil').props.onClick();
  assert.deepEqual(ui.calls, []);
  assert.ok(text(ui.render().tree).includes('Fixture'));
  await ui.button('Confirmer l’activation').props.onClick();
  assert.deepEqual(ui.calls, [['artist', 'inventory1']]);
});
test('a stronger, longer boost blocks a wasteful activation; expired boosts do not', () => {
  const ui = runtime({
    active: [
      {
        track_id: 'mine',
        multiplier: 3,
        expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      },
    ],
  });
  ui.button('Choisir mon morceau').props.onClick();
  ui.render()
    .nodes.find((n) => n.type === 'input' && n.props.type === 'radio')
    .props.onChange();
  assert.equal(ui.button('Continuer').props.disabled, true);
  assert.deepEqual(ui.calls, []);
});
test('daily reward is explicit and result can be kept without activation', async () => {
  const ui = runtime();
  await ui.button('Récupérer mon boost').props.onClick();
  assert.deepEqual(ui.calls, [['daily']]);
  ui.render()
    .nodes.find((n) => n.type === '@/components/boosters/BoosterOpening')
    .props.onInventory();
  assert.deepEqual(ui.calls, [['daily']]);
});

test('opening appears before the request resolves; dismissing never reopens or reclaims', async () => {
  let resolve;
  const request = new Promise((done) => {
    resolve = done;
  });
  let claims = 0;
  const ui = runtime({
    boosts: {
      openDaily: () => {
        claims++;
        return request;
      },
    },
  });
  const pending = ui.button('Récupérer mon boost').props.onClick();
  const opening = () =>
    ui
      .render()
      .nodes.find((n) => n.type === '@/components/boosters/BoosterOpening');
  assert.equal(opening().props.rewards, null);
  opening().props.onClose();
  resolve({ ok: true, received: { inventoryId: 'received', booster } });
  await pending;
  assert.equal(opening(), undefined);
  assert.equal(claims, 1);
  assert.deepEqual(ui.calls, []);
});

test('failed opening closes the scene and displays the actual error, without phantom reward', async () => {
  const ui = runtime({
    boosts: {
      openDaily: async () => ({ ok: false, error: 'Booster indisponible.' }),
    },
  });
  await ui.button('Récupérer mon boost').props.onClick();
  assert.equal(
    ui
      .render()
      .nodes.some((n) => n.type === '@/components/boosters/BoosterOpening'),
    false
  );
  assert.ok(text(ui.render().tree).includes('Booster indisponible.'));
});

test('revealed booster prepares but never auto-activates a real inventory item', async () => {
  const ui = runtime();
  await ui.button('Récupérer mon boost').props.onClick();
  const opening = ui
    .render()
    .nodes.find((n) => n.type === '@/components/boosters/BoosterOpening');
  opening.props.onSelect(opening.props.rewards[0]);
  assert.ok(ui.button('Continuer'));
  assert.deepEqual(ui.calls, [['daily']]);
  assert.equal(
    ui
      .render()
      .nodes.some((n) => n.type === '@/components/boosters/BoosterOpening'),
    false
  );
});
test('rewards tab loads only on demand and free plan does not expose claim-pack buttons', () => {
  const ui = runtime();
  ui.button('Récompenses').props.onClick();
  ui.render();
  assert.ok(ui.reads.includes('/api/missions'));
  assert.ok(ui.reads.includes('/api/daily-spin'));
  assert.ok(text(ui.render().tree).includes('Dès Starter'));
  assert.deepEqual(ui.calls, []);
});

test('success without a reward payload cannot leave the opening waiting forever', async () => {
  const ui = runtime({ boosts: { openDaily: async () => ({ ok: true }) } });
  await ui.button('Récupérer mon boost').props.onClick();
  assert.equal(
    ui
      .render()
      .nodes.some((n) => n.type === '@/components/boosters/BoosterOpening'),
    false
  );
  assert.ok(
    text(ui.render().tree).includes('Consulte ta réserve avant de réessayer.')
  );
});

test('the wheel opens without spending a spin and keeps won boosters out of the tearing scene', async () => {
  let spins = 0;
  const segment = wheelModel.WHEEL_SEGMENTS[4];
  const ui = runtime({
    boosts: {
      perform: async (url) => {
        assert.equal(url, '/api/daily-spin');
        spins++;
        return {
          ok: true,
          data: {
            index: 4,
            resultKey: segment.key,
            reward: { kind: segment.kind, label: segment.label },
            rewardPayload: { inventoryId: 'won', booster },
          },
        };
      },
    },
  });
  ui.button('Récompenses').props.onClick();
  ui.button('Tenter ma chance').props.onClick();
  const wheel = () =>
    ui
      .render()
      .nodes.find((n) => n.type === '@/components/boosters/DailyRewardWheel');
  assert.ok(wheel());
  assert.equal(spins, 0);
  const result = await wheel().props.onSpin();
  assert.equal(result.ok, true);
  assert.equal(result.result.index, 4);
  assert.equal(spins, 1);
  assert.equal(
    ui
      .render()
      .nodes.some((n) => n.type === '@/components/boosters/BoosterOpening'),
    false
  );
  assert.deepEqual(ui.calls, []);
  wheel().props.onInventory();
  assert.equal(wheel(), undefined);
  assert.equal(
    ui
      .render()
      .nodes.some((n) => n.type === 'button' && text(n).trim() === 'Continuer'),
    false
  );
});

test('closing a wheel during the request never reopens it on a late response', async () => {
  let resolve;
  const ui = runtime({
    boosts: {
      perform: () =>
        new Promise((done) => {
          resolve = done;
        }),
    },
  });
  ui.button('Récompenses').props.onClick();
  ui.button('Tenter ma chance').props.onClick();
  const wheel = () =>
    ui
      .render()
      .nodes.find((n) => n.type === '@/components/boosters/DailyRewardWheel');
  const pending = wheel().props.onSpin();
  wheel().props.onClose();
  resolve({
    ok: true,
    data: {
      index: 1,
      resultKey: 'credits_10',
      reward: { kind: 'credits', label: '+10 crédits IA' },
    },
  });
  const response = await pending;
  assert.equal(response.ok, true);
  assert.equal(wheel(), undefined);
  assert.equal(
    ui
      .render()
      .nodes.some((n) => n.type === '@/components/boosters/BoosterOpening'),
    false
  );
});

test('the wheel never fabricates an outcome from an invalid server response', async () => {
  const ui = runtime();
  ui.button('Récompenses').props.onClick();
  ui.button('Tenter ma chance').props.onClick();
  const wheel = ui
    .render()
    .nodes.find((n) => n.type === '@/components/boosters/DailyRewardWheel');
  const response = await wheel.props.onSpin();
  assert.equal(response.ok, false);
  assert.match(response.error, /non confirmé/);
});

test('catalogue browsing exposes definitions without minting inventory or credits', () => {
  const ui = runtime();
  ui.button('Catalogue').props.onClick();
  const catalog = ui.render().nodes.find((node) => node.type === '@/components/boosters/BoosterCatalog');
  assert.ok(catalog);
  assert.equal(catalog.props.inventory.length,2);
  assert.deepEqual(ui.calls,[]);
});

test('creation boosters confirm a self recharge, never ask for a track or assume a timed boost response', async () => {
  let claims=0;
  const recharge=campaigns.CAMPAIGN_CATALOG.find((item)=>item.key==='campaign_creation_epic');
  const ui=runtime({ boosts:{ inventory:[{...item,booster:{...recharge,id:'credit-catalog'}}],useOnArtist:async(id)=>{assert.equal(id,'inventory1');claims++;return {ok:true,data:{credits:{amount:24}}};} } });
  ui.button('Ajouter mes crédits').props.onClick();
  assert.equal(claims,0);
  assert.ok(text(ui.render().tree).includes('+24 crédits IA'));
  await ui.button('Confirmer l’activation').props.onClick();
  assert.equal(claims,1);
  assert.ok(text(ui.render().tree).includes('+24 crédits IA ajoutés à ton solde.'));
  assert.deepEqual(ui.calls,[]);
});

test('activation preview compares the same family only, not unrelated active effects', () => {
  const radar=campaigns.CAMPAIGN_CATALOG.find((item)=>item.key==='campaign_radar_rare');
  const ui=runtime({active:[{track_id:'mine',booster_key:'campaign_live_legendary',multiplier:4,expires_at:new Date(Date.now()+86400000*4).toISOString()}],boosts:{inventory:[{...item,booster:{...radar,id:'radar-catalog'}}]}});
  ui.button('Choisir mon morceau').props.onClick();
  ui.render().nodes.find((node)=>node.type==='input'&&node.props.type==='radio').props.onChange();
  ui.button('Continuer').props.onClick();
  assert.equal(ui.button('Confirmer l’activation').props.disabled,false);
});

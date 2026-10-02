import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { entryIdentity, entryRoute, takeAuthDestination, rememberAuthDestination } from '../synaura-app/src/auth/entryGate.ts';

// Execute the actual navigator component with a minimal deterministic hook host.
// No production account, token, TOTP secret or security bypass is involved.
function navigatorHost({ stallOnboarding = false } = {}) {
  const app = fs.readFileSync(new URL('../synaura-app/src/App.tsx', import.meta.url), 'utf8');
  const source = app.slice(app.indexOf('function RootStackNavigator()'), app.indexOf('function SynauraRuntime()'));
  let auth = { loading: false, token: null, user: null, mfaRequired: false, biometricLocked: false };
  const states = [], effects = [], timers = new Set();
  let hook = 0, dirty = false, pending = [], onboardingCalls = 0;
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    useState(initial) {
      const index = hook++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; dirty = true; }];
    },
    useEffect(run, deps) {
      const index = hook++;
      const previous = effects[index];
      if (previous && deps.every((dep, i) => Object.is(dep, previous.deps[i]))) return;
      previous?.cleanup?.();
      const effect = { deps, cleanup: null };
      effects[index] = effect;
      pending.push(() => { effect.cleanup = run(); });
    },
    useAuth: () => auth,
    useMobileSettings: () => ({ settings: { reducedMotion: true } }),
    entryIdentity, entryRoute, takeAuthDestination,
    isWelcomeCompleted: async () => false,
    isOnboardingCompleted: async () => { onboardingCalls++; return stallOnboarding ? new Promise(() => {}) : true; },
    Stack: { Navigator: 'Navigator', Screen: 'Screen' },
    colors: {}, ROOT_GATE_TIMEOUT_MS: 2400,
    setTimeout: callback => { timers.add(callback); return callback; },
    clearTimeout: callback => timers.delete(callback),
  };
  for (const name of source.matchAll(/(?:<|component=\{)([A-Z]\w*)/g)) context[name[1]] ??= name[1];
  context.getMessagesScreen = () => 'Messages'; context.getConversationScreen = () => 'Conversation';
  vm.createContext(context);
  vm.runInContext(ts.transpile(source, { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }), context);
  return {
    setAuth: next => { auth = { ...auth, ...next }; },
    async render() {
      let tree;
      for (let pass = 0; pass < 8; pass++) {
        dirty = false; hook = 0; pending = [];
        tree = context.RootStackNavigator();
        pending.forEach(run => run());
        await Promise.resolve(); await Promise.resolve();
        if (!dirty) return tree;
      }
      throw new Error('Navigator did not settle');
    },
    get onboardingCalls() { return onboardingCalls; },
    expireTimers() { const pendingTimers = [...timers]; timers.clear(); pendingTimers.forEach(callback => callback()); },
    dispose: () => effects.forEach(effect => effect?.cleanup?.()),
  };
}

test('actual root: successful MFA cannot remount the visitor Welcome stack', async () => {
  const host = navigatorHost();
  try {
    assert.equal((await host.render()).props.initialRouteName, 'Welcome');
    rememberAuthDestination({ screen: 'Library' });
    host.setAuth({ token: 'fixture-aal1', user: { id: 'fixture-user', profileComplete: true }, mfaRequired: true });
    assert.equal((await host.render()).type, 'MfaChallengeScreen');
    assert.equal(host.onboardingCalls, 0, 'no protected onboarding request before MFA');
    host.setAuth({ token: 'fixture-aal2', mfaRequired: false });
    const authorized = await host.render();
    assert.equal(authorized.type, 'Navigator');
    assert.equal(authorized.props.initialRouteName, 'Tabs');
    assert.equal(authorized.props.key, 'user:fixture-user');
    assert.equal(authorized.children.find(child => child.props.name === 'Tabs').props.initialParams.screen, 'Library');
    assert.equal(host.onboardingCalls, 1);
    host.setAuth({ token: 'fixture-refreshed' });
    assert.equal((await host.render()).props.key, authorized.props.key);
    assert.equal(host.onboardingCalls, 1, 'token refresh does not reset the app');
  } finally { host.dispose(); }
});

test('actual root: failed MFA stays blocked; profile completion resolves before entry', async () => {
  const host = navigatorHost();
  try {
    await host.render();
    host.setAuth({ token: 'fixture-aal1', user: { id: 'fixture-user', profileComplete: false }, mfaRequired: true });
    assert.equal((await host.render()).type, 'MfaChallengeScreen');
    assert.equal((await host.render()).type, 'MfaChallengeScreen');
    host.setAuth({ token: 'fixture-aal2', mfaRequired: false });
    assert.equal((await host.render()).type, 'CompleteAccountScreen');
    assert.equal(host.onboardingCalls, 0);
    host.setAuth({ user: { id: 'fixture-user', profileComplete: true } });
    assert.equal((await host.render()).props.initialRouteName, 'Tabs');
  } finally { host.dispose(); }
});

test('actual root: stalled entry reads time out only after security checks pass', async () => {
  const host = navigatorHost({ stallOnboarding: true });
  try {
    host.setAuth({ token: 'fixture-aal1', user: { id: 'fixture-user', profileComplete: true }, mfaRequired: true });
    assert.equal((await host.render()).type, 'MfaChallengeScreen');
    host.expireTimers();
    assert.equal((await host.render()).type, 'MfaChallengeScreen');
    assert.equal(host.onboardingCalls, 0);
    host.setAuth({ token: 'fixture-aal2', mfaRequired: false });
    assert.notEqual((await host.render()).type, 'Navigator');
    assert.equal(host.onboardingCalls, 1);
    host.expireTimers();
    assert.equal((await host.render()).props.initialRouteName, 'Tabs');
  } finally { host.dispose(); }
});

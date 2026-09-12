// Execute the real route/helper sources with an explicit database dependency.
// Tests only: no HTTP auth bypass and no application instrumentation.
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function loadCommunityModules(db, session = null, routeSource) {
  const errors = [];
  const load = (file, bindings = {}, source = fs.readFileSync(file, 'utf8')) => {
    const module = { exports: {} };
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    new Function('require', 'module', 'exports', 'console', compiled)(name => {
      if (name in bindings) return bindings[name];
      throw new Error('Unbound test dependency: ' + name);
    }, module, module.exports, { error: (...args) => errors.push(args) });
    return module.exports;
  };
  const publicTracks = load('lib/publicTracks.ts');
  const helpers = load('lib/communityPosts.ts', { '@/lib/database': { db }, '@/lib/publicTracks': publicTracks });
  const route = load('app/api/community/posts/route.ts', {
    'next/server': require('next/server'),
    '@/lib/database': { db },
    '@/lib/getApiSession': { getApiSession: async () => session },
    '@/lib/communityPosts': helpers,
  }, routeSource);
  return { route, helpers, errors };
}

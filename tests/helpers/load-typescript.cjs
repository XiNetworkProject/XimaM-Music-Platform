const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createRequire } = require('node:module');
// Small isolated harness: execute repository TypeScript, allowing explicit IO substitutions.
module.exports = function loadTypeScript(filename, overrides = {}, cache = new Map()) {
  const absolute = path.resolve(filename);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const mod = { exports: {} }; cache.set(absolute, mod);
  const localRequire = createRequire(absolute);
  const requireModule = name => {
    if (Object.prototype.hasOwnProperty.call(overrides, name)) return overrides[name];
    if (name.startsWith('.')) {
      const base = path.resolve(path.dirname(absolute), name);
      const file = fs.existsSync(base) ? base : base + '.ts';
      if (file.endsWith('.ts')) return module.exports(file, overrides, cache);
    }
    return localRequire(name);
  };
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(requireModule, mod, mod.exports);
  return mod.exports;
};

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const baseline = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (baseline !== 'd0ac45379227b4ad86042b6b8eb2156535f1b817') throw new Error('Unexpected V2 baseline');
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat();
}
function group(route) {
  if (/^\/(dev|debug|test|audio-core-harness)/.test(route)) return 'DEV';
  if (route.startsWith('/admin')) return 'ADMIN';
  if (/^\/(auth|enter|reset-password|onboarding)/.test(route)) return 'AUTH';
  if (route === '/' || route === '/landing') return 'PUBLIC';
  if (/^\/(create|ai-|studio|upload|publish|clips\/new)/.test(route)) return 'CREATION';
  if (/^\/(community|messages|notifications|posts|city|challenges|join|requests)/.test(route)) return 'SOCIAL';
  if (/^\/(library|settings|stats|boosters|subscriptions)/.test(route)) return 'PERSONAL';
  if (/^\/(legal|support|contact|download|partnerships)/.test(route)) return 'SERVICE';
  if (/^\/(feed|for-you|trending|swipe|arret|fermeture|meteo|star-academy-tiktok)/.test(route)) return 'LEGACY';
  return 'CORE';
}
const files = (await walk(path.join(root, 'app'))).filter(f => /[/\\]page\.[jt]sx?$/.test(f)).sort();
const routes = [];
for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const route = '/' + relative.replace(/^app\//, '').replace(/\/?page\.[jt]sx?$/, '').replace(/\([^/]+\)\//g, '');
  const source = await fs.readFile(file, 'utf8');
  const category = group(route);
  const redirect = source.match(/(?:redirect|router\.replace)\(['"`]([^'"`]+)['"`]/)?.[1];
  routes.push({ route, file: relative, category, before: redirect ? `Redirection ${redirect}` : /MOCK_TRACKS/.test(source) ? 'Démonstration legacy' : /SynauraAppShell/.test(source) ? 'Shell Phase 3/4B' : 'Présentation spécifique ou client délégué', v2: category === 'DEV' ? 'Outil technique conservé, hors navigation' : category === 'LEGACY' ? 'Accès historique conservé, revue ciblée à compléter' : 'Refonte locale à vérifier', status: 'À vérifier', mobile: 'NON TESTÉ', desktop: 'NON TESTÉ', tested: 'NON TESTÉ' });
}
await fs.mkdir(path.join(root, 'artifacts/synaura-v2'), { recursive: true });
await fs.writeFile(path.join(root, 'artifacts/synaura-v2/routes-initial.json'), JSON.stringify({ baseline, routes }, null, 2));
await fs.writeFile(path.join(root, 'docs/synaura-v2-route-coverage.md'), `# Synaura V2 — couverture exhaustive\n\nBaseline : ${baseline}. ${routes.length} routes web. Inventaire initial, aucun PASS visuel implicite. Les routes legacy restent accessibles ; cette catégorie n’autorise pas à supprimer leurs fonctions.\n\n| Route / surface | Classe | Before | V2 | Status | Mobile | Desktop | Tested |\n|---|---|---|---|---|---|---|---|\n${routes.map(r => `| \`${r.route}\` | ${r.category} | ${r.before} | ${r.v2} | ${r.status} | ${r.mobile} | ${r.desktop} | ${r.tested} |`).join('\n')}\n`);
console.log(JSON.stringify({ baseline, routes: routes.length, categories: routes.reduce((a,r) => ({...a,[r.category]:(a[r.category]||0)+1}),{}) }));

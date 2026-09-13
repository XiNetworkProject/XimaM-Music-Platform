import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const out = path.join(root, 'artifacts/chambre-full-redesign');
const slash = p => p.replaceAll('\\', '/');
async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(path.join(root, dir), { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat();
}
const hash = async file => crypto.createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex');
const protectedFiles = [...new Set([
  ...await walk('app/api'), ...await walk('lib/audio'), ...await walk('database'),
  ...await walk('components/chamber'), ...await walk('prototypes/chambre-sonore'),
  'app/providers.tsx', 'middleware.ts', 'lib/routeChrome.ts', 'lib/creationHandoffClient.ts',
  'components/context-surfaces/ContextSurfaceController.tsx',
  'package.json', 'package-lock.json', 'public/brand/chambre/membrane-cobalt.png',
])].sort();
const currentHashes = Object.fromEntries(await Promise.all(protectedFiles.map(async file => [file, await hash(file)])));
await fs.mkdir(out, { recursive: true });
const baselineFile = path.join(out, 'protected-before.json');
let baseline;
try { baseline = JSON.parse(await fs.readFile(baselineFile, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; baseline = currentHashes; await fs.writeFile(baselineFile, JSON.stringify(baseline, null, 2)); }
const changedProtected = [...new Set([...Object.keys(baseline), ...Object.keys(currentHashes)])].filter(f => baseline[f] !== currentHashes[f]);
// Explicit UI exception from the reopened review, never a new baseline for other changes.
const allowedPresentationChanges = [];
if (changedProtected.includes('lib/routeChrome.ts')) {
  const priorFile = 'artifacts/chambre-resumption/before/foundation/lib/routeChrome.ts';
  try {
    const prior = await fs.readFile(path.join(root, priorFile), 'utf8');
    const current = await fs.readFile(path.join(root, 'lib/routeChrome.ts'), 'utf8');
    if (await hash(priorFile) === baseline['lib/routeChrome.ts']
      && current.replace("pathname === '/publish' || startsWithAny(pathname, [", 'startsWithAny(pathname, [') === prior) {
      allowedPresentationChanges.push('lib/routeChrome.ts');
    }
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
const unexpectedProtected = changedProtected.filter(file => !allowedPresentationChanges.includes(file));
function group(route) {
  if (/^\/(dev|debug|test|audio-core-harness|feed)(\/|-|$)/.test(route)) return 'TECHNIQUE';
  if (route.startsWith('/admin')) return 'ADMIN';
  if (/^\/(meteo|star-academy-tiktok|arret|fermeture)(\/|$)/.test(route)) return 'SERVICE HISTORIQUE';
  if (/^\/(auth|enter|reset-password|onboarding)(\/|$)/.test(route) || ['/', '/landing'].includes(route)) return 'ENTRÉE / COMPTE';
  if (/^\/(create|ai-|studio|upload|publish|clips)/.test(route)) return 'CRÉATION';
  if (/^\/(community|messages|notifications|posts|city|challenges|join|requests)/.test(route)) return 'SOCIAL';
  if (/^\/(library|settings|stats|boosters|subscriptions)/.test(route)) return 'PERSONNEL';
  if (/^\/(legal|support|contact|download|partnerships)/.test(route)) return 'SERVICE';
  return 'MUSIQUE';
}
const pages = (await walk('app')).filter(f => /\/page\.[jt]sx?$/.test(f)).sort();
const routes = pages.map(file => {
  const route = '/' + file.replace(/^app\//, '').replace(/\/?page\.[jt]sx?$/, '').replace(/\([^/]+\)\//g, '');
  const category = group(route);
  const status = category === 'TECHNIQUE' ? 'Outil conservé, hors refonte artistique'
    : category === 'ADMIN' ? 'Cadre partagé adapté ; outils et autorisations conservés'
    : category === 'SERVICE HISTORIQUE' ? 'Service historique conservé, aucune fonction retirée'
    : ['/for-you','/trending'].includes(route) ? 'Sélection historique recomposée ; endpoints conservés, listes clavier'
    : ['/contact','/requests','/enter/continue'].includes(route) ? 'Routeur inchangé vers destination adaptée'
    : route === '/studio/library' ? 'Démonstration historique annoncée ; vraie bibliothèque /ai-library'
    : 'Présentation candidate — voir matrice et preuves par domaine';
  return { route, file, category, status, e2e: 'NON VALIDÉ : environnement connecté requis' };
});
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const changedPresentation = [];
for (const file of [...await walk('artifacts/chambre-full-redesign/before'), ...await walk('artifacts/chambre-resumption/before'), ...await walk('artifacts/chambre-continuation/before')]) {
  const source = file.replace(/^artifacts\/(?:chambre-full-redesign|chambre-resumption|chambre-continuation)\/before\/[^/]+\//, '');
  if (changedPresentation.some(item => item.source === source)) continue;
  try {
    const beforeHash = await hash(file), afterHash = await hash(source);
    if (beforeHash !== afterHash) changedPresentation.push({ source, snapshot: file, beforeHash, afterHash });
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
const additions = ['components/enter/PublicChamberEntry.tsx', 'scripts/chambre-redesign-inventory.mjs',
  'components/synaura/ChambreSpacesMenu.tsx', 'tests/chambre-navigation-resumption.test.mjs',
  'tests/chambre-music-resumption.test.mjs', 'docs/chambre-music-resumption.md', 'docs/chambre-redesign-resumption.md',
  'tests/chambre-personal-resumption.test.mjs',
  'app/dev/v2/rewards/page.tsx', 'app/dev/v2/rewards/RewardsReview.tsx',
  'tests/chambre-review-isolation.test.mjs', 'docs/chambre-continuation-validation.md',
  'components/home/home-flow-prelude.css', 'tests/chambre-live-continuation.test.mjs',
  'tests/chambre-discover-continuation.test.mjs', 'docs/chambre-live-continuation.md',
  'docs/chambre-discover-continuation.md', 'scripts/chambre-continuation-gallery.mjs',
  'tests/chambre-rewards-continuation.test.mjs', 'docs/chambre-rewards-continuation.md',
  'scripts/chambre-redesign-gallery.mjs', 'docs/chambre-redesign-validation.md',
  'docs/chambre-redesign-route-coverage.md', 'docs/chambre-music-redesign.md',
  'docs/chambre-creation-redesign.md', 'docs/chambre-personal-redesign.md',
  'tests/chambre-foundation-redesign.test.mjs', 'tests/chambre-music-redesign.test.mjs',
  'tests/chambre-creation-redesign.test.mjs', 'tests/chambre-personal-redesign.test.mjs', 'tests/chambre-player-loading.test.mjs'];
const scanFiles = [...new Set([...changedPresentation.map(f => f.source), ...additions])];
const secretFindings = [];
const secretPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk_live_|sk_test_|ghp_|github_pat_)[A-Za-z0-9_]{16,}|AKIA[0-9A-Z]{16}|(?:password|client_secret|secret_key)\s*[:=]\s*['"][A-Za-z0-9+/_-]{20,}['"]/i;
for (const file of scanFiles) {
  const lines = (await fs.readFile(path.join(root, file), 'utf8')).split(/\r?\n/);
  lines.forEach((line, index) => { if (secretPattern.test(line)) secretFindings.push({ file, line: index + 1 }); });
}
const report = { head, routes, changedPresentation, additions, protectedFiles: protectedFiles.length, changedProtected, allowedPresentationChanges, unexpectedProtected, scan: { files: scanFiles.length, secretFindings, caveat: 'Heuristique, pas une garantie sur les changements utilisateur préexistants.' } };
await fs.writeFile(path.join(out, 'inventory.json'), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(root, 'docs/chambre-redesign-route-coverage.md'), `# Chambre Sonore — registre de couverture\n\nGénéré par scripts/chambre-redesign-inventory.mjs. ${routes.length} routes inventoriées. HEAD ${head}.\n\nInventoriée ≠ recomposée ≠ testée visuellement ≠ validée de bout en bout. Les anciennes captures V2 ne valident pas cette direction. Les preuves actuelles et réserves sont dans chambre-redesign-validation.md et les rapports de chaque domaine. Aucun outil technique, service historique ou document légal n’est supprimé.\n\n| Route | Domaine | Traitement |\n|---|---|---|\n${routes.map(r => `| \`${r.route}\` | ${r.category} | ${r.status} |`).join('\n')}\n\n## Périmètre protégé\n\n${protectedFiles.length} fichiers surveillés par SHA-256 : API, database, audio, providers, middleware, route chrome, controller, dépendances, entrée approuvée et prototype. Différences depuis l’état initial de ce chantier : ${changedProtected.length ? changedProtected.join(', ') : 'aucune'}. Ce contrôle ne prétend pas auditer les changements utilisateur antérieurs au chantier.\n`);
await fs.appendFile(path.join(root, 'docs/chambre-redesign-route-coverage.md'), `\n## Reprise ouverte\n\nLa revue utilisateur a rejeté l’état « terminé ». Ce registre reste un inventaire, pas une validation : voir chambre-redesign-resumption.md. Exceptions de présentation contrôlées textuellement : ${allowedPresentationChanges.join(', ') || 'aucune'}. Changements protégés inattendus : ${unexpectedProtected.join(', ') || 'aucun'}.\n`);
console.log(JSON.stringify({ head, routes: routes.length, changedPresentation: changedPresentation.length, protected: protectedFiles.length, changedProtected, allowedPresentationChanges, unexpectedProtected, scanFiles: scanFiles.length, secretFindings }, null, 2));
if (unexpectedProtected.length || secretFindings.length) process.exitCode = 1;

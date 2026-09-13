import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Explicit review manifest only: never discover or include captures by glob.
// Usage: node scripts/chambre-experience-gallery.mjs [--base-url=http://127.0.0.1:3000]
// Manifest: artifacts/chambre-experience/capture-review.json
// Records: { name, label, width, height, path, reviewed: true }
// `path` may be an absolute capture path, workspace-relative path, a
// `captures/...` path relative to the review folder, or a capture filename.
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reviewDirectory = path.join(workspace, 'artifacts', 'chambre-experience');
const captureDirectory = path.join(reviewDirectory, 'captures');
const manifestPath = path.join(reviewDirectory, 'capture-review.json');
const outputPath = path.join(reviewDirectory, 'review.html');
const args = process.argv.slice(2);
if (args.length > 1 || args.some(argument => !argument.startsWith('--base-url='))) {
  throw new Error('Usage: node scripts/chambre-experience-gallery.mjs [--base-url=http://127.0.0.1:3000]');
}
const localOrigin = new URL(args[0]?.slice('--base-url='.length) || 'http://127.0.0.1:3000');
if (!['http:', 'https:'].includes(localOrigin.protocol)
  || !['localhost', '127.0.0.1', '[::1]'].includes(localOrigin.hostname)
  || localOrigin.username || localOrigin.password
  || localOrigin.pathname !== '/' || localOrigin.search || localOrigin.hash) {
  throw new Error('--base-url must be a loopback origin without credentials, a path, query or fragment.');
}

const routes = [
  { id: 'live', label: 'Live', pathname: '/live', prefixes: ['live', 'prelude', 'scroll'] },
  { id: 'discover', label: 'Découvrir', pathname: '/discover', prefixes: ['discover'] },
  { id: 'library', label: 'Bibliothèque', pathname: '/library', prefixes: ['library', 'collection'] },
  { id: 'ai-library', label: 'Créations IA', pathname: '/ai-library', prefixes: ['ai-library'] },
  { id: 'ai-generator', label: 'AI Generator', pathname: '/ai-generator', prefixes: ['ai-generator', 'generator', 'ai'] },
  { id: 'studio', label: 'Studio', pathname: '/studio', prefixes: ['studio'] },
  { id: 'publish', label: 'Publier', pathname: '/publish', prefixes: ['publish'] },
  { id: 'subscriptions', label: 'Abonnements', pathname: '/subscriptions', prefixes: ['subscriptions', 'subscription', 'membership'] },
  { id: 'settings', label: 'Réglages', pathname: '/settings', prefixes: ['settings'] },
];
const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const normalize = value => value.replaceAll('\\', '/');
const within = (directory, target) => {
  const relative = path.relative(directory, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const localPage = pathname => new URL(pathname, localOrigin).href;
const routeForName = name => {
  const stem = name.toLowerCase().replace(/\.(png|jpe?g|webp)$/i, '');
  return routes.flatMap(route => route.prefixes.map(prefix => ({ route, prefix })))
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find(({ prefix }) => stem === prefix || stem.startsWith(`${prefix}-`) || stem.startsWith(`${prefix}_`))?.route;
};

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const records = Array.isArray(manifest) ? manifest : manifest?.captures;
if (!Array.isArray(records)) throw new Error('The review manifest must be an array of records or an object with a captures array.');
const reviewed = records.filter(record => record?.reviewed === true);
if (reviewed.length === 0) throw new Error('No explicitly reviewed captures were supplied. The gallery was not written.');
const realCaptureDirectory = await fs.realpath(captureDirectory);
const seenPaths = new Set();
const seenNames = new Set();
const captures = [];
for (const record of reviewed) {
  const { name, label, width, height } = record;
  if (typeof name !== 'string' || !name.trim() || typeof label !== 'string' || !label.trim()
    || typeof record.path !== 'string' || !record.path.trim()
    || !Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new Error(`Invalid reviewed capture record: ${JSON.stringify(record)}`);
  }
  const suppliedPath = normalize(record.path);
  const absolutePath = path.isAbsolute(record.path)
    ? path.resolve(record.path)
    : suppliedPath.startsWith('artifacts/chambre-experience/')
      ? path.resolve(workspace, suppliedPath)
      : suppliedPath.startsWith('captures/')
        ? path.resolve(reviewDirectory, suppliedPath)
        : path.resolve(captureDirectory, suppliedPath);
  if (!within(captureDirectory, absolutePath) || !/\.(png|jpe?g|webp)$/i.test(absolutePath)) {
    throw new Error(`Reviewed capture must be a raster file inside artifacts/chambre-experience/captures: ${record.path}`);
  }
  const realPath = await fs.realpath(absolutePath);
  const stat = await fs.stat(realPath);
  if (!within(realCaptureDirectory, realPath) || !stat.isFile() || stat.size === 0) {
    throw new Error(`Reviewed capture is not a nonempty local capture file: ${record.path}`);
  }
  const identity = process.platform === 'win32' ? realPath.toLowerCase() : realPath;
  if (seenPaths.has(identity) || seenNames.has(name)) throw new Error(`Duplicate reviewed capture: ${name}`);
  seenPaths.add(identity);
  seenNames.add(name);
  const relativePath = normalize(path.relative(reviewDirectory, absolutePath));
  const imageUrl = relativePath.split('/').map(encodeURIComponent).join('/');
  const route = routeForName(name);
  captures.push({ name, label, width, height, imageUrl, route });
}

const representedRoutes = routes.filter(route => captures.some(capture => capture.route?.id === route.id));
const navigation = representedRoutes.map(route => `<a href="${escapeHtml(localPage(route.pathname))}">${escapeHtml(route.label)} <span aria-hidden="true">↗</span></a>`).join('');
const figures = captures.map(({ label, width, height, imageUrl, route }, index) => `
<figure class="capture ${width < height ? 'portrait' : 'landscape'}">
  <div class="capture-heading"><span>${String(index + 1).padStart(2, '0')}</span><h2>${escapeHtml(label)}</h2><small>${width} × ${height}</small></div>
  <a class="capture-image" href="${escapeHtml(imageUrl)}" aria-label="${escapeHtml(`Ouvrir la capture : ${label}`)}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}" width="${width}" height="${height}" loading="lazy" decoding="async"></a>
  <figcaption><span>Capture revue · ${width < height ? 'portrait' : 'paysage'}</span>${route ? `<a href="${escapeHtml(localPage(route.pathname))}">Ouvrir ${escapeHtml(route.label)} <span aria-hidden="true">↗</span></a>` : ''}</figcaption>
</figure>`).join('');

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Synaura — Expérience Chambre · revue locale</title>
<style>
:root{color-scheme:light dark;--bg:#f4f5f8;--surface:#fff;--text:#171e2b;--muted:#637084;--line:#d6dce5;--accent:#2f54c6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(1420px,100%);margin:auto;padding:clamp(24px,5vw,68px)}a{color:inherit;text-underline-offset:4px}a:focus-visible{outline:2px solid var(--accent);outline-offset:5px}header{padding-bottom:30px;border-bottom:1px solid var(--line);margin-bottom:34px}.eyebrow{margin:0;color:var(--accent);font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}h1{font-size:clamp(38px,6vw,72px);line-height:1.02;font-weight:500;letter-spacing:-.065em;margin:20px 0}header p:not(.eyebrow){max-width:760px;margin:12px 0;color:var(--muted);font-size:13px}.review-count{font-variant-numeric:tabular-nums}.status{display:inline-flex;align-items:center;gap:9px;border:1px solid var(--line);padding:5px 11px;border-radius:30px;font-size:10px;color:var(--muted)}.status::before{content:"";width:5px;height:5px;border:1px solid var(--accent);border-radius:50%}nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}nav a{display:inline-flex;align-items:center;gap:14px;min-height:44px;padding:9px 15px;border:1px solid var(--line);border-radius:7px;text-decoration:none;font-size:12px}nav a:hover{background:var(--surface);border-color:var(--accent)}.gallery{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:28px;align-items:start}.capture{margin:0;min-width:0;border-top:1px solid var(--line);padding-top:12px}.landscape{grid-column:span 4}.portrait{grid-column:span 2}.capture-heading{display:flex;align-items:baseline;gap:12px;min-height:38px;flex-wrap:wrap;padding-bottom:10px}.capture-heading>span{color:var(--accent);font-size:10px;font-variant-numeric:tabular-nums}.capture-heading h2{margin:0;font-size:13px;font-weight:550;letter-spacing:-.015em}.capture-heading small{margin-left:auto;color:var(--muted);font-size:10px;white-space:nowrap}.capture-image{display:block;padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--surface)}img{display:block;width:100%;height:auto;max-height:760px;object-fit:contain;object-position:top;border-radius:4px}figcaption{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;padding-top:10px;color:var(--muted);font-size:10px}figcaption a{display:inline-flex;align-items:center;gap:8px;min-height:34px;color:var(--text)}footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}footer p{max-width:900px}.manifest-link{word-break:break-word}
@media(prefers-color-scheme:dark){:root{--bg:#080c13;--surface:#0e1521;--text:#e5ecf8;--muted:#97a6bd;--line:#273448;--accent:#95b6ff}}
@media(max-width:850px){.gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.landscape{grid-column:1/-1}.portrait{grid-column:span 1}}
@media(max-width:520px){.gallery{grid-template-columns:1fr}.capture{grid-column:1}main{padding:24px 18px}.capture-heading{gap:8px}img{max-height:none}.portrait .capture-image{max-width:390px;margin-inline:auto}h1{font-size:42px}nav{gap:6px}nav a{padding-inline:12px}}
@media(prefers-reduced-motion:no-preference){nav a{transition:background-color 160ms,border-color 160ms}}
</style>
</head>
<body><main>
<header><p class="eyebrow">Synaura / Expérience Chambre</p><h1>Le produit,<br>en situation.</h1><span class="status">Candidate locale · revue visuelle</span><p>Une sélection explicite de <span class="review-count">${captures.length}</span> capture${captures.length > 1 ? 's' : ''} marquée${captures.length > 1 ? 's' : ''} comme revue${captures.length > 1 ? 's' : ''}. Chaque image provient du manifeste de validation ; les autres fichiers du dossier ne sont pas inclus.</p><p>Ces images montrent uniquement les états capturés. Elles ne certifient ni les transactions (achat, génération payante, publication), ni les performances, ni les états de compte absents de la sélection.</p>${navigation ? `<nav aria-label="Ouvrir les pages de la candidate locale">${navigation}</nav>` : ''}</header>
<section class="gallery" aria-label="Captures explicitement revues">${figures}</section>
<footer><p><a class="manifest-link" href="capture-review.json">Consulter le manifeste de revue</a> · Les liens d’application ciblent ${escapeHtml(localOrigin.origin)}. Leur ouverture suppose que la candidate locale soit déjà disponible.</p><p>Cette galerie ne déclenche aucune action de création, d’achat ou de publication. Sa génération ne lance aucun navigateur ni serveur.</p></footer>
</main></body></html>`;

await fs.writeFile(outputPath, html, 'utf8');
console.log(JSON.stringify({ gallery: outputPath, reviewedCaptures: captures.length, ignoredUnreviewedRecords: records.length - reviewed.length, localOrigin: localOrigin.origin }));

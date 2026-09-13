import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';

const root = process.cwd();
const beforeRoot = 'artifacts/suno-v6/before';
async function walk(folder) {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(folder, entry.name)) : path.join(folder, entry.name)))).flat();
}
const slash = name => name.replaceAll('\\', '/');
const prior = (await walk(beforeRoot)).map(file => slash(path.relative(beforeRoot, file)));
const added = ['lib/sunoModels.ts', 'lib/sunoGeneratorForm.ts', 'components/ai-studio/SunoV6Announcement.tsx',
  'tests/suno-v6-models.test.mjs', 'tests/suno-v6-backend.test.mjs', 'tests/suno-v6-generator.test.mjs',
  'tests/suno-v6-studio.test.mjs', 'tests/suno-v6-preservation.test.mjs', 'tests/helpers/reviewed-suno-v6.mjs',
  'tests/chambre-creation-redesign.test.mjs', 'tests/chambre-signature-creation.test.mjs',
  'tests/experience-creation.test.mjs', 'tests/chambre-music-redesign.test.mjs',
  'scripts/suno-v6-gate.mjs', 'scripts/suno-v6-review.mjs', 'docs/suno-v6-migration.md'];
const files = [...new Set([...prior, ...added])].sort();
const configured = dotenv.parse(await fs.readFile('.env.local'));
const privateValues = Object.entries(configured).filter(([key, value]) => /SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY|DATABASE_URL/.test(key) && value.length >= 12).map(([, value]) => value);
const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /postgres(?:ql)?:\/\/[^\s:'"/]+:[^\s@'"/]+@/, /\bsk_live_[A-Za-z0-9]{12,}/];
const findings = [];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const changes = [];
for (const file of files) {
  const source = await fs.readFile(path.join(root, file), 'utf8');
  if (privateValues.some(value => source.includes(value)) || patterns.some(pattern => pattern.test(source))) findings.push(file);
  if (prior.includes(file)) {
    const previous = await fs.readFile(path.join(beforeRoot, file), 'utf8');
    if (hash(previous) !== hash(source)) changes.push({ file, before: hash(previous), after: hash(source) });
  }
}
let diffCheck = true;
try { execFileSync('git', ['diff', '--check'], { stdio: 'pipe', windowsHide: true }); } catch { diffCheck = false; }
const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/).filter(Boolean);
const result = { checkedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(), filesChecked: files.length, secretFindings: findings, diffCheck, staged, changes };
await fs.writeFile('artifacts/suno-v6/review.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ filesChecked: files.length, changedFromPreV6: changes.length, secretFindings: findings, diffCheck, staged }));
process.exitCode = findings.length || !diffCheck || staged.length ? 1 : 0;

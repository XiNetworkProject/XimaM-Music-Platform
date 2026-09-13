/** Read-only source/index checks; writes only its local audit report. Never stages. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', ['-c', 'core.safecrlf=false', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const baseline = 'd0ac45379227b4ad86042b6b8eb2156535f1b817';
const report = { checkedAt: new Date().toISOString(), baseline, head: git('rev-parse', 'HEAD').trim(), tag: git('rev-parse', 'synaura-live-4b-baseline^{}').trim(), staged: git('diff', '--cached', '--name-only').trim().split('\n').filter(Boolean), diffCheck: false, sourceFiles: [], secretFindings: [], protectedContracts: [], limitations: ['Heuristic scan of candidate additions, not a guarantee about all historical repository content.', 'Pre-existing user/native/docs changes are not attributed to V2 or reverted.'] };
const preexisting = new Set(['PLAY_STORE.md', 'capacitor.config.ts', 'docs/aura-performance-accessibility-phase4b8.md', 'docs/fixes/community-posts-500.md', 'docs/live-experience-phase4b-final.md']);
const isCandidate = file => !preexisting.has(file) && /^(app|components|lib|public|tests)\//.test(file) || /^scripts\/synaura-v2-/.test(file) || /^docs\/synaura-v2-/.test(file);
const modified = git('diff', '--name-only', '-z').split('\0').filter(Boolean).filter(isCandidate);
const created = git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean).filter(isCandidate);
const checks = [
  ['private-key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{45,})\b/],
  ['stripe-secret', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/],
  ['jwt-literal', /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\b/],
  ['credential-literal', /(?:DATABASE_URL|AUTH_SECRET|API_SECRET|PRIVATE_KEY|CLIENT_SECRET)\s*[:=]\s*['"][^'"\r\n]{18,}['"]/],
  ['postgres-credential-url', /postgres(?:ql)?:\/\/[^\s:'"]+:[^\s@'"]+@(?!localhost|127\.0\.0\.1|example\.)/],
];
for (const file of [...new Set([...modified, ...created])].sort()) {
  const additions = created.includes(file) ? await fs.readFile(file, 'utf8') : git('diff', '--no-ext-diff', '--unified=0', '--', file).split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).map(line => line.slice(1)).join('\n');
  report.sourceFiles.push(file);
  for (const [kind, regex] of checks) if (regex.test(additions)) report.secretFindings.push({ file, kind }); // Never output matching values.
}
for (const target of ['app/api', 'database', 'lib/audio/AudioCore.ts', 'lib/authOptions.ts', 'middleware.ts', 'package.json', 'package-lock.json']) {
  report.protectedContracts.push({ target, unchanged: git('diff', '--name-only', '--', target).trim() === '' });
}
try { git('diff', '--check'); report.diffCheck = true; } catch { report.diffCheck = false; }
report.status = report.head === baseline && !report.staged.length && report.diffCheck && !report.secretFindings.length && report.protectedContracts.every(x => x.unchanged) ? 'PASS_SOURCE_ONLY' : 'REVIEW_REQUIRED';
await fs.mkdir(path.resolve('artifacts/synaura-v2'), { recursive: true });
await fs.writeFile(path.resolve('artifacts/synaura-v2/local-gate.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, head: report.head, staged: report.staged.length, diffCheck: report.diffCheck, filesScanned: report.sourceFiles.length, findings: report.secretFindings, protectedContracts: report.protectedContracts }, null, 2));
if (report.status !== 'PASS_SOURCE_ONLY') process.exitCode = 1;

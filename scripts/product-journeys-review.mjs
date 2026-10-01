// Read-only candidate checks. Never stages, prints secret values or deploys.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
const scope = [
  'app/ai-generator/page.tsx','app/api/billing/verify-checkout/route.ts',
  'app/api/recommendations/taste/route.ts','app/community/forum/new/page.tsx',
  'app/settings/SettingsClient.tsx','app/subscriptions/success/page.tsx',
  'components/actions/ActionsSurface.tsx','components/ai-studio/UnifiedStudio.tsx',
  'components/clips/ClipUploadIndicator.tsx','hooks/useAudioService.ts',
  'hooks/useBackgroundGeneration.ts','lib/clientClipUploadQueue.ts',
  'lib/clientMediaUpload.ts','lib/playbackMeasurement.ts','lib/textDraft.ts',
  'lib/subscriptionConfirmation.ts','scripts/product-journeys-readonly.mjs',
  'scripts/product-journeys-review.mjs','scripts/creator-analytics-postgres-fixtures.mjs',
  'tests/product-journeys.test.mjs','tests/creator-analytics.test.mjs',
  'components/onboarding/OnboardingGate.tsx','tests/session-gate-recovery.test.mjs',
  'tests/generation-recovery.test.mjs',
  'tests/helpers/product-journeys-reviewed.json','tests/helpers/reviewed-product-journeys.mjs',
  'tests/helpers/reviewed-unified-studio.mjs','tests/helpers/reviewed-live-media.mjs',
  'tests/experience-account.test.mjs','tests/suno-v6-models.test.mjs',
  'tests/chambre-personal-redesign.test.mjs','docs/product-journeys-hardening.md',
  'docs/creator-analytics-redesign.md'
];
for(const directory of ['app/api/stats/creator','app/dev/stats','components/analytics','components/recovery','components/recommendations','lib/creatorAnalytics']) {
  for(const name of readdirSync(directory)) if(/\.(tsx?|css|mjs)$/.test(name)) scope.push(`${directory}/${name}`);
}
const env=Object.assign({}, ...['.env','.env.local'].filter(existsSync).map(file=>dotenv.parse(readFileSync(file))));
const secrets=Object.entries(env).filter(([key,value])=>/SECRET|PASSWORD|TOKEN|PRIVATE_KEY|SERVICE_ROLE|DATABASE_URL|API_KEY/.test(key)&&value.length>=16).map(([,value])=>value);
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:sk_live_|sk_test_|ghp_|github_pat_)[A-Za-z0-9_]{20,}/,/postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/];
const findings=[];
for(const file of scope) {
  const text=readFileSync(file,'utf8');
  if(secrets.some(value=>text.includes(value))) findings.push({file,kind:'environment-secret'});
  text.split(/\r?\n/).forEach((line,index)=>{if(patterns.some(pattern=>pattern.test(line)))findings.push({file,line:index+1,kind:'credential-pattern'});});
}
const git=args=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});
let whitespace=true;try{git(['diff','--check']);}catch{whitespace=false;}
const staged=git(['diff','--cached','--name-only']).trim().split(/\r?\n/).filter(Boolean);
console.log(JSON.stringify({filesChecked:scope.length,secretFindings:findings,diffCheck:whitespace,staged,scope:'Product-journey candidate files only; heuristic, not a repository-wide certification.'},null,2));
if(findings.length||!whitespace||staged.length)process.exitCode=1;

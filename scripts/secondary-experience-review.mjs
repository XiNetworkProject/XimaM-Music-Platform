// Read-only review of this visual candidate, never staging or exposing credentials.
import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import dotenv from 'dotenv';
import {secondaryPaths} from '../tests/helpers/secondary-presentation.mjs';

const scope = [...secondaryPaths,
  'app/layout.tsx', 'lib/unifiedNavigation.ts',
  'components/experience/secondary-experience.css',
  'components/clips/PublicClipVideo.tsx',
  'tests/secondary-experience.test.mjs',
  'tests/helpers/secondary-presentation.mjs',
  'tests/helpers/secondary-presentation-baseline.json',
  'tests/helpers/reviewed-product-journeys.mjs',
  'tests/chambre-signature-foundation.test.mjs',
  'tests/chambre-creation-redesign.test.mjs',
  'scripts/secondary-experience-review.mjs',
  'docs/secondary-experience-redesign.md',
];
const env = Object.assign({}, ...['.env','.env.local'].filter(existsSync).map(file=>dotenv.parse(readFileSync(file))));
const secrets = Object.entries(env).filter(([key,value])=>/SECRET|PASSWORD|TOKEN|PRIVATE_KEY|SERVICE_ROLE|DATABASE_URL|API_KEY/.test(key) && value.length>=8).map(([,value])=>value);
const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\b(?:sk_live_|sk_test_|ghp_|github_pat_)[A-Za-z0-9_]{20,}/, /postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/];
const findings=[];
for (const file of scope) {
  const source = readFileSync(file,'utf8');
  if (secrets.some(value=>source.includes(value))) findings.push({file,kind:'environment-value'});
  source.split(/\r?\n/).forEach((line,index)=>{
    if(patterns.some(pattern=>pattern.test(line))) findings.push({file,line:index+1,kind:'credential-pattern'});
  });
}
const git = args=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});
let diffCheck=true;
try { git(['diff','--check']); } catch { diffCheck=false; }
const staged=git(['diff','--cached','--name-only']).trim().split(/\r?\n/).filter(Boolean);
console.log(JSON.stringify({filesChecked:scope.length,findings,diffCheck,staged,scope:'Visual candidate source only; heuristic scan, not a repository-wide certification.'},null,2));
if(findings.length || !diffCheck || staged.length) process.exitCode=1;

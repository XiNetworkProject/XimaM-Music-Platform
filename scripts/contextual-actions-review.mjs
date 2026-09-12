// Read-only candidate scope and secret review. Does not stage, commit or deploy.
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
const scope = [
  'app/discover/DiscoverTiles.tsx','app/globals.css','app/layout.tsx','app/library/LibraryClient.tsx',
  'app/profile/[username]/page.tsx','app/providers.tsx','app/search/page.tsx','app/track/[id]/TrackPageClient.tsx',
  'components/FullScreenPlayer.tsx','components/QueueBubble.tsx','components/QueueDialog.tsx','components/TrackContextMenu.tsx',
  'components/TrackCreateRemixActions.tsx','components/comments/CommentsSurface.tsx','components/home/SynauraScroll.tsx',
  'components/profile/ProfilePeekSurface.tsx','components/ui/SynauraOverlay.tsx','contexts/LikeContext.tsx',
  'lib/contextSurfaces.ts','lib/primaryNavigation.ts','lib/organizationClient.ts','lib/trackActions.ts',
  'tests/audio-integration-phase2b.test.mjs','tests/contextual-actions-phase4b5.test.mjs',
  'scripts/contextual-actions-gate.mjs','scripts/contextual-actions-production-perf.mjs','scripts/contextual-actions-review.mjs','docs/contextual-actions-phase4b5.md',
];
for (const name of await fs.readdir('components/actions')) scope.push('components/actions/' + name);
const artifacts = (await fs.readdir('docs/contextual-actions-phase4b5-captures')).filter(n=>/\.(json|txt|md)$/.test(n)).map(n=>'docs/contextual-actions-phase4b5-captures/'+n);
const env = dotenv.parse(await fs.readFile('.env.local'));
const secrets = Object.entries(env).filter(([key,value])=>/SECRET|PASSWORD|TOKEN|PRIVATE_KEY|SERVICE_ROLE|DATABASE_URL/.test(key)&&value.length>=16).map(([,value])=>value);
const hits=[];
for(const name of [...scope,...artifacts]) {
  const text=await fs.readFile(name,'utf8');
  if(secrets.some(secret=>text.includes(secret))) hits.push({file:name,kind:'environment secret value'});
  if(/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|\bsk_live_[A-Za-z0-9]{16,}|\bghp_[A-Za-z0-9]{30,}/.test(text)) hits.push({file:name,kind:'credential pattern'});
}
const git = args => execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const protectedChanges=git(['diff','--name-only','--','lib/audio','app/api','database']);
const staged=git(['diff','--name-only','--cached']);
const whitespace=git(['diff','--check','--',...scope]);
console.log(JSON.stringify({head:git(['rev-parse','HEAD']),candidateFiles:scope,artifactsReviewed:artifacts.length,secretHits:hits,protectedChanges,staged,whitespace},null,2));
if(hits.length||protectedChanges||staged||whitespace)process.exitCode=1;

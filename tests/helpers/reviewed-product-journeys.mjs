import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { projectProductHints } from './reviewed-product-hints.mjs';
// Explicit reviewed deltas only. Older visual snapshots remain unchanged.
// New behavior is executed in product-journeys and PostgreSQL fixtures.
const changes=JSON.parse(readFileSync(new URL('./product-journeys-reviewed.json',import.meta.url),'utf8'));
export function projectProductJourneys(file,raw){
 if(typeof raw!=='string')return raw;
 let source=projectProductHints(file,raw).replaceAll('\r\n','\n');
 // Presentation-only wrapper approved by the subsequent secondary-pages redraw.
 // Normalize this exact class extension, never handlers or draft recovery code.
 if(file==='app/community/forum/new/page.tsx') source=source.replace('className="space-y-5 pb-36 sm:pb-28 experience-refresh community-refresh compose-refresh"','className="space-y-5 pb-36 sm:pb-28"');
 const hunks=changes[file];
 if(!hunks || !hunks.some(h=>source.includes(h.from)))return source;
 for(const h of hunks){assert.equal(source.split(h.from).length,2,`${file}: exact reviewed product-journey change`);source=source.replace(h.from,h.to);}
 return source;
}

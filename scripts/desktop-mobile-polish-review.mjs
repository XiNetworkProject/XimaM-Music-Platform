// Assemble the local review set from real screenshots; no generated/retouched UI.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer';
const root='artifacts/polish-phase4b6',out='docs/desktop-mobile-polish-phase4b6-captures';
await fs.mkdir(out,{recursive:true});
const widths=[1440,1920,390,768];
const names=['live','discover','search','track','profile','library','playlist','notifications','messages','create','ai','studio','profile-peek','conversation','moments','options','playlist-picker','queue','lyrics','details'];
const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Synaura — revue 4B.6</title><style>body{font:16px system-ui;margin:0;background:#151515;color:#f7f6f3}header{padding:24px;position:sticky;top:0;background:#151515;z-index:1;border-bottom:1px solid #444}h1{font-size:24px;margin:0 0 12px}select{font:inherit;padding:8px;background:#252525;color:inherit;border:1px solid #666;border-radius:8px}main{padding:24px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}figure{margin:0;min-width:0}img{width:100%;height:auto;display:block;border:1px solid #555}figcaption{padding:12px 0}section{margin-bottom:40px}[hidden]{display:none!important}a{color:#ccc}p{line-height:1.5}</style><header><h1>Synaura — Phase 4B.6 · Candidate locale</h1><label>Format <select id="width">${widths.map(w=>`<option>${w}</option>`).join('')}</select></label> <label>Surface <select id="surface"><option value="all">Toutes</option>${names.map(n=>`<option>${n}</option>`).join('')}</select></label><p>Avant : production 4B.5. Après : build production local. Données vivantes : classement et compteurs peuvent varier. Android/Gboard et NVDA réels non testés. Aucun déploiement.</p></header><main>${widths.flatMap(w=>names.map(n=>`<section data-width="${w}" data-name="${n}"><h2>${n} · ${w}px</h2><div class="pair">${['before','after'].map(phase=>`<figure><figcaption>${phase==='before'?'Avant — production':'Après — candidate locale'}</figcaption><a href="../../${root}/${phase}/${n}-${w}.png"><img loading="lazy" alt="${n} ${phase}, ${w}px" src="../../${root}/${phase}/${n}-${w}.png"></a></figure>`).join('')}</div></section>`)).join('')}</main><script>const width=document.querySelector('#width'),surface=document.querySelector('#surface');function update(){document.querySelectorAll('section').forEach(s=>s.hidden=s.dataset.width!==width.value||(surface.value!=='all'&&s.dataset.name!==surface.value));}width.onchange=surface.onchange=update;update();</script></html>`;
await fs.writeFile(out+'/review.html',html);
const b=await puppeteer.launch({headless:true});const p=await b.newPage();
await p.goto(pathToFileURL(path.resolve(out,'review.html')).href);
try{for(const w of [1440,390]){
  const pair=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#151515;color:#fff;font:16px system-ui}.pair{display:flex;gap:16px}figure{margin:0;width:${w}px}img{width:100%;display:block}figcaption{padding:16px}</style><div class="pair">${['before','after'].map(phase=>`<figure><figcaption>${phase==='before'?'Avant — production 4B.5':'Après — candidate 4B.6'} · ${w}px</figcaption><img src="${pathToFileURL(path.resolve(root,phase,'live-'+w+'.png')).href}"></figure>`).join('')}</div>`;
  await p.setViewport({width:w*2+16,height:w===390?900:960});await p.setContent(pair);await p.waitForFunction(()=>[...document.images].every(i=>i.complete));
  await p.screenshot({path:out+'/live-comparison-'+w+'.png',fullPage:true});
}}finally{await b.close();}
console.log(out+'/review.html');

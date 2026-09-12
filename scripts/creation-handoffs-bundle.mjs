import fs from 'node:fs/promises';
import zlib from 'node:zlib';
const manifest=JSON.parse(await fs.readFile('.next/app-build-manifest.json','utf8'));
const files=[...new Set(manifest.pages['/live/page'])];
const chunks=await Promise.all(files.map(async file=>{const data=await fs.readFile('.next/'+file);return {file,bytes:data.length,gzip:zlib.gzipSync(data).length};}));
const result={chunks,bytes:chunks.reduce((s,c)=>s+c.bytes,0),gzip:chunks.reduce((s,c)=>s+c.gzip,0)};
await fs.mkdir('artifacts/handoffs-phase4b7',{recursive:true});
await fs.writeFile(`artifacts/handoffs-phase4b7/bundle-${process.argv[2]||'candidate'}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({bytes:result.bytes,gzip:result.gzip}));

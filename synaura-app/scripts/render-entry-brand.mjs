import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { MARK_ORBIT, MARK_S } from '../src/brand/mark.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'src/assets/entry');
await fs.mkdir(output, { recursive: true });
const paths = `<path d="${MARK_ORBIT}" stroke-width="1.6"/><path d="${MARK_S}" stroke-width="3.3"/><circle cx="85" cy="20" r="2.8" fill="#f5f6ff" stroke="none"/>`;
function svg(padding = 0, background = false) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100"><defs><radialGradient id="a"><stop stop-color="#334a89"/><stop offset="1" stop-color="#060810"/></radialGradient></defs>${background ? '<rect width="100" height="100" fill="url(#a)"/>' : ''}<g transform="translate(${padding} ${padding}) scale(${(100 - padding * 2) / 100})" fill="none" stroke="#f5f6ff" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`);
}
for (const [name, size, pad, bg] of [['launcher',1024,18,true],['adaptive-foreground',1024,23,false],['splash',512,8,false],['notification',96,3,false]]) {
  await sharp(svg(pad,bg)).resize(size,size).png().toFile(path.join(output, `${name}.png`));
}
// Do not run prebuild --clean: preserve local signing and native customizations.
if (process.argv.includes('--android')) {
  const res = path.join(root, 'android/app/src/main/res');
  for (const [density, scale] of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]) {
    const mipmap = path.join(res, `mipmap-${density}`);
    const drawable = path.join(res, `drawable-${density}`);
    await fs.mkdir(mipmap,{recursive:true}); await fs.mkdir(drawable,{recursive:true});
    for (const name of ['ic_launcher','ic_launcher_round']) await sharp(svg(18,true)).resize(Math.round(48*scale)).webp({lossless:true}).toFile(path.join(mipmap,`${name}.webp`));
    await sharp(svg(23,false)).resize(Math.round(108*scale)).webp({lossless:true}).toFile(path.join(mipmap,'ic_launcher_foreground.webp'));
    await sharp(svg(8,false)).resize(Math.round(140*scale)).png().toFile(path.join(drawable,'splashscreen_logo.png'));
    await sharp(svg(3,false)).resize(Math.round(24*scale)).png().toFile(path.join(drawable,'notification_icon.png'));
  }
}
console.log('Entry vector assets rendered; no signing data read or changed.');

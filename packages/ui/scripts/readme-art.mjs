// Renders the README banner (also the GitHub social preview) and the download
// buttons from HTML, using the app's own font, logo and shoreline colours.
//
//   cd packages/ui
//   node scripts/readme-screenshots.mjs   # first: the banner embeds rules-light.png
//   node scripts/readme-art.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ui = path.resolve(here, '..');
const assets = path.resolve(ui, '../../assets');
const dataUri = (p, type) => `data:${type};base64,${readFileSync(p).toString('base64')}`;

const font = `@font-face { font-family: Sora; font-weight: 100 800;
  src: url(${dataUri(path.join(ui, 'node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2'), 'font/woff2')}) format('woff2'); }`;
const logo = readFileSync(path.join(ui, 'public/harbor.svg'), 'utf8')
  .replace('width="1024" height="1024"', 'viewBox="0 0 1024 1024" width="100%" height="100%"');
const shot = dataUri(path.join(assets, 'screenshots/rules-light.png'), 'image/png');

const banner = `<!doctype html><html><head><style>${font}
* { margin: 0; box-sizing: border-box; }
body { width: 1280px; height: 640px; overflow: hidden; position: relative; font-family: Sora, sans-serif;
  color: #12242c; background: #e9f1f0; }
.shore { position: absolute; inset: -160px; filter: blur(80px) saturate(1.05); }
.shore i { position: absolute; border-radius: 50%; }
.sand { left: -8%; top: 52%; width: 56%; height: 66%; background: #f3e2bf; }
.foam { left: 4%; top: -6%; width: 44%; height: 40%; background: #fbf2dc; }
.shallows { left: 2%; top: 22%; width: 52%; height: 40%; background: #8fdacd; opacity: .8; }
.sea { left: 42%; top: 6%; width: 66%; height: 66%; background: #4cadbf; }
.deep { left: 70%; top: -10%; width: 46%; height: 52%; background: #227d9a; }
.bay { left: 50%; top: 64%; width: 62%; height: 52%; background: #7fd0cf; }
.copy { position: absolute; left: 80px; top: 0; bottom: 0; width: 560px; display: flex;
  flex-direction: column; justify-content: center; }
.brand { display: flex; align-items: center; gap: 18px; margin-bottom: 40px; }
.brand .mark { width: 84px; height: 84px; }
.brand span { font-size: 44px; font-weight: 650; letter-spacing: -1px; }
h1 { font-size: 46px; line-height: 1.14; font-weight: 600; letter-spacing: -1.4px; }
p { margin-top: 22px; font-size: 22px; line-height: 1.5; color: #2f454e; }
.chips { margin-top: 30px; display: flex; gap: 10px; }
.chips b { font-weight: 500; font-size: 16px; padding: 8px 15px; border-radius: 999px;
  background: rgba(255,255,255,.62); border: 1px solid rgba(255,255,255,.85); color: #08656f; }
.app { position: absolute; left: 650px; top: 92px; width: 760px; border-radius: 20px; overflow: hidden;
  border: 1px solid rgba(255,255,255,.8);
  box-shadow: 0 40px 80px -24px rgba(6,58,72,.45), 0 10px 24px -8px rgba(6,58,72,.25); }
.app img { display: block; width: 100%; }
</style></head><body>
<div class="shore"><i class="sand"></i><i class="foam"></i><i class="shallows"></i><i class="sea"></i><i class="deep"></i><i class="bay"></i></div>
<div class="app"><img src="${shot}"></div>
<div class="copy">
  <div class="brand"><div class="mark">${logo}</div><span>Harbor</span></div>
  <h1>Your Downloads folder, tidy on its own.</h1>
  <p>Set a few rules once. Harbor moves each new download to the right folder.</p>
  <div class="chips"><b>Free &amp; open source</b><b>Windows</b><b>macOS</b></div>
</div>
</body></html>`;

const download = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>`;
const button = (title, sub) => `<!doctype html><html><head><style>${font}
* { margin: 0; box-sizing: border-box; }
html, body { background: transparent; }
body { padding: 6px; display: inline-block; font-family: Sora, sans-serif; }
.btn { width: 320px; height: 72px; border-radius: 16px; display: flex; align-items: center; gap: 16px;
  padding: 0 22px; color: #fff; background: linear-gradient(180deg, #0f7d8a, #0a6f7b 55%, #08626d);
  border: 1px solid rgba(255,255,255,.22); box-shadow: inset 0 1px 0 rgba(255,255,255,.22); }
.btn svg { width: 28px; height: 28px; flex: none; }
.t { font-size: 19px; font-weight: 600; letter-spacing: -.2px; line-height: 1.2; }
.s { font-size: 13.5px; opacity: .86; margin-top: 3px; }
</style></head><body><div class="btn">${download}<div><div class="t">${title}</div><div class="s">${sub}</div></div></div></body></html>`;

const browser = await chromium.launch();
async function render(html, file, viewport, { selector, scale = 1 } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const target = selector ? page.locator(selector) : page;
  await target.screenshot({ path: path.join(assets, file), omitBackground: true });
  console.log('wrote assets/' + file);
  await page.close();
}
await render(banner, 'social-preview.png', { width: 1280, height: 640 });
await render(button('Download for Windows', '64-bit installer · .exe'), 'download-windows.png',
  { width: 400, height: 120 }, { selector: '.btn', scale: 2 });
await render(button('Download for macOS', 'Universal .dmg · macOS 15+'), 'download-macos.png',
  { width: 400, height: 120 }, { selector: '.btn', scale: 2 });
await browser.close();

#!/usr/bin/env node
/*
 * Renders the LUMÉ Play Store assets via headless Chromium (Playwright).
 *
 *   Phone screenshots  1080×2160  → assets/store/screenshots/play/en/0N-*.png
 *   7" tablet shots    1200×1920  → .../en/tablet-7/0N-*.png   (phone composite)
 *   10" tablet shots   1600×2560  → .../en/tablet-10/0N-*.png  (phone composite)
 *   Feature graphic    1024×500   → assets/store/play-feature-graphic.png
 *   Hi-res icon        1024×1024  → assets/store/icon-1024.png
 *   Adaptive fg        1024×1024  → assets/store/icon-foreground.png (transparent)
 *
 * Playwright is resolved from the global install (npm root -g) so it doesn't
 * bloat the app's dependencies. Run from repo root:
 *   node scripts/store-assets/capture.mjs
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
const require = createRequire(`${globalRoot}/_/`);
const { chromium } = require('playwright');

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const OUT = join(REPO_ROOT, 'assets', 'store');

const SCREENS = [
  { id: 'choose', file: 'hero.html', index: 1 },
  { id: 'criteria', file: 'criteria.html', index: 2 },
  { id: 'top-three', file: 'result.html', index: 3 },
  { id: 'premium', file: 'premium.html', index: 4 },
];
const PHONE_W = 1080, PHONE_H = 2160;   // exactly 1:2, Play's max aspect
const TABLETS = [
  { label: 'tablet-7', width: 1200, height: 1920, phoneScale: 0.86 },
  { label: 'tablet-10', width: 1600, height: 2560, phoneScale: 0.9 },
];

const ensureDir = async (p) => { if (!existsSync(p)) await mkdir(p, { recursive: true }); };

async function shoot(page, file, out, w, h, omit = false) {
  await page.goto(`file://${join(__dirname, file)}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h }, omitBackground: omit });
  console.log('✓ ' + out.replace(REPO_ROOT + '/', ''));
}

async function main() {
  const browser = await chromium.launch();

  // ---- phone screenshots ----
  const phoneDir = join(OUT, 'screenshots', 'play', 'en');
  await ensureDir(phoneDir);
  const ctx = await browser.newContext({ viewport: { width: PHONE_W, height: PHONE_H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const s of SCREENS) {
    const out = join(phoneDir, `${String(s.index).padStart(2, '0')}-${s.id}.png`);
    await shoot(page, s.file, out, PHONE_W, PHONE_H);
  }
  await ctx.close();

  // ---- tablet composites (phone shot on a branded canvas) ----
  for (const t of TABLETS) {
    const phoneH = Math.round(t.height * t.phoneScale);
    const phoneW = Math.round(PHONE_W * phoneH / PHONE_H);
    const outDir = join(OUT, 'screenshots', 'play', 'en', t.label);
    await ensureDir(outDir);
    const tctx = await browser.newContext({ viewport: { width: t.width, height: t.height }, deviceScaleFactor: 1 });
    const tpage = await tctx.newPage();
    for (const s of SCREENS) {
      const phoneFile = join(phoneDir, `${String(s.index).padStart(2, '0')}-${s.id}.png`);
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
        html,body{margin:0;width:${t.width}px;height:${t.height}px}
        body{background:radial-gradient(at 20% 12%,rgba(124,92,255,0.16),transparent 55%),radial-gradient(at 82% 88%,rgba(124,92,255,0.10),transparent 55%),#0b0b0f;display:flex;align-items:center;justify-content:center}
        .p{width:${phoneW}px;height:${phoneH}px;border-radius:44px;overflow:hidden;background:#0b0b0f;box-shadow:0 30px 90px rgba(0,0,0,0.45),0 8px 24px rgba(0,0,0,0.3)}
        .p img{width:100%;height:100%;display:block}
      </style></head><body><div class="p"><img src="file://${phoneFile}"/></div></body></html>`;
      const tmp = join(__dirname, `.tmp.${t.label}.${s.id}.html`);
      await writeFile(tmp, html, 'utf8');
      await tpage.goto(`file://${tmp}`, { waitUntil: 'networkidle' });
      await tpage.evaluate(() => { const i = document.querySelector('img'); return i.complete ? 0 : new Promise(r => (i.onload = r)); });
      const out = join(outDir, `${String(s.index).padStart(2, '0')}-${s.id}.png`);
      await tpage.screenshot({ path: out, clip: { x: 0, y: 0, width: t.width, height: t.height } });
      console.log('✓ ' + out.replace(REPO_ROOT + '/', ''));
      await unlink(tmp).catch(() => {});
    }
    await tctx.close();
  }

  // ---- feature graphic ----
  await ensureDir(OUT);
  {
    const c = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    const p = await c.newPage();
    await shoot(p, 'feature-graphic.html', join(OUT, 'play-feature-graphic.png'), 1024, 500);
    await c.close();
  }

  // ---- icons ----
  {
    const c = await browser.newContext({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
    const p = await c.newPage();
    await shoot(p, 'icon.html', join(OUT, 'icon-1024.png'), 1024, 1024);
    await shoot(p, 'icon-foreground.html', join(OUT, 'icon-foreground.png'), 1024, 1024, true);
    await c.close();
  }

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

// Read-only phone screenshots of azza.academy pages with the cookie banner already answered ("only necessary").
//   node capture-clean.js <url> <outDir> <prefix> [--full]
// Saves <prefix>-NN.png down the page (430px wide @2.5x) and, with --full, <prefix>-full.png. Never types or submits.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const [url, out, prefix = 'shot'] = process.argv.slice(2);
const full = process.argv.includes('--full');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 430, height: 932, deviceScaleFactor: 2.5 });
  const { hostname } = new URL(url);
  await p.setCookie({ name: 'azza_consent', value: 'necessary', domain: hostname, path: '/' });
  await p.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  const height = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 400) { await p.evaluate((y) => window.scrollTo(0, y), y); await wait(200); }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  let i = 0;
  for (let y = 0; y < height; y += 800) {
    await p.evaluate((y) => window.scrollTo(0, y), y); await wait(600);
    await p.screenshot({ path: path.join(out, `${prefix}-${String(++i).padStart(2, '0')}.png`) });
  }
  if (full) {
    await p.evaluate(() => {
      window.scrollTo(0, 0);
      for (const el of document.querySelectorAll('*')) {
        const s = getComputedStyle(el);
        if (s.position === 'fixed') el.style.display = 'none';
        if (s.position === 'sticky') el.style.position = 'static';
      }
    });
    await wait(500);
    await p.screenshot({ path: path.join(out, `${prefix}-full.png`), fullPage: true });
  }
  console.log(`${prefix}: ${i} shots, page height ${height}px`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

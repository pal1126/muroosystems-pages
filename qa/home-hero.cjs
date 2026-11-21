const assert = require('node:assert/strict');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch({channel:'chrome'});
  try {
    for (const lang of ['ja', 'en']) {
      for (const [width, dpr] of [[390,1], [390,2], [768,1], [1440,2]]) {
        const page = await browser.newPage({viewport:{width,height:900}, deviceScaleFactor:dpr});
        const requested = [];
        page.on('request', req => { if (/\/assets\/modular(?:-|\.)/.test(new URL(req.url()).pathname)) requested.push(req.url()); });
        await page.goto('http://localhost:8123/muroosystems-pages/' + lang + '/');
        const data = await page.locator('.hf-hero-visual img').evaluate(async img => {
          await img.decode();
          return {url:img.currentSrc, alt:img.alt, width:img.clientWidth};
        });
        assert.ok(data.alt && data.width > 0);
        assert.match(data.url, /modular-\d+\.webp$/);
        assert.deepEqual(requested, [data.url]);
        if (width === 390) assert.ok(data.url.endsWith(dpr === 1 ? '-480.webp' : '-800.webp'));
        console.log('Hero verified', lang, width, dpr, new URL(data.url).pathname);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});

const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch({channel: 'chrome'});
  try {
    const page = await browser.newPage();
    for (const lang of ['ja', 'en']) {
      for (const route of ['company', 'projects', 'business', 'contact']) {
        const path = '/muroosystems-pages/' + lang + '/' + route + '/';
        await page.goto('http://localhost:8123' + path);
        await page.emulateMedia({media: 'print'});
        assert.ok(await page.locator('.site-header').isHidden());
        assert.ok(await page.locator('h1').first().isVisible());
        if (route === 'contact') assert.ok(await page.locator('.unified-contact a').first().isVisible());
        const pdf = await page.pdf({preferCSSPageSize: true, printBackground: false});
        const text = execFileSync('pdftotext', ['-layout', '-', '-'], {input: pdf, encoding: 'utf8'});
        assert.ok(text.includes('Muroosystems Corporation'), path);
        assert.ok(text.includes('https://pal1126.github.io' + path), path);
        if (route === 'contact') assert.match(text, /(?:6892[-\s]+0550)/);
        await page.emulateMedia({media: 'screen'});
        assert.ok(await page.locator('.site-header').isVisible());
        console.log('A4 PDF verified', path, pdf.length, 'bytes');
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({channel: 'chrome'});
  try {
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const lang of ['ja', 'en']) {
        const home = 'http://localhost:8123/muroosystems-pages/' + lang + '/';
        for (const route of ['business/', 'projects/', 'company/', 'contact/']) {
          console.log('Checking', lang, route, width);
          await page.goto(home);
          const path = new URL(route, home).pathname;
          const entry = page.locator('a[href="' + path + '"]:visible').last();
          await entry.click();
          await page.waitForURL(home + route);
          assert.equal(await page.locator('html').getAttribute('lang'), lang);
          assert.ok(await page.locator('h1').first().isVisible());
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          assert.ok(overflow <= 1, lang + route + ' width=' + width + ' overflow=' + overflow);
          const other = lang === 'ja' ? 'en' : 'ja';
          const alternate = page.locator('a[hreflang="' + other + '"]:visible').last();
          await alternate.click();
          await page.waitForURL(home.replace('/' + lang + '/', '/' + other + '/') + route);
        }
        console.log('Visitor journeys passed', lang, width);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

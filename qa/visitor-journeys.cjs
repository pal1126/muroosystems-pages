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
      const missing = 'http://localhost:8123/muroosystems-pages/old/nested/article/';
      await page.route(missing, async route => {
        const response = await page.request.get('http://localhost:8123/muroosystems-pages/404.html');
        assert.equal(response.status(), 200);
        await route.fulfill({status: 404, contentType: 'text/html', body: await response.body()});
      });
      for (const locale of ['ja', 'en']) {
        for (const suffix of ['', 'search/']) {
          assert.equal((await page.goto(missing)).status(), 404);
          const target = '/muroosystems-pages/' + locale + '/' + suffix;
          const link = page.locator('section[lang="' + locale + '"] a[href="' + target + '"]');
          assert.ok(await link.isVisible());
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await link.focus();
          await page.keyboard.press('Enter');
          await page.waitForURL('http://localhost:8123' + target);
          assert.equal(await page.locator('html').getAttribute('lang'), locale);
          assert.ok(await page.locator(suffix ? '#site-query' : 'h1').first().isVisible());
        }
      }
      for (const lang of ['ja', 'en']) {
        const home = 'http://localhost:8123/muroosystems-pages/' + lang + '/';
        await page.goto(home + 'group/?source=bookmark');
        await page.waitForURL(home + 'company/?source=bookmark#group');
        assert.equal(await page.locator(':target').getAttribute('id'), 'group');
        for (const [route, section] of [['company/', 'nukem-technologies'], ['projects/', 'kazakhstan'], ['fremes/', 'function-development']]) {
          await page.goto(home + route + '#' + section);
          const other = lang === 'ja' ? 'en' : 'ja';
          const switcher = page.locator('a[hreflang="' + other + '"]:visible').last();
          await switcher.focus();
          await switcher.press('Enter');
          await page.waitForURL(home.replace('/' + lang + '/', '/' + other + '/') + route + '#' + section);
          assert.equal(await page.locator(':target').getAttribute('id'), section);
          const back = page.locator('a[hreflang="' + lang + '"]:visible').last();
          await page.evaluate(() => { location.hash = 'unmapped-section'; });
          await page.waitForFunction(lang => [...document.querySelectorAll('a[hreflang="' + lang + '"]')].every(a => !a.hash), lang);
          await back.click();
          await page.waitForURL(home + route);
        }
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
          if (route === 'contact/') {
            const contact = page.locator('.unified-contact');
            const call = contact.getByRole('link');
            assert.equal(await call.getAttribute('href'), 'tel:+81368920550');
            assert.match(await call.innerText(), lang === 'en' ? /\+81 3 6892 0550/ : /03-6892-0550/);
            assert.match(await contact.innerText(), lang === 'en' ? /UTC\+9/ : /日本時間/);
            await call.focus();
            assert.ok(await call.evaluate(el => document.activeElement === el));
          }
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

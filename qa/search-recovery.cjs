const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      for (const lang of ['ja', 'en']) {
        const url = 'http://localhost:8123/muroosystems-pages/' + lang + '/search/?q=FREMES&category=products';
        await page.goto(url);
        const broaden = page.locator('#site-search-empty button[data-action="broaden"]');
        await broaden.waitFor();
        assert.match(await broaden.innerText(), /6/);
        await broaden.click();
        const links = page.locator('#site-search-results h2 a');
        assert.equal(await links.count(), 6);
        assert.equal(await links.first().evaluate(el => el === document.activeElement), true);
        assert.equal(new URL(page.url()).searchParams.get('q'), 'FREMES');
        assert.equal(new URL(page.url()).searchParams.has('category'), false);
        await page.goBack();
        await broaden.waitFor();
        const query = page.locator('#site-query');
        await query.fill('xyznotarealword');
        const edit = page.locator('#site-search-empty button[data-action="edit"]');
        await edit.click();
        assert.equal(await query.evaluate(el => el === document.activeElement && el.selectionStart === 0 && el.selectionEnd === el.value.length), true);
        await page.goto(url.replace('&category=products', ''));
        await links.first().waitFor();
        await query.focus();
        const session = await page.context().newCDPSession(page);
        await query.evaluate(el => el.select());
        await session.send('Input.imeSetComposition', {text: 'かり', selectionStart: 2, selectionEnd: 2});
        assert.equal(await query.inputValue(), 'かり');
        await page.locator('#site-search-form').evaluate(form => form.requestSubmit());
        await page.waitForTimeout(300);
        assert.equal(new URL(page.url()).searchParams.get('q'), 'FREMES');
        assert.equal(await links.count(), 6);
        await session.send('Input.insertText', {text: 'NUKEM'});
        await page.waitForFunction(() => new URL(location.href).searchParams.get('q') === 'NUKEM');
        assert.ok(await links.count() > 0);
        await session.detach();
        const expanded = new URL(url);
        expanded.search = '?category=news&page=3';
        await page.goto(expanded.href);
        const article = links.nth(29);
        await article.waitFor();
        const destination = await article.evaluate(el => el.href);
        await article.focus();
        await article.press('Enter');
        await page.waitForURL(destination);
        await page.goBack();
        await page.waitForFunction(href => document.activeElement.href === href, destination);
        assert.equal(await links.count(), 36);
        const bounds = await article.boundingBox();
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 901);
        await page.keyboard.press('Tab');
        assert.equal(await links.nth(30).evaluate(el => el === document.activeElement), true);
        const indexRoute = '**/assets/site-search-' + lang + '.json';
        let attempts = 0;
        await page.route(indexRoute, async route => {
          attempts++;
          if (attempts <= 2) await route.fulfill({status: 503, body: ''});
          else await route.continue();
        });
        await page.goto(url);
        const retry = page.locator('#site-search-retry');
        await retry.waitFor();
        await retry.focus();
        await retry.press('Enter');
        await page.waitForFunction(() => !document.querySelector('#site-search-retry').hasAttribute('aria-disabled') && !document.querySelector('#site-search-retry').hidden);
        assert.equal(await retry.evaluate(el => el === document.activeElement), true);
        await retry.press('Enter');
        await broaden.waitFor();
        assert.equal(await broaden.evaluate(el => el === document.activeElement), true);
        assert.equal(await query.inputValue(), 'FREMES');
        assert.equal(await page.locator('#site-category').inputValue(), 'products');
        assert.equal(attempts, 3);
        await page.unroute(indexRoute);
        console.log(lang, width, 'passed');
      }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

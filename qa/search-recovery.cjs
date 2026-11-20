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
        console.log(lang, width, 'passed');
      }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

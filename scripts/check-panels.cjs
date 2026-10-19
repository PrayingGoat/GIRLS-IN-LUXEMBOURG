const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.TEST_BASE_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
    const order = ['about','partnerships','faq','policy','join'];
    assert.deepEqual(await page.locator('.community-directory [data-panel]').evaluateAll(links => links.map(a=>a.dataset.panel)), order);
    fs.mkdirSync('test-results', { recursive: true });
    for (const key of order) {
      const trigger = page.locator(`.community-directory [data-panel="${key}"]`);
      await trigger.scrollIntoViewIfNeeded();
      const scrollBefore = await page.evaluate(() => scrollY);
      await trigger.click();
      assert.equal(await page.locator('.community-dialog').evaluate(d => d.open), true);
      assert.ok((await page.locator('.panel-content').innerText()).length > 100, key);
      assert.equal(await page.locator('.panel-close').isVisible(), true);
      if (key === 'about') assert.doesNotMatch(await page.locator('.panel-content').innerText(), /Meet the Team|Co-founders and Community Leads/);
      if (key === 'faq') assert.ok(await page.locator('.panel-content details').count() >= 20);
      if (key === 'policy') assert.match(await page.locator('.panel-content').innerText(), /20 September 2026/);
      if (key === 'partnerships') await page.screenshot({ path: 'test-results/panel-desktop.png' });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.community-dialog').open && document.body.style.position !== 'fixed');
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - scrollBefore) < 2, `Scroll restored for ${key}`);
      assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
      assert.equal(await page.locator('.panel-content iframe').count(), 0);
    }
    await page.locator('.community-directory [data-panel="faq"]').click();
    await page.locator('.panel-content summary').first().click();
    assert.equal(await page.locator('.panel-content details').first().getAttribute('open'), '');
    await page.locator('.panel-nav [data-panel="policy"]').click();
    assert.equal(await page.locator('#panel-title').innerText(), 'Refund & Privacy Policy');
    await page.locator('.panel-close').focus();
    for (let i=0;i<22;i++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.querySelector('.community-dialog').contains(document.activeElement)), true);
    }
    await page.locator('.panel-close').click();
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const key of ['about','partnerships','policy','join']) {
        await page.locator(`.community-directory [data-panel="${key}"]`).click();
        assert.equal(await page.locator('.panel-content').evaluate(e => e.scrollWidth > e.clientWidth + 1), false, `${key} overflow at ${width}`);
        assert.equal(await page.locator('.community-dialog').evaluate(e => e.getBoundingClientRect().right <= innerWidth), true);
        if (width===390 && key==='partnerships') await page.screenshot({ path: 'test-results/panel-mobile.png' });
        await page.locator('.panel-close').click();
      }
    }
    // Live external checks are opt-in; never submit data to a community form.
    for (const [key,expected] of [['contact','Full Name'],['feedback',"How's your experience"],['membership','Full name']]) {
      await page.evaluate(key => {
        const link = key === 'membership' ? document.querySelector('[data-panel="membership"]') : document.querySelector(`#contact [data-panel="${key}"]`);
        link.click();
      }, key);
      assert.equal(await page.locator('.panel-content iframe').count(), 0);
      assert.equal(await page.locator('.panel-content a[href="mailto:hello@girlsinlu.com"]').count(), 1);
      assert.match(await page.locator('.panel-content').innerText(), /available here soon/);
      await page.locator('.panel-close').click();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: ordered panels, FAQ/policies, close/Escape, focus trapping/restoration, scroll restoration, 4 viewport widths, local contact placeholders. Live form check:', process.env.TEST_LIVE_FORMS === '1');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });

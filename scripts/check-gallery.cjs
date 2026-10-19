const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel:'msedge' });
  try {
    const page = await browser.newPage({ viewport:{width:1440,height:1000} });
    await page.clock.install();
    await page.goto(process.env.TEST_BASE_URL || 'http://localhost:5173', {waitUntil:'networkidle'});
    await page.locator('.hero-gallery').scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await page.clock.runFor(2000);
    assert.equal(await page.locator('.hero-slide').nth(1).getAttribute('aria-hidden'), 'false');
    await page.locator('[data-photo-next]').click();
    assert.equal(await page.locator('[data-photo-count]').innerText(), '03 / 03');
    await page.locator('[data-photo-next]').click();
    assert.equal(await page.locator('[data-photo-count]').innerText(), '01 / 03');
    await page.locator('[data-photo-prev]').click();
    assert.equal(await page.locator('[data-photo-count]').innerText(), '03 / 03');
    assert.equal(await page.locator('[data-photo-pause]').count(), 0);
    await page.clock.runFor(2000);
    assert.equal(await page.locator('[data-photo-count]').innerText(), '01 / 03');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.clock.runFor(2000);
    assert.equal(await page.locator('[data-photo-count]').innerText(), '02 / 03');
    assert.equal(await page.locator('.hero-slide.is-active img').evaluate(e=>getComputedStyle(e).transform), 'none');
    console.log('PASS: hero automatic crossfade, next/previous wrap, continuous playback with focused controls and reduced motion.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});

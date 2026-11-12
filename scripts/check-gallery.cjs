const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel:'msedge' });
  try {
    const page = await browser.newPage({ viewport:{width:1440,height:1000} });
    await page.clock.install();
    await page.goto(process.env.TEST_BASE_URL || 'http://localhost:5173', {waitUntil:'networkidle'});
    // Freeze time so only runFor() advances the slideshow.
    await page.clock.pauseAt(Date.now() + 60000);
    const slides = page.locator('.hero-slide');
    const total = await slides.count();
    const active = () => page.evaluate(() => [...document.querySelectorAll('.hero-slide')].findIndex(s => s.classList.contains('is-active')));
    assert.ok(total >= 2, 'the hero needs several photos');
    assert.equal(await page.locator('.hero-slide figcaption, [data-photo-count]').count(), 0, 'no captions or counter on the hero photos');
    await page.locator('.hero-gallery').scrollIntoViewIfNeeded();
    // Go back to the first photo, then check every behaviour from there.
    while (await active() !== 0) await page.locator('[data-photo-next]').click();
    await page.clock.runFor(2000);
    assert.equal(await active(), 1, 'advances automatically');
    assert.equal(await slides.nth(1).getAttribute('aria-hidden'), 'false');
    await page.locator('[data-photo-prev]').click();
    await page.locator('[data-photo-prev]').click();
    assert.equal(await active(), total - 1, 'previous wraps to the last photo');
    await page.locator('[data-photo-next]').click();
    assert.equal(await active(), 0, 'next wraps to the first photo');
    assert.equal(await page.locator('[data-photo-pause]').count(), 0);
    await page.clock.runFor(2000);
    assert.equal(await active(), 1);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.clock.runFor(2000);
    assert.equal(await active(), 2);
    assert.equal(await page.locator('.hero-slide.is-active img').evaluate(e=>getComputedStyle(e).transform), 'none');
    console.log(`PASS: ${total} hero photos, no captions or counter, automatic crossfade, next/previous wrap and reduced motion.`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});

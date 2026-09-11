const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('https://anant-radadiya.web.app/admin.html');
      await page.locator('#login-form button').waitFor();
      assert.equal(await page.locator('#dashboard').isVisible(), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `tests/admin-${width}.png`, fullPage: true });
      await page.goto('https://anant-radadiya.web.app/');
      await page.waitForTimeout(4000);
      assert.equal(await page.locator('#project-lock, #project-editor, .add-project-card, .edit-project, .add-demo-link').count(), 0);
      assert.deepEqual(errors, []);
      console.log(`Live website and admin verified at ${width}px; ${await page.locator('.project-card').count()} public projects`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

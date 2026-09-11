const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require('node:assert/strict');

(async () => {
  if (!process.env.OWNER_INITIAL_PASSWORD) throw new Error('Owner test password required.');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://anant-radadiya.web.app/admin.html');
    const denied = await page.evaluate(async () => {
      const response = await fetch('https://firestore.googleapis.com/v1/projects/anant-radadiya/databases/(default)/documents/accountLogin/owner?updateMask.fieldPaths=username', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { username: { stringValue: 'unauthorized' } } })
      });
      return response.status;
    });
    assert.equal(denied, 403);
    async function login() {
      await page.locator('#login-form [name=username]').fill('admin');
      await page.locator('#login-form [name=password]').fill(process.env.OWNER_INITIAL_PASSWORD);
      await page.locator('#login-form [type=submit]').click();
      await page.locator('#account-settings').waitFor({ state: 'visible', timeout: 30000 });
    }
    await login();
    await page.locator('#account-settings').click();
    await page.waitForFunction(() => document.querySelector('#username-form [name=username]').value === 'admin');
    await page.locator('#username-form [name=currentPassword]').fill(process.env.OWNER_INITIAL_PASSWORD);
    await page.locator('#username-form [type=submit]').click();
    await page.waitForFunction(() => document.querySelector('#username-form [role=status]').textContent === 'Username changed to admin.');
    await page.locator('#password-form [name=currentPassword]').fill(process.env.OWNER_INITIAL_PASSWORD);
    await page.locator('#password-form [name=newPassword]').fill(process.env.OWNER_INITIAL_PASSWORD);
    await page.locator('#password-form [name=confirmPassword]').fill(process.env.OWNER_INITIAL_PASSWORD);
    await page.locator('#password-form [type=submit]').click();
    await page.waitForFunction(() => document.querySelector('#password-form [role=status]').textContent === 'Password changed successfully.');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const overflow = await page.locator('#account-dialog').evaluate(el => el.scrollWidth > el.clientWidth);
      assert.equal(overflow, false);
      await page.screenshot({ path: `tests/account-${width}.png` });
    }
    await page.locator('#close-account').click();
    await page.locator('#sign-out').click();
    await page.locator('#login-form').waitFor({ state: 'visible' });
    await login();
    await page.locator('#sign-out').click();
    await page.locator('#login-form').waitFor({ state: 'visible' });
    assert.deepEqual(errors, []);
    console.log('Live username login, username/password forms, sign-out, repeat login, owner-only writes and responsive layouts passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

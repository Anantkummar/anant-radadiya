const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const shared = `
let items = [{ title: 'Existing project', label: 'Website', category: 'frontend', description: 'Original description', technologies: [], image: '', icon: '+', liveDemo: '', sourceCode: '' }];
let revision = 1, notify;
export async function signIn() {}
export async function signOut() {}
export async function resetPassword() {}
export async function changePassword() {}
export async function changeUsername() {}
export async function getAccountProfile() { return { username: 'admin' }; }
export function errorMessage(error) { return error.message; }
export async function watchProjects(next) { notify = next; next({ items, revision }); return () => {}; }
export async function saveProjects(next, expected) {
  if (window.failSave) throw new Error('Test connection failure');
  if (expected !== revision) throw new Error('Stale revision');
  items = next; revision++; notify({ items, revision });
}
`;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('http://admin.test/**', route => {
        const name = new URL(route.request().url()).pathname.slice(1);
        if (name === 'assets/anantkumar-profile.png') return route.fulfill({ body: fs.readFileSync(path.join(__dirname, '..', name)), contentType: 'image/png' });
        if (name === 'shared-data.js') return route.fulfill({ contentType: 'text/javascript', body: shared });
        if (!['admin.html', 'admin.js', 'admin.css', 'project-defaults.js'].includes(name)) return route.fulfill({ status: 404 });
        return route.fulfill({ body: fs.readFileSync(path.join(__dirname, '..', name)), contentType: name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : 'text/javascript' });
      });
      await page.goto('http://admin.test/admin.html');
      await page.locator('#login-form [name=username]').fill('admin');
      await page.locator('#login-form [name=password]').fill('test-password');
      await page.locator('#login-form [type=submit]').click();
      await page.locator('.project-row').waitFor();
      await page.screenshot({ path: `tests/studio-${width}.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.locator('#project-search').fill('missing');
      assert.equal(await page.locator('.project-row').count(), 0);
      await page.locator('#project-search').fill('');
      await page.locator('#category-filter').selectOption('backend');
      assert.equal(await page.locator('.project-row').count(), 0);
      await page.locator('#category-filter').selectOption('all');
      assert.equal(await page.locator('.project-row').count(), 1);
      const dialog = page.locator('#project-editor');
      for (const close of ['.editor-close', '.cancel-editor', 'Escape']) {
        await page.locator('#add-project').click();
        await dialog.locator('[name=title]').fill('Unsaved draft');
        if (close === 'Escape') await page.keyboard.press('Escape');
        else await dialog.locator(close).click();
        assert.equal(await dialog.isVisible(), false);
        assert.equal(await page.locator('.project-row').count(), 1);
      }
      await page.locator('#account-settings').click();
      await page.screenshot({ path: `tests/studio-account-${width}.png` });
      await page.locator('#close-account').click();
      assert.equal(await page.locator('#account-dialog').isVisible(), false);
      await page.locator('#add-project').click();
      assert.equal(await dialog.locator('[name=title]').inputValue(), '');
      const scrollable = dialog.locator('.editor-grid');
      await scrollable.evaluate(el => { el.scrollTop = el.scrollHeight; });
      for (const selector of ['.editor-close', '.cancel-editor', '.save-project']) {
        const bounds = await dialog.locator(selector).boundingBox();
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844);
      }
      assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth), false);
      await scrollable.evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: `tests/editor-${width}.png` });
      await dialog.locator('[name=title]').fill('New project');
      await dialog.locator('[name=label]').fill('Frontend');
      await dialog.locator('[name=description]').fill('New project description');
      await page.evaluate(() => { window.failSave = true; });
      await dialog.locator('.save-project').click();
      await page.waitForFunction(() => document.querySelector('#project-form [role=alert]').textContent === 'Test connection failure');
      assert.equal(await dialog.locator('.editor-close').isEnabled(), true);
      await page.evaluate(() => { window.failSave = false; });
      await dialog.locator('.save-project').click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await page.locator('.project-row').count(), 2);
      await page.locator('.project-row').last().locator('button').click();
      await dialog.locator('[name=title]').fill('Updated project');
      await dialog.locator('.save-project').click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await page.locator('.project-row h3').last().textContent(), 'Updated project');
      await page.locator('.project-row').last().locator('button').click();
      page.once('dialog', prompt => prompt.accept());
      await dialog.locator('.delete-project').click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await page.locator('.project-row').count(), 1);
      assert.deepEqual(errors, []);
      console.log(`${width}px: corner close, Cancel, Escape, account close, draft reset, save failure recovery, create, edit, delete and fixed controls passed.`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

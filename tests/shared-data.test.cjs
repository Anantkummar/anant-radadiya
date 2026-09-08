const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function backend() {
  const records = new Map();
  const listeners = [];
  const snapshot = path => ({
    exists: () => records.has(path), data: () => records.get(path),
    metadata: { fromCache: false, hasPendingWrites: false }
  });
  const emit = () => listeners.forEach(({ ref, next }) => next(ref === 'reviews'
    ? { metadata: { fromCache: false, hasPendingWrites: false }, docs: [...records].filter(([key]) => key.startsWith('reviews/')).map(([, value]) => ({ data: () => value })) }
    : snapshot(ref)));
  return {
    records, listeners,
    sdk: {
      getFirestore: () => ({}), doc: (_, ...parts) => parts.join('/'),
      collection: (_, name) => name, query: ref => ref, orderBy: () => null,
      serverTimestamp: () => 123,
      getDocFromServer: async ref => snapshot(ref),
      setDoc: async (ref, value) => { records.set(ref, value); emit(); },
      runTransaction: async (_, update) => {
        const writes = [];
        await update({ get: async ref => snapshot(ref), set: (ref, value) => writes.push([ref, value]) });
        writes.forEach(([key, value]) => records.set(key, value));
        emit();
      },
      onSnapshot: (ref, _, next) => { listeners.push({ ref, next }); emit(); return () => {}; }
    }
  };
}

async function device(server, config = { apiKey: 'test' }) {
  const context = vm.createContext({
    fetch: async () => ({ ok: true, json: async () => config }),
    navigator: { onLine: true }
  });
  const authentication = { currentUser: { uid: 'owner' } };
  const modules = {
    'firebase-app.js': { initializeApp: () => ({}) },
    'firebase-firestore.js': server.sdk,
    'firebase-auth.js': {
      getAuth: () => authentication, setPersistence: async () => {}, inMemoryPersistence: {},
      signInWithEmailAndPassword: async () => ({ user: { uid: 'owner' } }),
      signOut: async () => { authentication.currentUser = null; },
      updatePassword: async () => {}
    }
  };
  const module = new vm.SourceTextModule(fs.readFileSync('shared-data.js', 'utf8'), {
    context,
    importModuleDynamically: async url => {
      const exports = modules[url.split('/').pop()];
      const dependency = new vm.SyntheticModule(Object.keys(exports), function () {
        Object.entries(exports).forEach(([key, value]) => this.setExport(key, value));
      }, { context });
      await dependency.link(() => {});
      await dependency.evaluate();
      return dependency;
    }
  });
  await module.link(() => {});
  await module.evaluate();
  return { api: module.namespace, context, authentication };
}

test('project deletion reaches another device and remains empty on reload', async () => {
  const server = backend();
  const phone = await device(server);
  const web = await device(server);
  let displayed;
  await web.api.watchProjects(data => { displayed = data; }, assert.fail);
  assert.equal(displayed.items, null);
  await phone.api.saveProjects([{ title: 'Example' }], 0);
  assert.equal(displayed.items.length, 1);
  await phone.api.saveProjects([], 1);
  assert.equal(displayed.items.length, 0);
  const reloaded = await device(server);
  await reloaded.api.watchProjects(data => { displayed = data; }, assert.fail);
  assert.equal(displayed.items.length, 0);
  assert.equal(displayed.revision, 2);
});

test('a stale editor cannot restore a project deleted on another phone', async () => {
  const server = backend();
  const { api } = await device(server);
  await api.saveProjects([{ title: 'Example' }], 0);
  await api.saveProjects([], 1);
  await assert.rejects(api.saveProjects([{ title: 'Old edit' }], 1), /another device/);
  assert.equal(server.records.get('portfolio/projects').items.length, 0);
});

test('reviews propagate across devices and retry does not duplicate them', async () => {
  const server = backend();
  const phone = await device(server);
  const web = await device(server);
  let reviews;
  await web.api.watchReviews(data => { reviews = data; }, assert.fail);
  await phone.api.publishReview({ name: 'Customer', workRating: 5, websiteRating: 4 }, 'review-1');
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].workRating, 5);
  await phone.api.publishReview({ name: 'Customer' }, 'review-1');
  assert.equal(reviews.length, 1);
  const third = await device(server);
  await third.api.watchReviews(data => { reviews = data; }, assert.fail);
  assert.equal(reviews.length, 1);
});

test('offline reviews fail without a local-only success', async () => {
  const server = backend();
  const { api, context } = await device(server);
  context.navigator.onLine = false;
  await assert.rejects(api.publishReview({}, 'offline'), /offline/);
  assert.equal(server.records.size, 0);
});

test('missing configuration reports a useful sync error', async () => {
  const { api } = await device(backend(), {});
  let failure;
  await api.watchProjects(assert.fail, error => { failure = error; });
  assert.match(failure.message, /not configured/);
});

test('accounts without an admin record cannot unlock project editing', async () => {
  const server = backend();
  const { api, authentication } = await device(server);
  await assert.rejects(api.signIn('visitor@example.com', 'password'), /permission/);
  assert.equal(authentication.currentUser, null);
  server.records.set('admins/owner', {});
  await api.signIn('owner@example.com', 'password');
});

test('cached and uncommitted snapshots never appear as shared data', async () => {
  const server = backend();
  const { api } = await device(server);
  let updates = 0;
  await api.watchProjects(() => updates++, assert.fail);
  const listener = server.listeners[0];
  listener.next({ metadata: { fromCache: true, hasPendingWrites: false } });
  listener.next({ metadata: { fromCache: false, hasPendingWrites: true } });
  assert.equal(updates, 1);
});

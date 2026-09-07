const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSiteServer } = require('./server.cjs');
test('visits increment across clients, survive restart, and stay private', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-visits-'));
  let server;
  const start = async () => {
    server = createSiteServer({ dataDir });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  };
  const close = () => new Promise(resolve => server.close(resolve));
  try {
    let url = await start();
    assert.equal((await (await fetch(url + '/api/visits')).json()).count, 0);
    const visits = await Promise.all(Array.from({ length:10 }, async () => (await (await fetch(url + '/api/visits', { method:'POST' })).json()).count));
    assert.deepEqual(visits.sort((a,b) => a-b), [1,2,3,4,5,6,7,8,9,10]);
    assert.equal((await fetch(url + '/.visit-data/visits.json')).status, 404);
    assert.equal((await fetch(url + '/server.cjs')).status, 404);
    const options = { method:'POST', headers:{ 'X-Visit-ID':'page-load-1234567890' } };
    assert.equal((await (await fetch(url + '/api/visits', options)).json()).count, 11);
    assert.equal((await (await fetch(url + '/api/visits', options)).json()).count, 11);
    await close();
    url = await start();
    assert.equal((await (await fetch(url + '/api/visits', options)).json()).count, 11);
    assert.equal((await (await fetch(url + '/api/visits')).json()).count, 11);
    assert.equal((await (await fetch(url + '/api/visits', { method:'POST' })).json()).count, 12);
    assert.equal((await fetch(url + '/api/visits', { method:'POST', headers:{ 'X-Visit-ID':'bad' } })).status, 400);
  } finally {
    if (server?.listening) await close();
    fs.rmSync(dataDir, { recursive:true, force:true });
  }
});

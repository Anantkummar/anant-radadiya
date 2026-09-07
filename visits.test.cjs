const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('failed visits retry once, polling preserves totals, and hidden pages pause', async () => {
  const counter = { dataset:{}, setAttribute() {}, classList:{ add() {} } };
  const value = { textContent:'', closest:() => counter };
  const requests = [];
  const timers = new Map();
  const listeners = {};
  let timerId = 0;
  let fail = true;
  const document = { hidden:false, querySelector:() => value, addEventListener:(event, fn) => { listeners[event] = fn; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'visits.js'), 'utf8'), {
    document,
    window:{ addEventListener:(event, fn) => { listeners[event] = fn; } },
    AbortController,
    setTimeout:(fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout:id => timers.delete(id),
    fetch:async (url, options) => {
      requests.push(options);
      if (fail) throw new Error('Offline');
      return { ok:true, json:async () => ({ count:42 }) };
    }
  });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const tick = async () => {
    const entry = [...timers.entries()].find(([, timer]) => timer.delay !== 8000);
    assert.ok(entry, 'an update is scheduled');
    timers.delete(entry[0]);
    await entry[1].fn();
  };
  await settle();
  assert.equal(value.textContent, '--');
  assert.equal(counter.dataset.state, 'offline');
  fail = false;
  await tick();
  assert.equal(value.textContent, '0042');
  assert.equal(requests[1].method, 'POST');
  assert.equal(requests[1].headers['X-Visit-ID'], requests[0].headers['X-Visit-ID']);
  fail = true;
  await tick();
  assert.equal(requests[2].method, 'GET');
  assert.equal(value.textContent, '0042');
  assert.equal(counter.dataset.state, 'offline');
  document.hidden = true;
  await tick();
  assert.equal(requests.length, 3);
  document.hidden = false;
  fail = false;
  await listeners.visibilitychange();
  assert.equal(requests[3].method, 'GET');
  assert.equal(counter.dataset.state, 'live');
});

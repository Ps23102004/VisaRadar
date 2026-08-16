// web/lib/state.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createState } = require('./state.js');

test('get() returns the initial state', () => {
  const s = createState({ company: '', country: '', visaType: 'F-1' });
  assert.deepEqual(s.get(), { company: '', country: '', visaType: 'F-1' });
});

test('set() shallow-merges and get() reflects it', () => {
  const s = createState({ company: '', country: '' });
  s.set({ company: 'Google' });
  assert.deepEqual(s.get(), { company: 'Google', country: '' });
});

test('subscribe() is called with the new state on every set()', () => {
  const s = createState({ company: '' });
  const seen = [];
  s.subscribe((state) => seen.push(state.company));
  s.set({ company: 'a' });
  s.set({ company: 'b' });
  assert.deepEqual(seen, ['a', 'b']);
});

test('unsubscribe stops further notifications', () => {
  const s = createState({ n: 0 });
  const seen = [];
  const unsub = s.subscribe((state) => seen.push(state.n));
  s.set({ n: 1 });
  unsub();
  s.set({ n: 2 });
  assert.deepEqual(seen, [1]);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { CHECKLIST_DATA, SEED_COUNTRIES, lookupChecklist } = require('./checklist-data.js');

const VISA_TYPES = ['F-1', 'J-1', 'H-1B'];

test('all 3 visa types are present', () => {
  assert.deepEqual(Object.keys(CHECKLIST_DATA).sort(), VISA_TYPES.slice().sort());
});

test('every visa type has a default fallback entry', () => {
  for (const vt of VISA_TYPES){
    assert.ok(CHECKLIST_DATA[vt].countries.default, `${vt} missing countries.default`);
  }
});

test('every visa type has an entry for every seeded country', () => {
  assert.ok(SEED_COUNTRIES.length >= 15 && SEED_COUNTRIES.length <= 20, 'SEED_COUNTRIES should have 15-20 entries');
  for (const vt of VISA_TYPES){
    for (const cc of SEED_COUNTRIES){
      assert.ok(CHECKLIST_DATA[vt].countries[cc], `${vt} missing country ${cc}`);
    }
  }
});

test('every country entry has non-empty documents with title+detail, and a source URL', () => {
  for (const vt of VISA_TYPES){
    for (const cc of Object.keys(CHECKLIST_DATA[vt].countries)){
      const entry = CHECKLIST_DATA[vt].countries[cc];
      assert.ok(Array.isArray(entry.documents) && entry.documents.length > 0, `${vt}/${cc} documents empty`);
      for (const doc of entry.documents){
        assert.equal(typeof doc.title, 'string');
        assert.ok(doc.title.length > 0);
        assert.equal(typeof doc.detail, 'string');
      }
      assert.equal(typeof entry.source, 'string');
      assert.match(entry.source, /^https:\/\//, `${vt}/${cc} source must be a URL`);
    }
  }
});

test('lookupChecklist returns the country entry when present', () => {
  const entry = lookupChecklist('F-1', SEED_COUNTRIES[0]);
  assert.equal(entry, CHECKLIST_DATA['F-1'].countries[SEED_COUNTRIES[0]]);
});

test('lookupChecklist falls back to default for an unseeded country', () => {
  const entry = lookupChecklist('F-1', 'ZZ');
  assert.equal(entry, CHECKLIST_DATA['F-1'].countries.default);
});

test('lookupChecklist throws on an unknown visa type', () => {
  assert.throws(() => lookupChecklist('O-1', 'IN'));
});

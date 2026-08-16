// web/lib/matcher.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { filterEmployers, employerToFilingRecord } = require('./matcher.js');

const SAMPLE = [
  { k: 'GOOGLE', n: 'Google LLC', f: 9673, c: 99, l: 'strong', s: ['CA','WA','NY'], t: ['Software Engineer','Product Manager'], w: 193000 },
  { k: 'MICROSOFT', n: 'Microsoft Corporation', f: 9772, c: 100, l: 'strong', s: ['WA','CA','TX'], t: ['Software Engineering'], w: 172744 },
  { k: 'INFOSYS', n: 'INFOSYS LIMITED', f: 7459, c: 100, l: 'strong', s: ['TX','NC','CA'], t: ['Technology Consultant 2'], w: 104055 }
];

test('filterEmployers with no filters returns everything', () => {
  assert.equal(filterEmployers(SAMPLE, {}).length, 3);
});

test('filterEmployers query matches company name case-insensitively', () => {
  const result = filterEmployers(SAMPLE, { query: 'goog' });
  assert.equal(result.length, 1);
  assert.equal(result[0].n, 'Google LLC');
});

test('filterEmployers state filters to employers active in that state', () => {
  const result = filterEmployers(SAMPLE, { state: 'NY' });
  assert.equal(result.length, 1);
  assert.equal(result[0].n, 'Google LLC');
});

test('filterEmployers combines query and state with AND', () => {
  const result = filterEmployers(SAMPLE, { query: 'micro', state: 'CA' });
  assert.equal(result.length, 1);
  assert.equal(result[0].n, 'Microsoft Corporation');
  assert.equal(filterEmployers(SAMPLE, { query: 'micro', state: 'NY' }).length, 0);
});

test('employerToFilingRecord converts to the render()-compatible shape', () => {
  const rec = employerToFilingRecord(SAMPLE[0], {});
  assert.equal(rec.company, 'Google LLC');
  assert.equal(rec.title, 'Software Engineer');
  assert.equal(rec.location, 'CA');
  assert.equal(rec.label, 'strong');
  assert.equal(rec.match_confidence, 0.99);
  assert.deepEqual(rec.evidence, [
    'total filings: 9673',
    'certified percentage: 99%',
    'typical wage: $193,000'
  ]);
});

test('employerToFilingRecord honors explicit title/state overrides', () => {
  const rec = employerToFilingRecord(SAMPLE[0], { title: 'Product Manager', state: 'WA' });
  assert.equal(rec.title, 'Product Manager');
  assert.equal(rec.location, 'WA');
});

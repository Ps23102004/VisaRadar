// web/lib/nav.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { NAV_LINKS, renderNav } = require('./nav.js');

test('NAV_LINKS has exactly the 8 expected entries in order', () => {
  assert.deepEqual(NAV_LINKS.map(l => l.label), [
    'Browse', 'Check', 'Bring your key', 'My Journey',
    'Checklist', 'Apply Yourself', 'Install', 'MCP'
  ]);
});

test('Browse/Check/Checklist/My Journey point into app.html sections', () => {
  const byLabel = Object.fromEntries(NAV_LINKS.map(l => [l.label, l.href]));
  assert.equal(byLabel['Browse'], 'app.html#browse');
  assert.equal(byLabel['Check'], 'app.html#check');
  assert.equal(byLabel['Checklist'], 'app.html#checklist');
  assert.equal(byLabel['My Journey'], 'app.html#journey');
  assert.equal(byLabel['Bring your key'], 'byok.html');
  assert.equal(byLabel['Apply Yourself'], 'guide.html');
  assert.equal(byLabel['Install'], 'install.html');
  assert.equal(byLabel['MCP'], 'mcp.html');
});

test('renderNav marks the current link and no others', () => {
  const html = renderNav('app.html#check');
  const currentCount = (html.match(/aria-current="page"/g) || []).length;
  assert.equal(currentCount, 1);
  assert.match(html, /href="app\.html#check"[^>]*aria-current="page"/);
});

test('renderNav escapes nothing unexpected and includes the logo', () => {
  const html = renderNav('byok.html');
  assert.match(html, /class="logo"/);
  assert.match(html, /VisaRadar/);
});

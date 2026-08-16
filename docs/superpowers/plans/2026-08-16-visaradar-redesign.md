# VisaRadar Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate Browse/Check/Checklist/My Journey into one `app.html` with shared filter state and no page reloads, unify theme/nav across all pages, replace Check's raw-JSON input with real data-driven filters, and give Checklist a country-aware, sourced document schema.

**Architecture:** Extract shared CSS (`theme.css`) and nav (`nav.js`) so all pages look and behave identically. Pull pure logic (matching, checklist lookup, shared filter state) into small standalone JS files under `web/lib/` that work both as browser `<script>` globals and as Node-requireable modules, so they're unit-testable with Node's built-in test runner — no framework, no build step, matching the project's existing zero-dependency style. `app.html` composes these libs plus one JS file per section (`web/sections/*.js`).

**Tech Stack:** Vanilla HTML/CSS/JS, no framework, no bundler. Tests: `node:test` + `node:assert/strict` (built into Node 18+, zero install). Served via local HTTP server (confirmed in spec) — `fetch()` of same-origin files works.

**Spec:** `docs/superpowers/specs/2026-08-16-visaradar-redesign-design.md`

## Global Constraints

- Theme tokens copied verbatim from existing pages, do not change: `--accent:#FF9500`, ink `#0A0A0C` (light) / `#F5F5F7` (dark), background `#FBFBFD` (light) / `#000000` (dark), badge colors `--strong:#30D158`, `--moderate:#FFD60A`, `--weak:#FF9F0A`, `--none:#8E8E93`.
- Every page's CSP meta tag currently reads `script-src 'unsafe-inline'; style-src 'unsafe-inline'` — **no `'self'`**. This blocks `<script src="...">` and `<link rel="stylesheet" href="...">` entirely. Every page that adopts shared `theme.css`/`nav.js`/lib files must change these to `script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`.
- Only `app.html` needs `connect-src 'self'` (for `fetch('employers.json')`). All other pages keep `connect-src 'none'` except `byok.html`, whose existing `connect-src 'self' https://openrouter.ai https://api.openai.com https://api.groq.com https://api.together.xyz http://127.0.0.1:11434 http://localhost:11434 http://127.0.0.1:1234 http://localhost:1234` must not be narrowed.
- `web/employers.json` record shape (confirmed by direct inspection): `{"k": <normalized key>, "n": <full company name>, "f": <filing count>, "c": <certified percent 0-100>, "l": <"strong"|"moderate"|"weak"|"none">, "s": [<state abbrevs>], "t": [<job titles>], "w": <wage number>}`. It has **no country field and no per-record narrative evidence** — Check section must synthesize evidence strings from `f`/`c`/`w` the same way the current sample data in check.html does (`"total filings: 9673"`, `"certified percentage: 99%"`), and match_confidence must be converted from `c` (0-100 int) to a 0-1 float (`c / 100`) since `render()` expects the latter.
- No new npm/build dependencies. No new frameworks.

---

### Task 1: Shared theme.css

**Files:**
- Create: `web/theme.css`

**Interfaces:**
- Produces: CSS custom properties `--accent`, `--strong`, `--moderate`, `--weak`, `--none`, `--strong-tint`, `--moderate-tint`, `--weak-tint`, `--none-tint`, `--mx`, `--my`; classes `.glass`, `.glass::before`, nav styles (`header.nav`, `.logo`, `nav.nav-links`, `nav a`, `nav a.current`/`[aria-current="page"]`), `.search-wrap`/`.search-ico`/`#search` (generic selector `input[type="search"], .search-input` — see note below), button base `button.go`, `@keyframes cardIn`/`rowIn`, dark-mode block, reduced-motion block, responsive block.

- [ ] **Step 1: Write `web/theme.css`**

Consolidate the `:root` tokens, `.glass` utility, nav CSS, button styles, keyframes, dark-mode, and reduced-motion/responsive rules that currently exist (duplicated, slightly drifted) in `check.html`, `checklist.html`, and `journey.html`'s `<style>` blocks, plus the search-input pattern from `browse.html`. Standardize the nav markup on `browse.html`'s more semantic structure (`<header class="nav">` + `<a class="logo">` + `<nav class="nav-links">` + `aria-current="page"`) since it's the more accessible of the two structures found in the codebase — `nav.js` (Task 2) will render this structure everywhere.

```css
:root{
  --mx: 50%;
  --my: 50%;
  --accent: #FF9500;
  --strong: #30D158;
  --moderate: #FFD60A;
  --weak: #FF9F0A;
  --none: #8E8E93;
  --strong-tint: rgba(48,209,88,0.14);
  --moderate-tint: rgba(255,214,10,0.16);
  --weak-tint: rgba(255,159,10,0.14);
  --none-tint: rgba(142,142,147,0.16);
  --ink: #0A0A0C;
  --ink-soft: rgba(10,10,12,0.6);
  --bg: #FBFBFD;
  --glass-strong: rgba(255,255,255,0.7);
  --accent-soft: rgba(255,149,0,0.25);
}

*{ box-sizing: border-box; }
html, body{ margin: 0; padding: 0; }

body{
  min-height: 100vh;
  background: var(--bg);
  background-image: radial-gradient(1100px 720px at 50% -12%, rgba(255,149,0,0.08), transparent 60%);
  background-attachment: fixed;
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ---------- Nav (canonical structure, matches nav.js output) ---------- */
header.nav{
  display: flex;
  align-items: center;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 22px 0;
}
header.nav .logo{
  font-weight: 700;
  font-size: 16px;
  margin-right: auto;
  color: var(--ink);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
header.nav .logo .dot{
  width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
}
nav.nav-links{ display: flex; gap: 24px; align-items: center; font-size: 14px; flex-wrap: wrap; }
nav.nav-links a{ color: var(--ink-soft); text-decoration: none; }
nav.nav-links a:hover{ color: var(--ink); }
nav.nav-links a.current,
nav.nav-links a[aria-current="page"]{
  color: var(--ink);
  font-weight: 600;
  border-bottom: 2px solid var(--accent);
  padding-bottom: 2px;
}

/* ---------- Glass card base ---------- */
.glass{
  position: relative;
  overflow: hidden;
  background: rgba(255,255,255,0.55);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px;
  box-shadow: 0 12px 34px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.55);
}
.glass::before{
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(circle 220px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.25), transparent 70%);
}
.glass > *{ position: relative; z-index: 1; }

/* ---------- Search input (reusable — Check's company search reuses this) ---------- */
.search-wrap{ position: relative; }
.search-wrap .glass{
  padding: 16px 18px 16px 50px;
  display: flex;
  align-items: center;
  transition: box-shadow .3s cubic-bezier(0.16,1,0.3,1), border-color .3s cubic-bezier(0.16,1,0.3,1), background .3s cubic-bezier(0.16,1,0.3,1);
}
.search-wrap:focus-within .glass{
  border-color: var(--accent);
  box-shadow: 0 8px 32px rgba(0,0,0,0.08), 0 0 0 3px var(--accent-soft);
  background: var(--glass-strong);
}
.search-ico{
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-soft);
  pointer-events: none;
  display: flex;
}
.search-input{
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 17px;
  color: var(--ink);
}
.search-input::placeholder{ color: var(--ink-soft); opacity: .8; }

/* ---------- Native control chrome reset (closes the "blue" gap) ---------- */
select, input[type="text"], input[type="search"]{
  appearance: none;
  -webkit-appearance: none;
  font: inherit;
  color: inherit;
  background: rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 10px;
  padding: 8px 12px;
  outline: none;
}
select{
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%230A0A0C' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 30px;
}
select:focus-visible, input:focus-visible, button:focus-visible{
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---------- Button ---------- */
button.go{
  appearance: none;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  padding: 11px 22px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,0.16);
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s cubic-bezier(0.16,1,0.3,1);
}
button.go:hover{ transform: scale(1.03); box-shadow: 0 6px 20px rgba(0,0,0,0.22); }
button.go:active{ transform: scale(0.98); }

/* ---------- Motion utilities (applied uniformly — was on 4/8 pages, now all) ---------- */
.fade-in{ animation: fadeIn 0.4s ease forwards; }
.stagger > *{ animation: fadeIn 0.4s ease forwards; opacity: 0; }
.stagger > *:nth-child(1){ animation-delay: 0ms; }
.stagger > *:nth-child(2){ animation-delay: 60ms; }
.stagger > *:nth-child(3){ animation-delay: 120ms; }
.stagger > *:nth-child(4){ animation-delay: 180ms; }
.stagger > *:nth-child(5){ animation-delay: 240ms; }
.press:active{ transform: scale(0.98); }

@keyframes fadeIn{ from{ opacity: 0; transform: translateY(8px); } to{ opacity: 1; transform: translateY(0); } }
@keyframes cardIn{ from{ opacity: 0; transform: scale(0.96); } to{ opacity: 1; transform: scale(1); } }
@keyframes rowIn{ from{ opacity: 0; transform: translateY(8px); } to{ opacity: 1; transform: translateY(0); } }

@media (prefers-reduced-motion: reduce){
  .fade-in, .stagger > *, .press:active{ animation: none !important; opacity: 1 !important; transform: none !important; }
  button.go{ transition: none !important; }
}

@media (max-width: 480px){
  select, input[type="text"], input[type="search"]{ font-size: 16px; }
}

/* ---------- Dark mode ---------- */
@media (prefers-color-scheme: dark){
  :root{ --ink: #F5F5F7; --ink-soft: rgba(245,245,247,0.6); --bg: #000000; --glass-strong: rgba(28,28,30,0.75); }
  body{ background-image: radial-gradient(1100px 720px at 50% -12%, rgba(255,149,0,0.14), transparent 62%); }
  .glass{
    background: rgba(28,28,30,0.55);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .glass::before{ background: radial-gradient(circle 220px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.12), transparent 70%); }
  select, input[type="text"], input[type="search"]{ background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
  select{
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23F5F5F7' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  }
}
```

- [ ] **Step 2: Verify the file loads with no syntax errors**

Run: `node -e "require('fs').readFileSync('web/theme.css','utf8')" && python3 -m http.server 8123 --directory web &` then in another shell `curl -sf http://localhost:8123/theme.css | head -1` — expect `:root{` as the first line, no error. Kill the server after (`kill %1` or the PID `curl` printed via `lsof -ti:8123 | xargs kill`).

- [ ] **Step 3: Commit**

```bash
git add web/theme.css
git commit -m "Add shared theme.css consolidating tokens, glass, nav, motion styles"
```

---

### Task 2: Shared nav.js

**Files:**
- Create: `web/lib/nav.js`
- Test: `web/lib/nav.test.js`

**Interfaces:**
- Produces: `NAV_LINKS` (array of `{href, label}`, 8 entries matching the existing nav order: Browse, Check, Bring your key, My Journey, Checklist, Apply Yourself, Install, MCP — Browse/Check/Checklist/My Journey all point to `app.html#<section>`), `renderNav(currentHref)` returns an HTML string for `<header class="nav">...</header>`, `mountNav(currentHref)` (browser-only: finds `.nav-mount`, sets its `innerHTML` to `renderNav(currentHref)`).
- Exposed as `window.VisaRadarNav` in the browser and via `module.exports` in Node (dual export, same pattern used by every `web/lib/*.js` file in this plan).

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/lib/nav.test.js`
Expected: FAIL — `Cannot find module './nav.js'`

- [ ] **Step 3: Write `web/lib/nav.js`**

```js
(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.VisaRadarNav = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  var NAV_LINKS = [
    { href: 'app.html#browse',    label: 'Browse' },
    { href: 'app.html#check',     label: 'Check' },
    { href: 'byok.html',          label: 'Bring your key' },
    { href: 'app.html#journey',   label: 'My Journey' },
    { href: 'app.html#checklist', label: 'Checklist' },
    { href: 'guide.html',         label: 'Apply Yourself' },
    { href: 'install.html',       label: 'Install' },
    { href: 'mcp.html',           label: 'MCP' }
  ];

  function renderNav(currentHref){
    var links = NAV_LINKS.map(function(l){
      var isCurrent = l.href === currentHref;
      return '<a href="' + l.href + '"' +
        (isCurrent ? ' class="current" aria-current="page"' : '') +
        '>' + l.label + '</a>';
    }).join('\n      ');

    return '<header class="nav">\n' +
      '  <a class="logo" href="app.html#browse" aria-label="VisaRadar home">VisaRadar<span class="dot"></span></a>\n' +
      '  <nav class="nav-links" aria-label="Primary">\n      ' + links + '\n  </nav>\n' +
      '</header>';
  }

  function mountNav(currentHref){
    var mount = document.querySelector('.nav-mount');
    if (mount) mount.innerHTML = renderNav(currentHref);
  }

  return { NAV_LINKS: NAV_LINKS, renderNav: renderNav, mountNav: mountNav };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test web/lib/nav.test.js`
Expected: PASS, 4/4 tests

- [ ] **Step 5: Commit**

```bash
git add web/lib/nav.js web/lib/nav.test.js
git commit -m "Add shared nav.js — single source of truth for the nav bar"
```

---

### Task 3: Wire shared theme/nav into the 4 standalone pages

**Files:**
- Modify: `web/byok.html`, `web/install.html`, `web/mcp.html`, `web/guide.html`

**Interfaces:**
- Consumes: `web/theme.css` (Task 1), `web/lib/nav.js` → `window.VisaRadarNav.mountNav(currentHref)` (Task 2).

- [ ] **Step 1: For each of the 4 files, apply the same edit**

In `<head>`, replace the page's CSP meta `script-src 'unsafe-inline'; style-src 'unsafe-inline'` with `script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'` (byok.html: keep its existing broader `connect-src` untouched, only edit `script-src`/`style-src`). Add `<link rel="stylesheet" href="theme.css">` after the CSP meta.

Remove the page's duplicated nav-related CSS rules from its inline `<style>` block (the `nav{...}`, `nav .logo{...}`, `nav a{...}` rules, and any `:root` tokens now covered by `theme.css` — keep only page-specific styles that aren't in `theme.css`, e.g. `install.html`'s command-block styling).

Replace the page's hardcoded `<nav>...</nav>` markup with:
```html
<div class="nav-mount"></div>
```

Before the closing `</body>`, add:
```html
<script src="lib/nav.js"></script>
<script>VisaRadarNav.mountNav('byok.html');</script>
```
(substitute the correct href per file: `'byok.html'`, `'install.html'`, `'mcp.html'`, `'guide.html'`)

- [ ] **Step 2: Verify each page still renders and the nav is correct**

Run: `python3 -m http.server 8123 --directory web &` then use the Playwright/claude-in-chrome browser tool to navigate to `http://localhost:8123/byok.html`, `install.html`, `mcp.html`, `guide.html` in turn. For each: confirm no CSP violation appears in the console (`read_console_messages` with pattern `Content Security Policy|Refused to`), confirm the nav bar renders with 8 links and the correct one marked current/underlined in accent orange. Kill the server after.

- [ ] **Step 3: Commit**

```bash
git add web/byok.html web/install.html web/mcp.html web/guide.html
git commit -m "Wire shared theme.css and nav.js into standalone pages, fix CSP to allow same-origin script/style"
```

---

### Task 4: matcher.js — pure employer filtering and record adaptation

**Files:**
- Create: `web/lib/matcher.js`
- Test: `web/lib/matcher.test.js`

**Interfaces:**
- Consumes: employer records shaped `{k, n, f, c, l, s, t, w}` (see Global Constraints).
- Produces: `filterEmployers(employers, {query, state})` → array (case-insensitive substring match on `n`/`k` for `query`; exact match on any entry of `s` for `state`; either filter omitted/empty means "don't filter on this"). `employerToFilingRecord(employer, {title, state})` → `{company, title, location, label, evidence, match_confidence}` matching exactly what `check.html`'s existing `render()` consumes (see Task 12) — `title` defaults to `employer.t[0]` if not given, `location` defaults to `employer.s[0]`, `match_confidence = employer.c / 100`, `evidence = ["total filings: " + employer.f, "certified percentage: " + employer.c + "%", "typical wage: $" + employer.w.toLocaleString()]`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/lib/matcher.test.js`
Expected: FAIL — `Cannot find module './matcher.js'`

- [ ] **Step 3: Write `web/lib/matcher.js`**

```js
(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.VisaRadarMatcher = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){

  function filterEmployers(employers, opts){
    opts = opts || {};
    var query = (opts.query || '').trim().toLowerCase();
    var state = (opts.state || '').trim().toUpperCase();
    return employers.filter(function(e){
      if (query){
        var haystack = ((e.n || '') + ' ' + (e.k || '')).toLowerCase();
        if (haystack.indexOf(query) === -1) return false;
      }
      if (state){
        if (!Array.isArray(e.s) || e.s.indexOf(state) === -1) return false;
      }
      return true;
    });
  }

  function employerToFilingRecord(employer, opts){
    opts = opts || {};
    var title = opts.title || (Array.isArray(employer.t) ? employer.t[0] : '');
    var location = opts.state || (Array.isArray(employer.s) ? employer.s[0] : '');
    return {
      company: employer.n,
      title: title,
      location: location,
      label: employer.l,
      match_confidence: employer.c / 100,
      evidence: [
        'total filings: ' + employer.f,
        'certified percentage: ' + employer.c + '%',
        'typical wage: $' + Number(employer.w).toLocaleString()
      ]
    };
  }

  return { filterEmployers: filterEmployers, employerToFilingRecord: employerToFilingRecord };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test web/lib/matcher.test.js`
Expected: PASS, 6/6 tests

- [ ] **Step 5: Commit**

```bash
git add web/lib/matcher.js web/lib/matcher.test.js
git commit -m "Add matcher.js — pure employer filtering and render()-shape adapter"
```

---

### Task 5: checklist-data.js schema, defaults, and structural validator

**Files:**
- Create: `web/lib/checklist-data.js`
- Test: `web/lib/checklist-data.test.js`

**Interfaces:**
- Produces: `CHECKLIST_DATA` shaped `{ "F-1": { fee: "$350", countries: { "IN": {documents:[{title,detail}], examples:{<doc title>: <example string>}, notes, source}, ..., "default": {...} } }, "J-1": {...}, "H-1B": {...} }`; `SEED_COUNTRIES` (array of 18 ISO country codes, defined below); `lookupChecklist(visaType, countryCode)` → the country's entry if present, else `countries.default`, else throws if `visaType` unknown.

- [ ] **Step 1: Write the failing test**

```js
// web/lib/checklist-data.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/lib/checklist-data.test.js`
Expected: FAIL — `Cannot find module './checklist-data.js'`

- [ ] **Step 3: Write `web/lib/checklist-data.js` scaffold**

Fixed country list (common in DOL/LCA filings — locked here so Tasks 6-8 stay consistent with each other): `SEED_COUNTRIES = ['IN','CN','MX','NG','PH','BR','KR','CA','GB','DE','VN','PK','BD','CO','UA','NP','GH','TW']` (India, China, Mexico, Nigeria, Philippines, Brazil, South Korea, Canada, UK, Germany, Vietnam, Pakistan, Bangladesh, Colombia, Ukraine, Nepal, Ghana, Taiwan).

For this task, populate `countries.default` for all 3 visa types using the **existing, already-correct** F-1/J-1 content from `checklist.html` (it's not country-specific — it's the current, real content, just relocated) and a parallel H-1B default built from `journey.html`'s existing H-1B step descriptions (`"Approved I-129 petition, I-797, employer support letter"`). Leave `countries[<code>]` for each of the 18 `SEED_COUNTRIES` as **an explicit placeholder object with a `_todo: true` marker** for Tasks 6-8 to fill in — this keeps the schema/test complete and mergeable now without fabricating country content in this task.

```js
(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.VisaRadarChecklistData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){

  var SEED_COUNTRIES = ['IN','CN','MX','NG','PH','BR','KR','CA','GB','DE','VN','PK','BD','CO','UA','NP','GH','TW'];

  var F1_DEFAULT_DOCS = [
    { title: 'Form I-20', detail: 'Issued by your SEVP-certified school after admission' },
    { title: 'I-901 SEVIS fee receipt', detail: 'Pay only at fmjfee.com — nowhere else' },
    { title: 'DS-160 confirmation page', detail: 'Online nonimmigrant visa application, at ceac.state.gov' },
    { title: 'Visa application fee receipt', detail: 'Paid through the official channel your embassy specifies' },
    { title: 'Valid passport', detail: 'Valid at least 6 months beyond your intended stay' },
    { title: 'DS-160 photo', detail: 'Meeting the official photo specification' },
    { title: 'Financial evidence', detail: 'Bank statements or affidavit of support showing you can cover the program' },
    { title: 'Evidence of ties to home country', detail: 'You must affirmatively show non-immigrant intent (INA 214(b))' }
  ];

  var J1_DEFAULT_DOCS = [
    { title: 'Form DS-2019', detail: 'Issued by your designated Exchange Visitor Program sponsor' },
    { title: 'I-901 SEVIS fee receipt', detail: 'Pay only at fmjfee.com — nowhere else' },
    { title: 'DS-160 confirmation page', detail: 'Online nonimmigrant visa application, at ceac.state.gov' },
    { title: 'Visa application fee receipt', detail: 'Paid through the official channel your embassy specifies' },
    { title: 'Valid passport', detail: 'Valid at least 6 months beyond your intended stay' },
    { title: 'DS-160 photo', detail: 'Meeting the official photo specification' },
    { title: 'Program sponsor information', detail: 'Details of your specific exchange program' },
    { title: 'Evidence of ties to home country', detail: 'You must affirmatively show non-immigrant intent (INA 214(b))' }
  ];

  var H1B_DEFAULT_DOCS = [
    { title: 'Approved I-129 petition', detail: 'Filed and approved by your sponsoring employer' },
    { title: 'Form I-797 approval notice', detail: 'Notice of Action from USCIS confirming petition approval' },
    { title: 'Employer support letter', detail: 'Confirms your role, salary, and employment start date' },
    { title: 'DS-160 confirmation page', detail: 'Online nonimmigrant visa application, at ceac.state.gov' },
    { title: 'Visa application fee receipt', detail: 'Paid through the official channel your embassy specifies' },
    { title: 'Valid passport', detail: 'Valid at least 6 months beyond your intended stay' },
    { title: 'DS-160 photo', detail: 'Meeting the official photo specification' }
  ];

  function defaultEntry(docs, source){
    return { documents: docs, examples: {}, notes: '', source: source };
  }

  function placeholderCountries(){
    var out = {};
    SEED_COUNTRIES.forEach(function(cc){ out[cc] = { _todo: true }; });
    return out;
  }

  var CHECKLIST_DATA = {
    'F-1': {
      fee: '$350',
      countries: Object.assign(placeholderCountries(), {
        default: defaultEntry(F1_DEFAULT_DOCS, 'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html')
      })
    },
    'J-1': {
      fee: '$220',
      countries: Object.assign(placeholderCountries(), {
        default: defaultEntry(J1_DEFAULT_DOCS, 'https://j1visa.state.gov/sponsors/current/')
      })
    },
    'H-1B': {
      fee: 'varies by employer',
      countries: Object.assign(placeholderCountries(), {
        default: defaultEntry(H1B_DEFAULT_DOCS, 'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations')
      })
    }
  };

  function lookupChecklist(visaType, countryCode){
    var visa = CHECKLIST_DATA[visaType];
    if (!visa) throw new Error('Unknown visa type: ' + visaType);
    var country = visa.countries[countryCode];
    if (!country || country._todo) return visa.countries.default;
    return country;
  }

  return { CHECKLIST_DATA: CHECKLIST_DATA, SEED_COUNTRIES: SEED_COUNTRIES, lookupChecklist: lookupChecklist };
});
```

Note: this scaffold's own test in Step 1 will still FAIL after this step (country entries are `{_todo:true}`, missing `documents`/`source`) — that's expected. Task 5 is done when the scaffold exists and *only* the country-content assertions fail (structure/defaults/fallback tests pass). Confirm that split explicitly:

- [ ] **Step 4: Run test, confirm the expected partial-pass split**

Run: `node --test web/lib/checklist-data.test.js`
Expected: `all 3 visa types are present` PASS, `every visa type has a default fallback entry` PASS, `every visa type has an entry for every seeded country` PASS (entries exist, just as placeholders), `every country entry has non-empty documents...` FAIL (placeholders have no `documents`), `lookupChecklist returns the country entry when present` FAIL (returns default because of `_todo`), `lookupChecklist falls back to default...` PASS, `lookupChecklist throws...` PASS. This confirms the scaffold is correctly wired and only real content is missing — Tasks 6-8 close the gap.

- [ ] **Step 5: Commit**

```bash
git add web/lib/checklist-data.js web/lib/checklist-data.test.js
git commit -m "Scaffold checklist-data.js: schema, defaults, lookup, 18-country placeholders"
```

---

### Task 6: checklist-data.js — F-1 country content

**Files:**
- Modify: `web/lib/checklist-data.js` (fill `CHECKLIST_DATA['F-1'].countries[<code>]` for all 18 `SEED_COUNTRIES`)

**Interfaces:**
- Consumes: `SEED_COUNTRIES` list and schema from Task 5 (`{documents:[{title,detail}], examples:{<doc title>: <string>}, notes, source}`).

- [ ] **Step 1: Research and fill each country's F-1 entry**

For each of the 18 `SEED_COUNTRIES`, replace `{ _todo: true }` with a real entry. Use WebSearch/WebFetch against official sources only — the U.S. embassy/consulate page for that country (linked from travel.state.gov's country list) and travel.state.gov/USCIS directly. Do not invent figures. Each entry:
- `documents`: start from `F1_DEFAULT_DOCS` (the base USCIS/DoS-side requirements are the same everywhere) and add any country-specific items the embassy page calls out (e.g. police clearance certificate, additional financial-evidence formats, translation/apostille requirements). Cite exact wording from the source, don't paraphrase numbers or fees.
- `examples`: for 2-3 of the more ambiguous document titles (typically "Financial evidence" and "Evidence of ties to home country"), give one concrete, country-appropriate example sourced from the embassy page or a reputable official guide — e.g. what proof-of-funds format that consulate accepts.
- `notes`: one sentence on anything that meaningfully differs from the U.S.-side default (translation requirement, appointment wait-time note if the embassy publishes one, etc.). Empty string if nothing differs beyond the shared defaults.
- `source`: the exact URL consulted.

If authoritative country-specific detail genuinely isn't available for a given country beyond the U.S.-side default, it is acceptable for that country's `documents`/`examples` to match the default closely — do not pad with invented specifics. `notes` should say so plainly in that case (e.g. `"No additional consulate-specific requirements found beyond the standard F-1 documents."`).

- [ ] **Step 2: Run the schema test, confirm F-1 rows now pass**

Run: `node --test web/lib/checklist-data.test.js`
Expected: the two previously-failing tests now check both F-1 and J-1/H-1B — F-1's contribution to `every country entry has non-empty documents...` and `lookupChecklist returns the country entry when present` (for an F-1 country) should now pass; J-1/H-1B failures remain until Tasks 7-8.

- [ ] **Step 3: Commit**

```bash
git add web/lib/checklist-data.js
git commit -m "Add sourced F-1 country-specific checklist content for 18 countries"
```

---

### Task 7: checklist-data.js — J-1 country content

**Files:**
- Modify: `web/lib/checklist-data.js` (fill `CHECKLIST_DATA['J-1'].countries[<code>]` for all 18 `SEED_COUNTRIES`)

**Interfaces:** same as Task 6, applied to `J1_DEFAULT_DOCS` and the J-1 program-sponsor angle instead of school angle.

- [ ] **Step 1: Research and fill each country's J-1 entry**

Same process as Task 6, Step 1, sourced from each country's embassy J-1 page and `j1visa.state.gov`. J-1 tends to vary more by *program sponsor* than by country — where an embassy page ties requirements to sponsor category (au pair, intern, research scholar, etc.) rather than country, say so in `notes` rather than fabricating a country-only distinction that isn't real.

- [ ] **Step 2: Run the schema test, confirm J-1 rows now pass**

Run: `node --test web/lib/checklist-data.test.js`
Expected: J-1's contribution to the documents/source and lookup tests now passes; only H-1B failures remain.

- [ ] **Step 3: Commit**

```bash
git add web/lib/checklist-data.js
git commit -m "Add sourced J-1 country-specific checklist content for 18 countries"
```

---

### Task 8: checklist-data.js — H-1B country content

**Files:**
- Modify: `web/lib/checklist-data.js` (fill `CHECKLIST_DATA['H-1B'].countries[<code>]` for all 18 `SEED_COUNTRIES`)

**Interfaces:** same as Task 6, applied to `H1B_DEFAULT_DOCS`. Source from USCIS's H-1B page plus each country's embassy nonimmigrant/work-visa page.

- [ ] **Step 1: Research and fill each country's H-1B entry**

Same process as Task 6, Step 1. H-1B is petition-based (USCIS approves before the consular step), so most variation by country is in the visa-stamping appointment stage (financial/employment verification documents the consulate additionally asks for) — reflect that honestly in `notes` rather than inventing petition-stage differences that don't exist.

- [ ] **Step 2: Run the full test suite, confirm all green**

Run: `node --test web/lib/checklist-data.test.js`
Expected: PASS, all tests, all 3 visa types × 18 countries covered.

- [ ] **Step 3: Commit**

```bash
git add web/lib/checklist-data.js
git commit -m "Add sourced H-1B country-specific checklist content for 18 countries"
```

---

### Task 9: state.js — shared filter state

**Files:**
- Create: `web/lib/state.js`
- Test: `web/lib/state.test.js`

**Interfaces:**
- Produces: `createState(initial)` → `{ get(), set(partial), subscribe(fn) }`. `set` shallow-merges into current state and calls every subscriber with the new full state. `subscribe` returns an unsubscribe function.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/lib/state.test.js`
Expected: FAIL — `Cannot find module './state.js'`

- [ ] **Step 3: Write `web/lib/state.js`**

```js
(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.VisaRadarState = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){

  function createState(initial){
    var state = Object.assign({}, initial);
    var listeners = [];

    function get(){ return state; }

    function set(partial){
      state = Object.assign({}, state, partial);
      listeners.forEach(function(fn){ fn(state); });
    }

    function subscribe(fn){
      listeners.push(fn);
      return function unsubscribe(){
        var idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    }

    return { get: get, set: set, subscribe: subscribe };
  }

  return { createState: createState };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test web/lib/state.test.js`
Expected: PASS, 4/4 tests

- [ ] **Step 5: Commit**

```bash
git add web/lib/state.js web/lib/state.test.js
git commit -m "Add state.js — shared filter state store for app.html sections"
```

---

### Task 10: app.html shell

**Files:**
- Create: `web/app.html`

**Interfaces:**
- Consumes: `theme.css` (Task 1), `lib/nav.js` (Task 2), `lib/state.js` (Task 9), `web/employers.json` (existing file, fetched here).
- Produces: a global `AppShell` object with `registerSection(id, {mount, onFilterChange})` and `showSection(id)`, plus the shared `state` instance (`window.appState`) that Tasks 11-14's section files register against. `<body>` contains `<div class="nav-mount"></div>`, a tab bar (`<div class="tabs" role="tablist">` with 4 buttons: Browse/Check/Checklist/My Journey, `data-section` attrs `browse`/`check`/`checklist`/`journey`), and 4 empty section containers (`<section id="section-browse" class="app-section"></section>`, etc., only the one matching the current `location.hash` visible on load, default `browse`).

- [ ] **Step 1: Write `web/app.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<title>VisaRadar</title>
<link rel="stylesheet" href="theme.css">
<style>
  .stage{ width: 100%; max-width: 720px; margin: 0 auto; padding: 24px 22px 128px; display: flex; flex-direction: column; gap: 28px; }
  .tabs{ display: flex; gap: 8px; }
  .tab-btn{ font: inherit; font-size: 14px; font-weight: 600; padding: 8px 18px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.1); background: rgba(0,0,0,0.03); color: var(--ink-soft); cursor: pointer; }
  .tab-btn.active{ background: var(--accent); border-color: var(--accent); color: #fff; }
  .app-section{ display: none; }
  .app-section.active{ display: block; }
  @media (prefers-color-scheme: dark){
    .tab-btn{ background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
  }
</style>
</head>
<body>
  <div class="nav-mount"></div>
  <main class="stage">
    <div class="tabs" role="tablist">
      <button class="tab-btn" data-section="browse" type="button" role="tab">Browse</button>
      <button class="tab-btn" data-section="check" type="button" role="tab">Check</button>
      <button class="tab-btn" data-section="checklist" type="button" role="tab">Checklist</button>
      <button class="tab-btn" data-section="journey" type="button" role="tab">My Journey</button>
    </div>
    <section id="section-browse" class="app-section"></section>
    <section id="section-check" class="app-section"></section>
    <section id="section-checklist" class="app-section"></section>
    <section id="section-journey" class="app-section"></section>
  </main>

  <script src="lib/nav.js"></script>
  <script src="lib/state.js"></script>
  <script>
    (function(){
      "use strict";
      window.appState = VisaRadarState.createState({ company: '', state: '', country: '', visaType: 'F-1' });

      var SECTIONS = ['browse', 'check', 'checklist', 'journey'];
      var registry = {};

      window.AppShell = {
        registerSection: function(id, handlers){ registry[id] = handlers; },
        showSection: function(id){
          if (SECTIONS.indexOf(id) === -1) id = 'browse';
          SECTIONS.forEach(function(s){
            document.getElementById('section-' + s).classList.toggle('active', s === id);
            document.querySelector('.tab-btn[data-section="' + s + '"]').classList.toggle('active', s === id);
          });
          location.hash = id;
          if (registry[id] && !registry[id]._mounted){
            registry[id]._mounted = true;
            registry[id].mount(document.getElementById('section-' + id), window.appState);
          }
        }
      };

      document.querySelectorAll('.tab-btn').forEach(function(btn){
        btn.addEventListener('click', function(){ AppShell.showSection(btn.dataset.section); });
      });

      var employersPromise = fetch('employers.json').then(function(r){ return r.json(); });
      window.employersPromise = employersPromise;

      VisaRadarNav.mountNav('app.html#' + (location.hash.replace('#','') || 'browse'));

      document.addEventListener('DOMContentLoaded', function(){
        var initial = location.hash.replace('#', '') || 'browse';
        AppShell.showSection(initial);
      });
    })();
  </script>
  <script src="lib/matcher.js"></script>
  <script src="lib/checklist-data.js"></script>
  <script src="sections/browse.js"></script>
  <script src="sections/check.js"></script>
  <script src="sections/checklist.js"></script>
  <script src="sections/journey.js"></script>
</body>
</html>
```

Note: `sections/*.js` (Tasks 11-14) don't exist yet — this task's verification step confirms the shell degrades gracefully (404s on those 4 scripts, console shows them, but tab-switching and nav still work) since each is additive.

- [ ] **Step 2: Verify tab-switching works with no reload**

Run: `python3 -m http.server 8123 --directory web &`. Use the browser tool to navigate to `http://localhost:8123/app.html`, confirm the Browse tab is active by default, click each of the other 3 tabs, confirm the active tab/section changes and the URL hash updates (`#check`, `#checklist`, `#journey`) without a full page navigation (check via `read_network_requests` that no new `app.html` document request fires on tab clicks). Confirm no CSP violations in console. Kill the server after.

- [ ] **Step 3: Commit**

```bash
git add web/app.html
git commit -m "Add app.html shell: nav, tab-switching, shared state, employers.json fetch"
```

---

### Task 11: sections/browse.js

**Files:**
- Create: `web/sections/browse.js`

**Interfaces:**
- Consumes: `window.AppShell.registerSection`, `window.appState`, `window.employersPromise`, `VisaRadarMatcher.filterEmployers` (Task 4).
- Produces: registers `'browse'` with `AppShell`; renders the search input (reusing `.search-wrap`/`.search-ico`/`.search-input` from `theme.css`) and a results list of matching employers (name, states, top title, wage, label badge), reading/writing `company`/`state` into `window.appState`.

- [ ] **Step 1: Port `browse.html`'s search markup and wire it to the shared dataset**

```js
(function(){
  "use strict";

  function mount(container, state){
    container.innerHTML =
      '<section class="search-wrap glass fade-in" aria-label="Search employers">' +
        '<span class="search-ico" aria-hidden="true">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>' +
        '</span>' +
        '<input id="browse-search" class="search-input" type="search" autocomplete="off" spellcheck="false" ' +
          'placeholder="Search company name or state (e.g. CA, Google, Microsoft)..." aria-label="Search company name or state">' +
      '</section>' +
      '<ul id="browse-results" class="stagger" style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px;"></ul>';

    var searchEl = container.querySelector('#browse-search');
    var resultsEl = container.querySelector('#browse-results');
    var employers = [];

    window.employersPromise.then(function(data){
      employers = data;
      renderResults();
    });

    function renderResults(){
      var query = searchEl.value;
      var matches = VisaRadarMatcher.filterEmployers(employers, { query: query }).slice(0, 40);
      resultsEl.innerHTML = matches.map(function(e){
        return '<li class="glass" style="padding:14px 18px;">' +
          '<strong>' + e.n + '</strong>' +
          '<div style="font-size:13px; color:var(--ink-soft);">' + (e.t[0] || '') + ' · ' + e.s.join(', ') + ' · $' + Number(e.w).toLocaleString() + '</div>' +
          '</li>';
      }).join('');
    }

    searchEl.addEventListener('input', function(){
      state.set({ company: searchEl.value });
      renderResults();
    });

    searchEl.value = state.get().company || '';
  }

  window.AppShell.registerSection('browse', { mount: mount });
})();
```

- [ ] **Step 2: Verify search filters results live and the icon doesn't overlap the input**

Run: `python3 -m http.server 8123 --directory web &`. Navigate to `http://localhost:8123/app.html#browse` with the browser tool. Type `"goog"` into the search box, confirm the results list narrows to Google-matching rows. Then, with `javascript_tool`, read `getBoundingClientRect()` for `.search-ico` and `#browse-search`, and assert the icon's right edge (`left + width`) is less than the input's computed `padding-left` in pixels — confirms no visual overlap at the default viewport. Repeat at a narrow width (375px) via `resize_window` to catch a responsive-only overlap. Take a screenshot either way for the visual record.

- [ ] **Step 3: Commit**

```bash
git add web/sections/browse.js
git commit -m "Add Browse section: live search over employers.json, shared search-input component"
```

---

### Task 12: sections/check.js

**Files:**
- Create: `web/sections/check.js`

**Interfaces:**
- Consumes: `window.appState`, `window.employersPromise`, `VisaRadarMatcher.filterEmployers`/`employerToFilingRecord` (Task 4). Reuses `render(data)` verbatim from the current `check.html` (same DOM id contract: `#company`, `#title`, `#conf-pct`, `#label`, `#loc`, `#evidence`).
- Produces: registers `'check'` with `AppShell`; renders a company `<select>` (populated from `employers.json`, filtered by `state.get().company`/`state.get().state` if already set from Browse) plus a title `<select>` (populated from the chosen employer's `t` array) and a state `<select>` (from `s`), a "Visualize" button, and the existing result card. A collapsed `<details>` "Paste custom JSON instead" retains the old textarea path for power users.

- [ ] **Step 1: Write `web/sections/check.js`**

```js
(function(){
  "use strict";

  function esc(s){
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function fmtConfidence(c){
    var num = parseFloat(c);
    if (isNaN(num)) return '0';
    return Math.round(num * 100);
  }

  function mount(container, state){
    container.innerHTML =
      '<div class="glass" style="padding:22px; display:flex; flex-direction:column; gap:14px;">' +
        '<label style="font-size:13px; font-weight:600;">Company<select id="check-company"><option value="">Choose a company…</option></select></label>' +
        '<label style="font-size:13px; font-weight:600;">Title<select id="check-title"></select></label>' +
        '<label style="font-size:13px; font-weight:600;">State<select id="check-state"></select></label>' +
        '<div class="actions" style="display:flex; justify-content:flex-end;"><button id="check-go" class="go press" type="button">Visualize →</button></div>' +
        '<details><summary style="font-size:12px; color:var(--ink-soft); cursor:pointer;">Paste custom JSON instead</summary>' +
          '<textarea id="check-json" spellcheck="false" style="width:100%; min-height:100px; margin-top:8px; font-family:ui-monospace,monospace; font-size:13px;"></textarea>' +
          '<div class="actions" style="display:flex; justify-content:flex-end; margin-top:8px;"><button id="check-json-go" class="go press" type="button">Visualize JSON →</button></div>' +
        '</details>' +
      '</div>' +
      '<div class="error" id="check-error" style="display:none;"></div>' +
      '<div class="result glass" id="check-result" style="padding:24px; display:none; flex-direction:column; gap:18px;">' +
        '<div class="result-top" style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">' +
          '<div><p class="company" id="company" style="font-size:22px; font-weight:600; margin:0;"></p><p class="title" id="title" style="font-size:16px; color:var(--ink-soft); margin:4px 0 0;"></p></div>' +
          '<div class="confidence" style="text-align:right;"><b id="conf-pct" style="display:block; font-size:26px; font-weight:600; color:var(--accent);"></b></div>' +
        '</div>' +
        '<div class="meta" style="display:flex; align-items:center; gap:10px;"><span class="loc" id="loc" style="font-size:15px;"></span><span class="badge" id="label"></span></div>' +
        '<ul class="evidence" id="evidence" style="display:flex; flex-direction:column; gap:8px; margin:0; padding:0; list-style:none;"></ul>' +
      '</div>';

    var companyEl = container.querySelector('#check-company');
    var titleEl = container.querySelector('#check-title');
    var stateEl = container.querySelector('#check-state');
    var goEl = container.querySelector('#check-go');
    var errEl = container.querySelector('#check-error');
    var resultEl = container.querySelector('#check-result');
    var jsonEl = container.querySelector('#check-json');
    var jsonGoEl = container.querySelector('#check-json-go');

    var employers = [];
    var byKey = {};

    window.employersPromise.then(function(data){
      employers = data;
      byKey = {};
      companyEl.innerHTML = '<option value="">Choose a company…</option>' + employers.map(function(e){
        byKey[e.n] = e;
        return '<option value="' + esc(e.n) + '">' + esc(e.n) + '</option>';
      }).join('');
      if (state.get().company){
        var pre = employers.find(function(e){ return e.n.toLowerCase().indexOf(state.get().company.toLowerCase()) !== -1; });
        if (pre){ companyEl.value = pre.n; populateEmployerOptions(pre); }
      }
    });

    function populateEmployerOptions(employer){
      titleEl.innerHTML = employer.t.map(function(t){ return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
      stateEl.innerHTML = employer.s.map(function(s){ return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
    }

    companyEl.addEventListener('change', function(){
      var employer = byKey[companyEl.value];
      if (employer) populateEmployerOptions(employer);
    });

    function render(data){
      var label = (String(data.label || 'none').toLowerCase()).replace(/[^a-z]/g, '');
      if (label !== 'strong' && label !== 'moderate' && label !== 'weak' && label !== 'none') label = 'none';

      container.querySelector('#company').textContent = data.company || '—';
      container.querySelector('#title').textContent = data.title || '';

      var pct = fmtConfidence(data.match_confidence);
      var confEl = container.querySelector('#conf-pct');
      confEl.textContent = pct + '%';
      confEl.title = pct + '% match';

      var labelEl = container.querySelector('#label');
      labelEl.className = 'badge ' + label;
      labelEl.innerHTML = '<span class="dot"></span>' + esc(label);
      container.querySelector('#loc').textContent = data.location || '';

      var evidenceEl = container.querySelector('#evidence');
      var ev = Array.isArray(data.evidence) ? data.evidence : [];
      evidenceEl.innerHTML = '';
      ev.forEach(function(item, i){
        var li = document.createElement('li');
        li.className = 'row fade-in';
        li.style.setProperty('--i', i);
        li.style.cssText += 'background:rgba(255,255,255,0.08); border-radius:10px; padding:12px 16px; font-size:14px;';
        li.textContent = String(item);
        evidenceEl.appendChild(li);
      });

      resultEl.style.display = 'flex';
    }

    goEl.addEventListener('click', function(){
      var employer = byKey[companyEl.value];
      if (!employer){
        errEl.textContent = 'Choose a company first.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      var record = VisaRadarMatcher.employerToFilingRecord(employer, { title: titleEl.value, state: stateEl.value });
      state.set({ company: employer.n, state: stateEl.value });
      render(record);
    });

    jsonGoEl.addEventListener('click', function(){
      try{
        var data = JSON.parse(jsonEl.value);
        errEl.style.display = 'none';
        render(data);
      } catch (e){
        errEl.textContent = "That's not valid JSON — check the format and try again.";
        errEl.style.display = 'block';
      }
    });
  }

  window.AppShell.registerSection('check', { mount: mount });
})();
```

- [ ] **Step 2: Verify the filter flow end to end**

Run the local server, navigate to `http://localhost:8123/app.html#check`. Select a company from the dropdown (e.g. "Google LLC"), confirm title/state dropdowns populate, click "Visualize →", confirm the result card renders with the correct company name, a percentage matching that employer's `c` field, and 3 evidence rows (filings/certified%/wage). Confirm switching to Browse and back to Check preserves the selected company (via `window.appState`). Expand "Paste custom JSON instead" and confirm the original raw-JSON path still works as a fallback.

- [ ] **Step 3: Commit**

```bash
git add web/sections/check.js
git commit -m "Add Check section: company/title/state filters replacing raw JSON as the default path"
```

---

### Task 13: sections/checklist.js

**Files:**
- Create: `web/sections/checklist.js`

**Interfaces:**
- Consumes: `window.appState`, `VisaRadarChecklistData.CHECKLIST_DATA`/`lookupChecklist` (Task 5-8).
- Produces: registers `'checklist'` with `AppShell`; renders visa-type tabs (F-1/J-1/H-1B) and a country `<select>` (the 18 `SEED_COUNTRIES`, labeled with full country names, plus an "Other / not listed" option mapping to `default`), writes both into `window.appState`, and renders the resulting entry's `documents` (with inline `examples` shown under any document that has one) and `notes`/`source` — no link-out to a generic page.

- [ ] **Step 1: Write `web/sections/checklist.js`**

```js
(function(){
  "use strict";

  var COUNTRY_NAMES = {
    IN: 'India', CN: 'China', MX: 'Mexico', NG: 'Nigeria', PH: 'Philippines',
    BR: 'Brazil', KR: 'South Korea', CA: 'Canada', GB: 'United Kingdom', DE: 'Germany',
    VN: 'Vietnam', PK: 'Pakistan', BD: 'Bangladesh', CO: 'Colombia', UA: 'Ukraine',
    NP: 'Nepal', GH: 'Ghana', TW: 'Taiwan'
  };

  function esc(s){
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function mount(container, state){
    var countryOptions = Object.keys(COUNTRY_NAMES).map(function(cc){
      return '<option value="' + cc + '">' + COUNTRY_NAMES[cc] + '</option>';
    }).join('') + '<option value="default">Other / not listed</option>';

    container.innerHTML =
      '<div class="tabs" role="tablist" id="checklist-visa-tabs">' +
        '<button class="tab-btn active" data-visa="F-1" type="button">F-1 Student</button>' +
        '<button class="tab-btn" data-visa="J-1" type="button">J-1 Exchange</button>' +
        '<button class="tab-btn" data-visa="H-1B" type="button">H-1B</button>' +
      '</div>' +
      '<label style="font-size:13px; font-weight:600; display:block; margin:14px 0;">Country you\'re applying from' +
        '<select id="checklist-country">' + countryOptions + '</select>' +
      '</label>' +
      '<div id="checklist-body"></div>';

    var visaTabs = container.querySelectorAll('#checklist-visa-tabs .tab-btn');
    var countryEl = container.querySelector('#checklist-country');
    var bodyEl = container.querySelector('#checklist-body');

    function currentVisa(){
      var active = container.querySelector('#checklist-visa-tabs .tab-btn.active');
      return active ? active.dataset.visa : 'F-1';
    }

    function renderBody(){
      var visaType = currentVisa();
      var countryCode = countryEl.value;
      var entry = VisaRadarChecklistData.lookupChecklist(visaType, countryCode);
      var feeText = VisaRadarChecklistData.CHECKLIST_DATA[visaType].fee;

      bodyEl.innerHTML =
        '<p style="font-size:14px; color:var(--accent); font-weight:600;">Fee: ' + esc(feeText) + '</p>' +
        (entry.notes ? '<p style="font-size:13px; color:var(--ink-soft); margin-bottom:14px;">' + esc(entry.notes) + '</p>' : '') +
        '<div class="glass stagger" style="padding:6px;"><ul style="list-style:none; margin:0; padding:0;">' +
        entry.documents.map(function(doc){
          var example = entry.examples && entry.examples[doc.title];
          return '<li style="padding:12px 14px; font-size:14px;">' +
            '<strong style="display:block;">' + esc(doc.title) + '</strong>' +
            '<span style="color:var(--ink-soft); font-size:13px;">' + esc(doc.detail) + '</span>' +
            (example ? '<div style="margin-top:6px; font-size:12.5px; color:var(--ink-soft); font-style:italic;">Example: ' + esc(example) + '</div>' : '') +
          '</li>';
        }).join('') +
        '</ul></div>' +
        '<p style="font-size:12px; color:var(--ink-soft); margin-top:20px;">Source: <a href="' + esc(entry.source) + '" style="color:var(--ink-soft);">' + esc(entry.source) + '</a> — informational only, not legal advice, always confirm against the live page.</p>';
    }

    visaTabs.forEach(function(btn){
      btn.addEventListener('click', function(){
        visaTabs.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        state.set({ visaType: btn.dataset.visa });
        renderBody();
      });
    });

    countryEl.addEventListener('change', function(){
      state.set({ country: countryEl.value });
      renderBody();
    });

    var current = state.get();
    if (current.visaType){
      visaTabs.forEach(function(b){ b.classList.toggle('active', b.dataset.visa === current.visaType); });
    }
    if (current.country) countryEl.value = current.country;

    renderBody();
  }

  window.AppShell.registerSection('checklist', { mount: mount });
})();
```

- [ ] **Step 2: Verify country switching shows inline examples, no link-out**

Navigate to `http://localhost:8123/app.html#checklist`. Confirm F-1 is active by default with the "Other / not listed" (default) content showing. Select a seeded country (e.g. India) from the dropdown, confirm the document list updates in place (no navigation) and at least one document shows an inline "Example:" line. Switch visa type to H-1B, confirm the fee text and document list change accordingly while the selected country persists. Confirm the source link at the bottom points to the real URL from `checklist-data.js`, not a generic page.

- [ ] **Step 3: Commit**

```bash
git add web/sections/checklist.js
git commit -m "Add Checklist section: country+visa selectors with inline sourced examples"
```

---

### Task 14: sections/journey.js

**Files:**
- Create: `web/sections/journey.js`

**Interfaces:**
- Consumes: `window.appState` (reads/writes `visaType`, shared with the Checklist tab selection).
- Produces: registers `'journey'` with `AppShell`; ports `journey.html`'s existing `STEP_DEFS`/localStorage progress-tracker logic verbatim (it already works well and needs no functional change per the spec — only relocation into the section + reading visa type from shared state instead of its own `<select>`).

- [ ] **Step 1: Write `web/sections/journey.js`**

Port the existing `STEP_DEFS` object and `render()`/`loadState()`/`saveState()` functions from `journey.html` verbatim (same `STORAGE_KEY = "visaradar_journey_v1"`, same step definitions for f1/j1/h1b), with two changes: (a) the visa-type `<select>` is replaced by reading `state.get().visaType` from `window.appState` (mapping `'F-1'→'f1'`, `'J-1'→'j1'`, `'H-1B'→'h1b'` to match the existing lowercase keys in `STEP_DEFS`) and re-rendering on `state.subscribe`, so switching visa type in the Checklist tab also updates My Journey; (b) mount into the passed `container` instead of a hardcoded `#stages` on `document`.

```js
(function(){
  "use strict";
  var STORAGE_KEY = "visaradar_journey_v1";

  var STEP_DEFS = {
    f1: [
      { id: "docs", title: "Documents gathered", desc: "I-20, financial proof, acceptance letter, passport" },
      { id: "fee", title: "SEVIS I-901 fee paid", desc: "Self-reported — pay only at fmjfee.com, never here" },
      { id: "ds160", title: "DS-160 submitted", desc: "Online nonimmigrant visa application, at ceac.state.gov" },
      { id: "scheduled", title: "Interview scheduled", desc: "Booked at your local U.S. embassy or consulate" },
      { id: "interviewed", title: "Interview completed", desc: "" },
      { id: "decision", title: "Decision received", desc: "Approved, denied, or administrative processing (221g)" }
    ],
    j1: [
      { id: "docs", title: "Documents gathered", desc: "DS-2019, financial proof, program sponsor info, passport" },
      { id: "fee", title: "SEVIS I-901 fee paid", desc: "Self-reported — pay only at fmjfee.com, never here" },
      { id: "ds160", title: "DS-160 submitted", desc: "Online nonimmigrant visa application, at ceac.state.gov" },
      { id: "scheduled", title: "Interview scheduled", desc: "Booked at your local U.S. embassy or consulate" },
      { id: "interviewed", title: "Interview completed", desc: "" },
      { id: "decision", title: "Decision received", desc: "Approved, denied, or administrative processing (221g)" }
    ],
    h1b: [
      { id: "docs", title: "Documents gathered", desc: "Approved I-129 petition, I-797, employer support letter" },
      { id: "fee", title: "Visa fee paid", desc: "Self-reported — pay only through official DoS channels" },
      { id: "ds160", title: "DS-160 submitted", desc: "Online nonimmigrant visa application, at ceac.state.gov" },
      { id: "scheduled", title: "Interview scheduled", desc: "Booked at your local U.S. embassy or consulate" },
      { id: "interviewed", title: "Interview completed", desc: "" },
      { id: "decision", title: "Decision received", desc: "Approved, denied, or administrative processing (221g)" }
    ]
  };

  function loadState(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object") ? parsed : null;
    } catch(e){ return null; }
  }

  function saveState(s){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e){}
  }

  function checkIcon(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
  }

  var VISA_KEY_MAP = { 'F-1': 'f1', 'J-1': 'j1', 'H-1B': 'h1b' };

  function mount(container, appState){
    container.innerHTML =
      '<p style="font-size:13px; color:var(--ink-soft); padding:10px 14px; background:rgba(255,149,0,0.08); border-radius:10px; border:1px solid rgba(255,149,0,0.2); margin-bottom:20px;">' +
        'This page makes zero network calls. Your progress is saved only in this browser (localStorage).</p>' +
      '<div class="progress-wrap" style="margin-bottom:20px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px;">' +
          '<span id="journey-pct" style="font-size:28px; font-weight:700;"></span>' +
          '<span id="journey-label" style="font-size:13px; color:var(--ink-soft);"></span>' +
        '</div>' +
        '<div style="height:8px; border-radius:999px; background:rgba(0,0,0,0.06); overflow:hidden;"><div id="journey-bar" style="height:100%; border-radius:999px; background:var(--accent); transition:width .4s cubic-bezier(0.16,1,0.3,1); width:0%;"></div></div>' +
      '</div>' +
      '<ul id="journey-stages" class="glass" style="list-style:none; margin:0; padding:6px; display:flex; flex-direction:column; gap:10px;"></ul>' +
      '<div id="journey-celebrate" class="glass" style="display:none; padding:32px 22px; text-align:center; margin-top:20px;">' +
        '<div style="font-size:40px; margin-bottom:8px;">🎉</div><h2 style="font-size:22px; margin:0 0 6px;">Congratulations!</h2>' +
        '<p style="font-size:14px; color:var(--ink-soft); margin:0;">You made it through the whole process. Good luck on the next chapter.</p>' +
      '</div>';

    var stagesEl = container.querySelector('#journey-stages');
    var pctEl = container.querySelector('#journey-pct');
    var labelEl = container.querySelector('#journey-label');
    var barEl = container.querySelector('#journey-bar');
    var celebrateEl = container.querySelector('#journey-celebrate');

    var visaKey = VISA_KEY_MAP[appState.get().visaType] || 'f1';
    var stored = loadState() || { visaType: visaKey, steps: {} };
    var localState = stored;

    function render(){
      var defs = STEP_DEFS[localState.visaType] || STEP_DEFS.f1;
      stagesEl.innerHTML = "";
      var doneCount = 0;

      defs.forEach(function(def){
        var stepState = localState.steps[def.id] || { done: false, note: "" };
        if (stepState.done) doneCount++;

        var li = document.createElement("li");
        li.style.cssText = "padding:16px 18px; display:flex; flex-direction:column; gap:10px;";

        var row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; gap:14px;";

        var btn = document.createElement("button");
        btn.type = "button";
        btn.style.cssText = "flex:none; width:26px; height:26px; border-radius:50%; border:2px solid " +
          (stepState.done ? "var(--strong)" : "rgba(0,0,0,0.15)") + "; background:" + (stepState.done ? "var(--strong)" : "transparent") +
          "; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;";
        btn.innerHTML = stepState.done ? checkIcon() : '';
        btn.addEventListener("click", function(){
          stepState.done = !stepState.done;
          localState.steps[def.id] = stepState;
          saveState(localState);
          render();
        });

        var title = document.createElement("span");
        title.style.cssText = "font-size:15px; font-weight:600; flex:1;" + (stepState.done ? "color:var(--ink-soft); text-decoration:line-through;" : "");
        title.textContent = def.title;

        row.appendChild(btn);
        row.appendChild(title);
        li.appendChild(row);

        if (def.desc){
          var desc = document.createElement("p");
          desc.style.cssText = "font-size:13px; color:var(--ink-soft); margin:0; padding-left:40px;";
          desc.textContent = def.desc;
          li.appendChild(desc);
        }

        stagesEl.appendChild(li);
      });

      var total = defs.length;
      var pct = total ? Math.round((doneCount / total) * 100) : 0;
      pctEl.textContent = pct + "%";
      labelEl.textContent = doneCount + " of " + total + " steps done";
      barEl.style.width = pct + "%";

      var decisionDone = localState.steps.decision && localState.steps.decision.done;
      celebrateEl.style.display = decisionDone ? 'block' : 'none';
    }

    appState.subscribe(function(next){
      var mapped = VISA_KEY_MAP[next.visaType];
      if (mapped && mapped !== localState.visaType){
        localState.visaType = mapped;
        saveState(localState);
        render();
      }
    });

    render();
  }

  window.AppShell.registerSection('journey', { mount: mount });
})();
```

- [ ] **Step 2: Verify progress persists and visa-type sync works**

Navigate to `http://localhost:8123/app.html#journey`, check off 2 steps, confirm the percentage/bar update. Reload the page, confirm the checked steps persist (localStorage). Switch to the Checklist tab, change visa type to H-1B, switch back to My Journey, confirm the step list now shows the H-1B steps.

- [ ] **Step 3: Commit**

```bash
git add web/sections/journey.js
git commit -m "Add My Journey section: ported progress tracker, synced to shared visa-type state"
```

---

### Task 15: Retire the 4 merged standalone pages

**Files:**
- Modify: `web/browse.html`, `web/check.html`, `web/checklist.html`, `web/journey.html` (replace full contents with a redirect stub)

**Interfaces:** none — these become dead-simple static redirects, no JS dependencies.

- [ ] **Step 1: Replace each file's contents with a redirect stub**

Example for `web/browse.html` (repeat for the other 3, substituting the correct hash: `check.html`→`#check`, `checklist.html`→`#checklist`, `journey.html`→`#journey`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=app.html#browse">
<link rel="canonical" href="app.html#browse">
<title>VisaRadar — redirecting…</title>
</head>
<body>
<p>This page moved. <a href="app.html#browse">Continue to VisaRadar</a>.</p>
</body>
</html>
```

- [ ] **Step 2: Verify each redirect lands on the right section**

Run the local server, navigate to each of the 4 old URLs with the browser tool, confirm it lands on `app.html` with the matching tab active within ~1 second.

- [ ] **Step 3: Commit**

```bash
git add web/browse.html web/check.html web/checklist.html web/journey.html
git commit -m "Retire standalone Browse/Check/Checklist/My Journey pages, redirect into app.html"
```

---

### Task 16: Final full-flow verification

**Files:** none (verification only, no code changes expected unless it surfaces a real bug — if it does, fix inline and note which task's commit it amends-forward, per Global Constraints, as a new commit, not an amend).

- [ ] **Step 1: Run the complete click-path walk**

Run the local server (`python3 -m http.server 8123 --directory web &`). Using the browser tool, walk the full path from the spec's Verification section:
1. Nav consistency: visit `app.html`, `byok.html`, `guide.html`, `install.html`, `mcp.html` — confirm identical nav bar rendering (same 8 links, same logo, correct current-page highlight) and identical `.glass` visual treatment on each.
2. `app.html` tab-switching: click through Browse → Check → Checklist → My Journey → Browse, confirm no full-page reload at any point (network log stays free of new `app.html` document requests) and each section's content is where the earlier tasks left it (e.g. Journey's checked steps still checked).
3. Check flow end to end: pick a company, title, state; visualize; confirm the result card and evidence rows render correctly with real data from `employers.json`.
4. Checklist: switch visa type and country repeatedly, confirm inline examples update and no page ever navigates to an external URL on selection (only the "Source:" link at the bottom is a real external link).
5. Search icon: re-run the overlap check from Task 11 Step 2 at both default and 375px widths.
6. Dark mode: use `javascript_tool` to force `prefers-color-scheme: dark` (or toggle OS/browser dark mode if supported by the tool) and re-screenshot `app.html`'s Browse and Check sections, confirm readable contrast and no leftover light-mode-only styling.
7. Console: confirm zero CSP violations and zero JS errors across the whole walk (`read_console_messages` with no pattern, scan full output).

- [ ] **Step 2: Record the result**

If everything passes, no commit needed (this task doesn't touch code). If any step surfaces a real defect, fix it as a small targeted commit referencing which numbered check failed, then re-run Step 1 for that specific check before considering Task 16 done. Kill the local server when finished.

---

## Self-Review Notes

- **Spec coverage:** every spec section maps to a task — shared chrome (1-3), Check rework (4, 12), Checklist rework (5-8, 13), app.html single-page merge (9-11, 13-15), verification (16). Search icon investigation is folded into Tasks 11 and 16 rather than a standalone task, since it's a verify-then-fix-if-needed step, not a known-broken piece of code.
- **Placeholder scan:** the one intentional `_todo: true` placeholder (Task 5) is explicitly called out as expected and closed out by name in Tasks 6-8's own steps — not a silent gap.
- **Type consistency:** `employerToFilingRecord`'s output shape (`company/title/location/label/evidence/match_confidence`) is defined once in Task 4 and reused verbatim by Task 12's `render()`; `lookupChecklist`'s return shape (`documents/examples/notes/source`) is defined in Task 5 and consumed identically in Task 13; `window.appState`'s `get/set/subscribe` contract from Task 9 is used identically in Tasks 11-14.

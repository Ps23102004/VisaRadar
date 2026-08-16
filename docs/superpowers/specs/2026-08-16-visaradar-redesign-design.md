# VisaRadar frontend redesign

Date: 2026-08-16
Status: approved, pending implementation plan

## Problem

Current `web/` is 8 hand-written static HTML pages with no shared CSS/nav — each
page's `<style>` and nav markup is copy-pasted and has drifted (nav margins,
logo markup `<a>` vs `<span>`, motion/transitions present on 4/8 pages, absent
on the rest). Navigating between pages is a hard reload with no visual
continuity. The Check page requires hand-typed raw JSON. The Checklist page is
two static tabs (F-1/J-1) with no country dimension and links out to a generic
US visa page instead of showing country-specific document examples inline.
`browse.html`/`byok.html` each inline the full 67k-employer dataset
(~9.6MB), duplicated per page.

Theme colors (`--accent:#FF9500` orange, `#0A0A0C` ink, `#FBFBFD`/`#F5F5F7`
off-white) are already correct and consistent in the CSS across all 8 pages —
confirmed via hex grep, no blue found in any stylesheet. The "blue" reported
is native browser `<select>`/focus-ring chrome, not a CSS defect; the redesign
should suppress default browser chrome on form controls to close this gap.

## Goals

1. One coherent app experience for the core flow (Browse, Check, Checklist,
   My Journey) — no page reloads between them, shared filter state.
2. Visual consistency: one theme/nav source of truth, liquid-glass +
   motion applied uniformly, not per-page.
3. Check page driven by real data (company/country/visa filters), not raw
   JSON paste.
4. Checklist gives country-specific document examples inline, architected to
   hold any visa type × any country, seeded with real researched content for
   a bounded set now.
5. No framework, no build step — matches the project's existing static,
   zero-dependency style. Served via local HTTP server (confirmed), so
   `fetch()` of local files is available (no `file://` CORS constraint).

## Non-goals

- Full authoritative document-requirement research across all visa types and
  all countries. That's a distinct, large content project — flagged and
  deferred; this pass seeds an extensible schema with a bounded, sourced set.
- Backend/Python pipeline changes. This is a frontend redesign; the Python
  `visaradar` package (DOL pipeline, LCA matcher, MCP server) is out of scope
  except as a data source already producing `web/employers.json`.

## Architecture

### Page structure
- **`web/app.html`** (new, primary entry point): single page containing
  Browse / Check / Checklist / My Journey as sections. JS tab-switch between
  sections, no reload. One shared filter state object (company, from-country,
  visa type) at the top of the page — set once, all four sections read/react
  to it. This directly fixes the "select a country, get results accordingly"
  complaint and the checklist's dead-end link to a generic page.
- **`web/byok.html`, `web/install.html`, `web/mcp.html`** stay separate
  (setup/reference pages, not part of the interactive core flow). They pick
  up the shared theme/nav (below) for visual consistency but keep their own
  URLs.
- `web/browse.html`, `web/check.html`, `web/checklist.html`, `web/journey.html`
  are retired (content moves into `app.html` sections); until DNS/bookmarks
  are a concern, leave a one-line redirect stub at the old paths pointing to
  `app.html#<section>`.

### Shared chrome
- **`web/theme.css`**: extracted CSS custom properties, base typography, the
  `.glass` utility (`backdrop-filter: blur(24px) saturate(180%)`), and a small
  shared motion utility set (`.fade-in`, `.stagger`, `.press`) so glass +
  motion apply uniformly across all 4 remaining pages. Includes explicit
  `appearance: none` + custom chevron/focus styling on `<select>`/`<input>` to
  remove native browser chrome (closes the reported "blue" gap).
- **`web/nav.js`**: renders the top nav (logo, link to the app, links to
  Bring-your-key/Install/MCP, correct current-page state) into a
  `<div class="nav-mount">` on each page. Single source of truth, replaces
  the 8 drifted copies.

### Data
- `web/employers.json` (10.7MB, already produced by the Python pipeline)
  is fetched once by `app.html` via `fetch('employers.json')` — no new data
  file needed, no more inlining it into page HTML. Removing it from
  `browse.html`/`byok.html`'s inline `<script>` drops those pages from
  ~10.8MB to a normal-sized static file.
- **`web/checklist-data.js`**: new file, schema
  `{ "F-1": { countries: { "IN": {documents:[...], examples:[...]}, ...,
  "default": {...} } }, "J-1": {...}, "H-1B": {...} }` — built to hold any
  visa type/country pair. Seeded now with real, sourced content (USCIS,
  travel.state.gov, embassy pages — not invented) for F-1/J-1/H-1B ×
  ~15-20 countries common in DOL/LCA filings (India, China, Mexico, Nigeria,
  Philippines, Brazil, South Korea, Canada, UK, Germany, and similar).
  Everything else falls back to the visa type's `default` entry cleanly.

### Check section rework
Replace the raw JSON textarea with Company (autocomplete over
`employers.json`), From-country, and Visa-type controls, feeding the shared
filter state. Submitting looks up matching record(s) and renders through the
existing `render(data)` function (reused as-is). A collapsed "paste custom
JSON" affordance remains for power users but is not the default path.

### Search icon overlap
No static CSS conflict found by grep in `browse.html`'s `.search-wrap` /
`.search-ico` rules — likely a runtime issue (padding mismatch at some
viewport/font size), not visible from source alone. Reproduce live against
the running local server (browser tool) before changing anything, then fix
against the confirmed cause.

## Verification

Before calling this done: run the local server, walk the full click path in
a real browser — nav consistency across all 4 remaining pages, search input
rendering, Check filter flow end to end (pick company/country/visa → see
results), Checklist country switch showing inline country-specific examples,
and the app page's section tab-switching (confirm no reload, state persists
across sections). Not satisfied by diff review alone.

## Execution roster

Per user instruction: frontend = Codex GPT-5.6 Sol (theme.css/nav.js/motion
system — taste-critical) + Codex Terra (mechanical: app.html section
wiring, retiring old pages, employers.json fetch wiring). Backend/content =
Opus 5 or Kimi K3 for checklist-data.js research + authoring (accuracy-
critical, needs real sourcing) with Sonnet 5 review; Sonnet 5/GLM 5.3 for
Check-section matching logic and mechanical data wiring.

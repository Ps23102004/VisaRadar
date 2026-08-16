# Final review fix wave — 2026-08-16

## Fixes delivered

1. **App navigation hash handling** — `web/app.html` now tracks the active section, listens for `hashchange`, and remounts the canonical nav after every section change. Same-page nav clicks and browser history now update both the visible section and nav highlight.
2. **Attribute-safe escaping** — updated the three copied `esc()` helpers in `web/sections/browse.js`, `check.js`, and `checklist.js` to escape both quote types after DOM escaping. This protects option values and checklist source-link attributes.
3. **Check company autocomplete** — replaced the 67,722-option `select` in `web/sections/check.js` with a search field and up-to-50 clickable matches powered by `VisaRadarMatcher.filterEmployers`. The selected employer object is retained directly, populates title/state choices, and is used for visualization. Shared-state preselection only selects an exact case-insensitive name or a unique match.
4. **Journey visa authority** — `web/sections/journey.js` now always takes its active visa type from shared Checklist state while retaining saved step progress.
5. **Mounted-section filter synchronization** — `web/app.html` dispatches state changes to mounted sections with `onFilterChange`; Browse reflects companies chosen in Check, and Check safely reflects external query changes without overwriting in-progress typing. A follow-up guard clears a stale Check selection when an external company change supersedes it.
6. **BYOK select affordance** — removed `select` from BYOK’s local light/dark input background selectors so `theme.css` retains responsibility for the Provider-select chevron.
7. **Glass pointer tracking** — moved the shared pointer-position listener to `web/lib/nav.js`, attaching it once from `mountNav()`, and removed duplicate handlers from `byok.html`, `guide.html`, `install.html`, and `mcp.html`. App now receives the same effect.
8. **Current-page documentation and links** — updated README’s Web section for unified `app.html` tabs/shared state and changed Guide links to direct `app.html#checklist` / `app.html#journey` targets.

## Deviations / concerns

No functional deviations. The requested library suite passed. A local static server was started for browser smoke testing, but Playwright is not installed in this worktree, so automated browser interaction assertions could not run; no browser-test claim is made here.

## Test output

```text
$ node --test web/lib/*.test.js
TAP version 13
1..21
# tests 21
# suites 0
# pass 21
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 47.333375
```

## Commits

- `bd9e219` Fix app section hash navigation
- `ee5d087` Escape quotes in rendered attributes
- `293c8a3` Replace Check company select with search picker
- `ef1be67` Honor shared visa selection in journey
- `da595c5` Synchronize mounted sections through app state
- `ac38444` Clear stale Check selection on filter sync
- `104c78f` Restore BYOK provider select chevron
- `501420e` Centralize glass pointer tracking
- `c46f5c3` Document unified web experience

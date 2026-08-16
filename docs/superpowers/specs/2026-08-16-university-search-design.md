# University Search (Job/Study Toggle) — Design

## Goal

Extend the existing "Ask AI" natural-language search on the Browse tab so it can search real US graduate schools, not just real US employers, controlled by a Job/Study toggle. A student typing "masters in business, low tuition, warm climate" should get real schools back — not irrelevant employer records, which is the bug that motivated this spec.

## Background

VisaRadar's Browse tab already has an "Ask AI" feature: a 3-stage grounded pipeline (LLM extracts constraints → JS filters real `employers.json` records → LLM ranks only the real candidates, with every returned key validated against the real candidate list to prevent hallucination). It only ever searched employers. A user asked it a university question and got employer records back (technically correct per its actual scope, useless for the question asked).

## Non-goals

- No separate "Universities" tab. Everything lives inside the existing Ask AI box on Browse.
- The static, non-AI filterable list below the Ask AI box (company name/state filter) is untouched — stays company-only.
- No real weather/climate data. Climate stays a rough state-bucket heuristic, same approximation already used and disclosed for "avoid cold states" in company search.
- No precise field-of-study guarantee. College Scorecard's per-program (CIP code) data is a second API call per school; if the implementation can't cheaply verify a school offers a specific field, it says so honestly ("can't verify field match") rather than claim it — same honesty rule the existing pipeline already follows for climate.
- No new account system, no server, no build step. Pure client-side, same as the rest of the app.

## Architecture

Single entry point, mode-switched:

- Browse tab's Ask AI `<details id="ask-ai-panel">` gets a Job / Study toggle rendered above the `#ask-ai-query` textarea. Default: Job (current behavior, zero change for existing users).
- The toggle is local UI state (not persisted to localStorage — resets to Job on reload, cheapest correct default since most sessions are one task).
- Toggle value changes three things at render time:
  1. Textarea placeholder text.
  2. Which pipeline `runAISearch()` calls (existing employer pipeline vs new school pipeline).
  3. Which result-card renderer is used for `#ask-ai-results`.
- Everything else about the box (find button, status line, shortlist/next flow, back button) is shared chrome — same DOM ids, same event wiring pattern, branching only on toggle state where the two pipelines actually differ.

## Data source

**College Scorecard API** (`https://api.data.gov/ed/collegescorecard/v1/schools`), operated by the US Dept. of Education. Free, requires a personal API key (self-registered at api.data.gov, same BYOK pattern as the LLM provider keys already in this app — never entered by the assistant, only by the user's own hand).

Fields pulled per school (via the API's `fields=` query param, to keep responses small):
- `school.name`, `school.city`, `school.state`
- `latest.cost.tuition.in_state`, `latest.cost.tuition.out_of_state`
- `latest.admissions.admission_rate.overall`
- `latest.student.grad_students`
- `school.ownership` (public/private, for context in result cards)
- `latest.school.degrees_awarded.graduate` (filter: only schools that award graduate degrees, since this app's audience is F-1 grad-track students per the existing Checklist/Journey content)

## New files

- `web/lib/scorecard.js` — College Scorecard client. Dual-export UMD module, same pattern as `web/lib/llm.js` and `web/lib/matcher.js`. Exposes:
  - `buildSchoolQuery(apiKey, constraints)` → URL string (pure function, testable without network)
  - `normalizeSchool(rawApiRecord)` → `{ name, city, state, tuitionInState, tuitionOutState, admitRate, gradEnrollment, control }` (pure function, testable without network)
  - `fetchSchools(apiKey, constraints, opts)` → async, calls `fetchSchoolQuery` then normalizes the array of results
- `web/lib/scorecard.test.js` — `node:test` coverage for `buildSchoolQuery` and `normalizeSchool` only (the pure functions). No live network calls in tests, matching the existing `web/lib/*.test.js` convention.

## Modified files

- `web/sections/browse.js`:
  - Add toggle markup + state inside `renderAskAI()` (the function that currently renders the `#ask-ai-panel` content).
  - Add `constraintPromptSchools(query, strict)` and `rankingPromptSchools(query, candidates, strict)` — same shape as the existing `constraintPrompt`/`rankingPrompt` but for school fields (field of study, tuition ceiling, region) instead of employer fields (state, wage, keywords).
  - Add `filterSchoolCandidates(schools, constraints)` — mirrors `filterCandidates`, filtering the already-fetched school list from `scorecard.js` by tuition ceiling and state bucket.
  - Add `validateSchoolRanking(raw, candidates)` — same hallucination guard as `validateRanking`, keyed on school name (Scorecard has no stable short key like `employers.json`'s `k`; use `school.name` + `school.state` as the unique key since Scorecard doesn't expose a simpler stable id in the fields being pulled).
  - `configuredProvider()` gains a second read: the Scorecard API key from `localStorage.visaradar_scorecard_key`, independent of the LLM provider key (this is a different service).
- `web/byok.html`: add a "College Scorecard API key" field, shown always (not provider-dependent — it's orthogonal to the LLM provider choice), persisted as `visaradar_scorecard_key`, with a short explanation + link-style hint text (not a live link if that pattern doesn't already exist elsewhere — match existing page conventions) on how to get a free key from api.data.gov.
- `web/app.html` and `web/byok.html`: CSP `connect-src` gains `https://api.data.gov`.

## Data flow (Study mode)

1. User types a query, Study toggle is on, clicks "Find matches."
2. Stage 1: `callLLM` with `constraintPromptSchools(query)` → `{ fieldOfStudy, maxTuition, region, keywords }`. Same retry-with-stricter-prompt behavior as the company pipeline if parsing fails.
3. Stage 2: `scorecard.fetchSchools(apiKey, constraints)` — real API call, returns real school records. If the field-of-study can't be filtered server-side precisely, this stage does its best (e.g. state/tuition/graduate-degree filters only) and stage 3's prompt is told explicitly that field-of-study match is unverified, so the LLM's reasons say so rather than overclaim.
4. Stage 3: `callLLM` with `rankingPromptSchools(query, candidates)` → ranked list with one-sentence reasons, each reason describing only its own school.
5. `validateSchoolRanking` drops any school name not present in the real candidate list, dedupes, caps at 8 (same cap as company search).
6. Render into `#ask-ai-results` using a school card layout: name, city/state, tuition (in-state/out-of-state), admission rate, AI-written reason — parallel to the existing company card's name/states/wage/reason layout.

## Error handling

- No Scorecard key set (Study mode selected) → same "set up a provider" empty-state pattern already used for missing LLM keys, with Study-specific copy pointing at the new byok.html field.
- Scorecard API failure (network error, bad key, rate limit) → surfaced the same way `callLLM` surfaces provider errors: read the response body, show a truncated snippet, no silent failure.
- Toggling Job ↔ Study mid-session clears any in-progress results/status from the other mode (no stale company results shown under a Study query or vice versa).

## Testing

- `web/lib/scorecard.test.js`: `buildSchoolQuery` (correct URL/params for a given constraints object, including the `fields=` allowlist and the graduate-degree filter), `normalizeSchool` (maps a raw Scorecard API record shape to the app's normalized shape, handles missing/null fields gracefully since not every school reports every field).
- Manual/live verification (same pattern used throughout this project): syntax-check with `node -c`, then live-test in a real browser with the controller's own Scorecard key — the assistant does not enter API keys into any form itself.

## Open questions carried into the plan (not blocking, plan-level detail)

- Exact `fields=` allowlist string and exact College Scorecard filter param names (e.g. `school.degrees_awarded.graduate=1`) — verify against current College Scorecard API docs at plan-writing time, since field names have changed across API versions historically.
- Whether field-of-study filtering is worth a second (CIP-code) API call per candidate school, or whether "unverified field match" honesty is the permanent behavior — default to the honesty-only approach for v1 per the non-goals above; a second call can be added later if it proves cheap enough in real testing.

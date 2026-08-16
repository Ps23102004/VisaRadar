# Ask AI / LLM follow-up fixes

Date: 2026-08-16

1. **Anthropic browser CORS:** Added `anthropic-dangerous-direct-browser-access: true` in the Anthropic request headers in `web/lib/llm.js`.
2. **OpenAI reasoning-model temperature:** `web/lib/llm.js` now omits `temperature` for the `openai` provider while retaining `temperature: 0` for other OpenAI-compatible providers.
3. **Provider error diagnostics:** `web/lib/llm.js` now reads up to 300 characters of an unsuccessful response body and appends it to the thrown provider-status error.
4. **Robust JSON and ranking retry:** `web/sections/browse.js` removes `<think>` blocks, accepts full fenced JSON, and extracts JSON wrapped in prose. Ranking now retries once with an explicit JSON-only instruction when the first ranking response cannot be parsed.
5. **Ranking context:** `web/sections/browse.js` adds a compact candidate-field legend, provides top job titles as `t`, and changes the requested count to “up to 8 matches.”
6. **Grounding copy:** `web/sections/browse.js` now distinguishes verified VisaRadar company records from unverified AI-written reasons.
7. **Wage outliers:** `web/sections/browse.js` demotes wages above $2,000,000 behind plausible wages instead of dropping those companies. The regular Browse view also has a single subtle DOL-wage-data caveat beneath the search box.
8. **Anthropic determinism:** Added `temperature: 0` to the Anthropic request body in `web/lib/llm.js`.
9. **BYOK timeout:** Added `timeoutMs: 45000` to the `VisaRadarLLM.callLLM` call in `web/byok.html`.
10. **Return to Ask AI:** Added a “← Back to search” control above the generated application links in `web/sections/browse.js`; it returns to the Ask AI form.

## Validation

- Passed: `node -c web/lib/llm.js`
- Passed: `node -c web/sections/browse.js`
- Passed: `git diff --check`
- Re-read the updated `web/byok.html` call site for the timeout option.

## Concerns / deviations

- The controller-owned live scripts were not run, as requested: `/private/tmp/claude-501/-Users-parthsingh/db925213-bd8b-425b-b154-ff05df886e8a/scratchpad/test-llm.mjs` and `test-ask-ai.mjs`. The controller should rerun them after these commits.
- Existing uncommitted `web/lib/llm.js` changes that increase output-token limits and skip provider thinking blocks were preserved; they are compatible with these fixes.

# Ask AI follow-up fix report

Date: 2026-08-16

## Changes

1. Code-fenced JSON responses
   - Added `stripCodeFence(raw)` in `web/sections/browse.js`.
   - `parseConstraints` and `validateRanking` now strip a complete optional `json` code fence before calling `JSON.parse`.

2. Caller-specific Anthropic system prompts
   - `VisaRadarLLM.callLLM` now accepts `opts.system`; Anthropic uses it when provided and otherwise uses the generic default: `Follow the user's instructions exactly and respond only in the exact format requested.`
   - The Bring Your Own Key job-posting call now explicitly supplies its original job-posting system prompt.
   - Ask AI supplies distinct constraint-extraction and grounded-ranking system prompts, including on the extraction retry.

3. Ranking reason containment
   - Tightened the ranking prompt so every reason describes only the recommended company and does not name, mention, or compare to another company.

## Validation

```text
$ node -c web/lib/llm.js
(exit 0; no output)

$ node -c web/sections/browse.js
(exit 0; no output)

$ git diff --check
(exit 0; no output)
```

Re-read the updated inline `VisaRadarLLM.callLLM(...)` call in `web/byok.html`; its added options object is syntactically correct.

## Commits

- `b77951e17cf8df92f5177da46eaf5f4509a8ca43` — `fix: harden Ask AI LLM responses`

## Concerns

None. An unrelated, pre-existing untracked `.gstack/` directory was intentionally left untouched.

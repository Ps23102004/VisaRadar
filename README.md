# VisaRadar

Paste a job posting, get a real answer on whether that employer actually sponsors work visas — backed by a local LLM extraction pass and **real U.S. Department of Labor LCA filing data** (H-1B / H-1B1 / E-3), not a curated job board's marketing copy.

Every other "visa sponsor" resource is a database you browse. VisaRadar is a tool you point at *any* posting.

```
$ radar check "Senior SWE at Google LLC. We sponsor H-1B for qualified candidates." --json
{
  "company": "Google LLC",
  "title": "Senior SWE",
  "label": "strong",
  "evidence": [
    "total filings: 9673",
    "certified percentage: 99%",
    "increasing filing volume from 2025 (897) to 2026 (7383)",
    "top job titles: Software Engineer, Technical Program Manager, Product Manager"
  ],
  "match_confidence": 1.0
}
```

## Install

```bash
pip install -e .
```

## Prerequisites

An LLM backend. VisaRadar isn't tied to one provider:

- **Local (default, free)**: [Ollama](https://ollama.com/) running at `127.0.0.1:11434` with a model pulled (`ollama pull qwen3.8:27b-mlx` or any model you prefer).
- **Any OpenAI-compatible API**: OpenRouter, Groq, Together, LM Studio, vLLM, or OpenAI itself. Set `--model provider/model` and export that provider's API key env var (see `radar config` for the exact var name per provider).

The bundled snapshot (`visaradar/lca_snapshot.jsonl.gz`) covers FY2024–FY2026, built from DOL's own public disclosure files. No network access needed to look up a company — only the LLM call needs connectivity (and none at all if you're running fully local).

## Usage

```bash
# Full pipeline: LLM extraction + real filing data
radar check "<paste a job posting>"
radar check --file posting.txt
radar check --url https://company.com/careers/some-role

# Direct lookup, no LLM call at all
radar company "Google"
radar company "Gooogle Inc"          # fuzzy match, shows candidates + scores

# Point it at any provider
radar check "..." --model openrouter/google/gemini-3.7-flash
export OPENROUTER_API_KEY=...

# See what's resolved
radar config
radar history --limit 10
```

### Local-first storage, Obsidian-friendly

Every check is logged to `~/.visaradar/history.jsonl`, and — unless you pass `--no-notes` — also written as a Markdown note with frontmatter to `~/.visaradar/notes/`. Point `--data-dir` (or `VISARADAR_DATA_DIR`) at a folder inside your own Obsidian vault and every lookup just shows up there as a normal note. VisaRadar never deletes or prunes; retention is entirely yours.

### Web

A self-contained, zero-dependency multi-page site in `web/` — no server needed, just open the HTML files:

- **`browse.html`** — search and filter all 67,722 employers in the bundled dataset by company name or state (e.g. "CA"), right in the browser.
- **`check.html`** — paste `radar check --json` output, see it rendered as a result card.
- **`byok.html`** — no CLI install needed: pick a provider (or local Ollama, no key), paste your API key, paste a posting, and it calls the LLM directly from the browser. Your key never leaves local storage except to the provider you chose.
- **`journey.html`** — a personal step-by-step tracker for the weeks between an offer and a visa in hand (documents, SEVIS fee, DS-160, interview, decision). Self-reported checkboxes only — no payments processed, no forms filed, nothing sent anywhere. Progress is saved in your browser's local storage, so it survives the real multi-week timeline.
- **`checklist.html`** — real F-1/J-1 document checklists and SEVIS fee amounts ($350 / $220), sourced and cited from travel.state.gov and ice.gov, not a blog's guess. Explicitly does not include "sample interview questions" — the State Department publishes none, and VisaRadar won't fabricate them for something this high-stakes to get wrong. Links out to the official SEVP school search and J-1 sponsor list rather than claiming bulk coverage that doesn't publicly exist.
- **`install.html`** / **`mcp.html`** — CLI reference and MCP setup instructions.

### MCP

```bash
pip install -e ".[mcp]"
```

Exposes `visaradar_company` (direct lookup, no LLM) and `visaradar_check` (full extraction pipeline) as MCP tools — attach VisaRadar to Claude Desktop, Claude Code, or any MCP client. See `web/mcp.html` for config.

## Why this exists

Every "find visa-sponsor jobs" resource on the internet is a curated database — someone else's judgment call about which companies to include, updated on someone else's schedule. VisaRadar inverts that: point it at *any* posting from *any* company, and it cross-references real DOL LCA filing history (public domain, quarterly, authoritative — not scraped from a SaaS product's ToS-violating aggregation) to give you an evidence-backed answer, not a vibe. It's the tool a developer navigating this themselves would actually want, not a lead-gen database.

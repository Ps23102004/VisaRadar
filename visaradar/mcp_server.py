from __future__ import annotations

import os

from mcp.server import MCPServer

from visaradar import config, extract, lca_data, llm_client, matcher, score, storage

mcp = MCPServer("VisaRadar")


def _assess(record, stance: str, fuzzy_candidates: list) -> dict:
    result = score.assess(record, stance)
    if fuzzy_candidates and fuzzy_candidates[0].score < 0.999:
        result.evidence.append(
            f"matched to: {record.display_name} (fuzzy match, not an exact name match)"
        )
    return {
        "label": result.label,
        "evidence": result.evidence,
        "match_confidence": fuzzy_candidates[0].score if fuzzy_candidates else 0.0,
        "matched_employer": record.display_name if record else None,
    }


@mcp.tool()
def visaradar_company(name: str) -> dict:
    """Look up an employer's real DOL H-1B/H-1B1/E-3 filing history and get a
    sponsorship-likelihood assessment. No LLM call, no posting text needed --
    a direct lookup against a bundled snapshot of real filing data."""
    snapshot = lca_data.load_snapshot(lca_data.resolve_snapshot_path(storage.resolve_data_dir(None)))
    candidates = matcher.match(name, snapshot)
    record = candidates[0].record if candidates else None
    return _assess(record, "silent", candidates)


@mcp.tool()
def visaradar_check(posting_text: str, model: str | None = None) -> dict:
    """Extract company/title/sponsorship-stance from a job posting via an LLM,
    then cross-reference the company against real DOL filing history. Uses the
    configured provider (VISARADAR_MODEL env var, or the local Ollama default
    if unset) -- pass `model` as 'provider/model' to override for this call."""
    data_dir = storage.resolve_data_dir(None)
    try:
        cfg = config.resolve_provider(
            model, None, os.environ.get("VISARADAR_MODEL"), os.environ.get("VISARADAR_BASE_URL"),
            os.path.join(data_dir, "config.yaml"),
        )
        client = llm_client.make_client(cfg)
        prompt = extract.build_extraction_prompt(posting_text)
        raw = client.chat(prompt)
        try:
            posting = extract.parse_extraction(raw)
        except ValueError:
            raw = client.chat(prompt)
            posting = extract.parse_extraction(raw)
    except (llm_client.LLMConnectionError, ValueError) as exc:
        return {"error": str(exc)}

    snapshot = lca_data.load_snapshot(lca_data.resolve_snapshot_path(data_dir))
    candidates = matcher.match(posting.company, snapshot)
    record = candidates[0].record if candidates else None
    assessment = _assess(record, posting.stance, candidates)
    return {
        "company": posting.company,
        "title": posting.title,
        "location": posting.location,
        **assessment,
    }


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()

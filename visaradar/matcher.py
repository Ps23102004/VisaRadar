from __future__ import annotations

import re
from dataclasses import dataclass
import difflib
from visaradar.lca_data import EmployerRecord

# Brand -> legal-entity key prefixes. LCAs are filed under legal names, and big
# employers split across many of them, so an exact or fuzzy hit on one entity
# can miss most of the filings ("Amazon" is a 2-filing shell; the other 17
# Amazon entities hold 28,891) or miss entirely ("Meta" files as META PLATFORMS).
# Curated by hand, not derived: a generic prefix rollup also swallows
# APPLE TREE DENTAL and META SOFT. Add a brand here when a lookup misleads.
_GROUPS: dict[str, tuple[str, ...]] = {
    "AMAZON": ("AMAZON",),
    "AMAZONCOM": ("AMAZON",),
    "AWS": ("AMAZON WEB SERVICES",),
    "DELOITTE": ("DELOITTE",),
    "META": ("META PLATFORMS",),
    "FACEBOOK": ("META PLATFORMS",),
    "OPENAI": ("OPENAI OPCO",),
    "ANTHROPIC": ("ANTHROPIC PBC",),
    "JP MORGAN": ("JPMORGAN",),
    "JPMORGAN": ("JPMORGAN",),
    "JPMORGAN CHASE": ("JPMORGAN",),
}

_SUFFIXES = [
    "INCORPORATED",
    "CORPORATION",
    "HOLDINGS",
    "COMPANY",
    "GROUP",
    "LIMITED",
    "INC",
    "LLC",
    "LLP",
    "CORP",
    "LTD",
    "CO",
    "LP",
]


def normalize_name(name: str) -> str:
    upper = name.upper().strip()
    collapsed = re.sub(r"\s+", " ", upper)
    punct_removed = re.sub(r"[.,']", "", collapsed)
    stripped = punct_removed
    for suffix in _SUFFIXES:
        pattern = rf"\b{suffix}$"
        if re.search(pattern, stripped):
            stripped = re.sub(pattern, "", stripped).strip()
            break
    return stripped.strip()


@dataclass
class MatchCandidate:
    record: EmployerRecord
    score: float


def _merge(normalized: str, prefixes: tuple[str, ...], snapshot: dict[str, EmployerRecord]) -> EmployerRecord | None:
    members = [r for k, r in snapshot.items() if any(k == p or k.startswith(p) for p in prefixes)]
    if not members:
        return None
    members.sort(key=lambda r: sum(fy["filings"] for fy in r.by_fy.values()), reverse=True)
    top = members[0]
    by_fy: dict[str, dict[str, int]] = {}
    for r in members:
        for fy, counts in r.by_fy.items():
            acc = by_fy.setdefault(fy, {})
            for key, n in counts.items():
                acc[key] = acc.get(key, 0) + n
    # Titles, states and wage come from the largest entity: medians don't add.
    return EmployerRecord(
        name=normalized,
        display_name=f"{top.display_name} + {len(members) - 1} related" if len(members) > 1 else top.display_name,
        by_fy=by_fy,
        top_titles=top.top_titles,
        states=top.states,
        wage=top.wage,
        note=f"filings summed across {len(members)} related legal entities (largest: {top.display_name}); titles, states and wage are from that one" if len(members) > 1 else None,
    )


def match(company_name: str, snapshot: dict[str, EmployerRecord]) -> list[MatchCandidate]:
    normalized = normalize_name(company_name)

    if normalized in _GROUPS:
        merged = _merge(normalized, _GROUPS[normalized], snapshot)
        if merged:
            return [MatchCandidate(record=merged, score=1.0)]

    if normalized in snapshot:
        return [MatchCandidate(record=snapshot[normalized], score=1.0)]

    keys = list(snapshot.keys())
    close = difflib.get_close_matches(normalized, keys, n=3, cutoff=0.85)

    candidates: list[MatchCandidate] = []
    for candidate_key in close:
        ratio = difflib.SequenceMatcher(None, normalized, candidate_key).ratio()
        candidates.append(MatchCandidate(record=snapshot[candidate_key], score=ratio))

    candidates.sort(key=lambda c: c.score, reverse=True)

    return candidates

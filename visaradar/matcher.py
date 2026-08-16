from __future__ import annotations

import re
from dataclasses import dataclass
import difflib
from visaradar.lca_data import EmployerRecord

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


def match(company_name: str, snapshot: dict[str, EmployerRecord]) -> list[MatchCandidate]:
    normalized = normalize_name(company_name)

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

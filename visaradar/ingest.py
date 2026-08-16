from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from visaradar.matcher import normalize_name


@dataclass
class LCARow:
    employer_name: str
    case_status: str
    fiscal_year: str
    job_title: str
    worksite_state: str = ""


def aggregate(rows: list[LCARow]) -> dict[str, dict]:
    normalized_groups: dict[str, list[LCARow]] = {}
    original_names: dict[str, list[str]] = {}
    job_titles_by_employer: dict[str, list[str]] = {}
    states_by_employer: dict[str, list[str]] = {}

    for row in rows:
        norm = normalize_name(row.employer_name)
        normalized_groups.setdefault(norm, []).append(row)
        original_names.setdefault(norm, []).append(row.employer_name)
        job_titles_by_employer.setdefault(norm, []).append(row.job_title)
        if row.worksite_state:
            states_by_employer.setdefault(norm, []).append(row.worksite_state)

    result: dict[str, dict] = {}

    for norm, group in normalized_groups.items():
        name_counter = Counter(original_names[norm])
        display_name = name_counter.most_common(1)[0][0]

        by_fy: dict[str, dict[str, int]] = {}
        for row in group:
            fy = row.fiscal_year
            if fy not in by_fy:
                by_fy[fy] = {"filings": 0, "certified": 0, "denied": 0}
            by_fy[fy]["filings"] += 1
            if row.case_status.startswith("Certified"):
                by_fy[fy]["certified"] += 1
            if row.case_status == "Denied":
                by_fy[fy]["denied"] += 1

        title_counter = Counter(job_titles_by_employer[norm])
        top_titles = [title for title, _ in title_counter.most_common(5)]

        state_counter = Counter(states_by_employer.get(norm, []))
        states = [state for state, _ in state_counter.most_common()]

        result[norm] = {
            "name": norm,
            "display_name": display_name,
            "by_fy": by_fy,
            "top_titles": top_titles,
            "states": states,
        }

    return result

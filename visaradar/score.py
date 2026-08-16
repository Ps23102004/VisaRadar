from __future__ import annotations

from dataclasses import dataclass
from visaradar.lca_data import EmployerRecord

_LABEL_ORDER = ["none", "weak", "moderate", "strong"]


@dataclass
class Assessment:
    label: str
    evidence: list[str]


def assess(record: EmployerRecord | None, posting_stance: str) -> Assessment:
    if record is None:
        label = "none"
        evidence = ["no historical LCA filings found for this employer"]
        if posting_stance == "sponsors":
            label = "moderate"
            evidence.append("posting explicitly states sponsorship is offered, raising the assessment to moderate")
        elif posting_stance == "no_sponsor":
            evidence.append("posting explicitly states no sponsorship")
        return Assessment(label=label, evidence=evidence)

    total_filings = sum(fy["filings"] for fy in record.by_fy.values())
    total_certified = sum(fy["certified"] for fy in record.by_fy.values())
    certified_pct = round(100 * total_certified / total_filings) if total_filings else 0

    sorted_years = sorted(record.by_fy.keys())

    if len(sorted_years) < 2:
        trend_line = "insufficient history for a trend"
    else:
        most_recent_year = sorted_years[-1]
        prior_year = sorted_years[-2]
        most_recent_filings = record.by_fy[most_recent_year]["filings"]
        prior_filings = record.by_fy[prior_year]["filings"]
        if most_recent_filings > prior_filings:
            trend_line = f"increasing filing volume from {prior_year} ({prior_filings}) to {most_recent_year} ({most_recent_filings})"
        elif most_recent_filings < prior_filings:
            trend_line = f"decreasing filing volume from {prior_year} ({prior_filings}) to {most_recent_year} ({most_recent_filings})"
        else:
            trend_line = f"flat filing volume at {most_recent_filings} between {prior_year} and {most_recent_year}"

    if total_filings >= 20:
        base_label = "strong"
    elif total_filings >= 5:
        base_label = "moderate"
    elif total_filings >= 1:
        base_label = "weak"
    else:
        base_label = "none"

    label = base_label
    evidence: list[str] = []

    evidence.append(f"total filings: {total_filings}")
    evidence.append(f"certified percentage: {certified_pct}%")
    evidence.append(trend_line)

    if record.top_titles:
        evidence.append(f"top job titles: {', '.join(record.top_titles[:3])}")

    if posting_stance == "no_sponsor":
        if label in ("moderate", "strong"):
            label = "weak"
            evidence.append("posting explicitly states no sponsorship, capping the assessment at weak")
    elif posting_stance == "sponsors":
        if label in ("none", "weak"):
            label = "moderate"
            evidence.append("posting explicitly states sponsorship is offered, raising the assessment to moderate")

    return Assessment(label=label, evidence=evidence)

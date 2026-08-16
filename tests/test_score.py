from __future__ import annotations

from visaradar.score import assess
from visaradar.lca_data import EmployerRecord


def _record(filings_by_year: dict) -> EmployerRecord:
    return EmployerRecord(
        name="ACME",
        display_name="Acme Inc",
        by_fy=filings_by_year,
        top_titles=["Engineer"],
        states=[],
    )


def test_no_record_is_none_label():
    result = assess(None, "silent")
    assert result.label == "none"


def test_strong_threshold():
    record = _record({"2025": {"filings": 25, "certified": 20, "denied": 2}})
    result = assess(record, "silent")
    assert result.label == "strong"


def test_moderate_threshold():
    record = _record({"2025": {"filings": 7, "certified": 5, "denied": 1}})
    result = assess(record, "silent")
    assert result.label == "moderate"


def test_weak_threshold():
    record = _record({"2025": {"filings": 2, "certified": 1, "denied": 0}})
    result = assess(record, "silent")
    assert result.label == "weak"


def test_zero_filings_is_none():
    record = _record({"2025": {"filings": 0, "certified": 0, "denied": 0}})
    result = assess(record, "silent")
    assert result.label == "none"


def test_no_sponsor_stance_caps_at_weak():
    record = _record({"2025": {"filings": 50, "certified": 45, "denied": 2}})
    result = assess(record, "no_sponsor")
    assert result.label == "weak"


def test_sponsors_stance_raises_none_to_moderate():
    result = assess(None, "sponsors")
    assert result.label == "moderate"


def test_sponsors_stance_raises_weak_to_moderate():
    record = _record({"2025": {"filings": 2, "certified": 1, "denied": 0}})
    result = assess(record, "sponsors")
    assert result.label == "moderate"


def test_sponsors_stance_does_not_lower_strong():
    record = _record({"2025": {"filings": 25, "certified": 20, "denied": 2}})
    result = assess(record, "sponsors")
    assert result.label == "strong"


def test_trend_evidence_present_with_two_years():
    record = _record({
        "2024": {"filings": 5, "certified": 4, "denied": 0},
        "2025": {"filings": 10, "certified": 8, "denied": 1},
    })
    result = assess(record, "silent")
    assert any("increasing" in e for e in result.evidence)

from __future__ import annotations

from visaradar.matcher import normalize_name, match
from visaradar.lca_data import EmployerRecord


def test_normalize_strips_common_suffix():
    assert normalize_name("Google LLC") == "GOOGLE"
    assert normalize_name("Acme Corp.") == "ACME"
    assert normalize_name("Acme, Inc.") == "ACME"


def test_normalize_collapses_whitespace_and_case():
    assert normalize_name("  IBM   Corporation  ") == "IBM"


def test_normalize_no_suffix_unchanged():
    assert normalize_name("Netflix") == "NETFLIX"


def _record(name: str) -> EmployerRecord:
    return EmployerRecord(
        name=name,
        display_name=name.title(),
        by_fy={"2024": {"filings": 10, "certified": 8, "denied": 1}},
        top_titles=["Software Engineer"],
        states=[],
    )


def test_match_exact_hit():
    snapshot = {"GOOGLE": _record("GOOGLE")}
    results = match("Google LLC", snapshot)
    assert len(results) == 1
    assert results[0].score == 1.0
    assert results[0].record.name == "GOOGLE"


def test_match_fuzzy_hit():
    snapshot = {"MICROSOFT": _record("MICROSOFT")}
    results = match("Micorsoft", snapshot)
    assert len(results) >= 1
    assert results[0].record.name == "MICROSOFT"
    assert results[0].score < 1.0


def test_match_no_match_returns_empty():
    snapshot = {"GOOGLE": _record("GOOGLE")}
    results = match("Totally Unrelated Company Name Xyz", snapshot)
    assert results == []


def test_match_never_guesses_below_cutoff():
    snapshot = {"AMAZON": _record("AMAZON")}
    results = match("A", snapshot)
    assert results == []

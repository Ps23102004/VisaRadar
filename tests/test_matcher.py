from __future__ import annotations

from visaradar.matcher import normalize_name, match
from visaradar.lca_data import EmployerRecord


def test_normalize_strips_common_suffix():
    assert normalize_name("Google LLC") == "GOOGLE"
    assert normalize_name("Acme Corp.") == "ACME"
    assert normalize_name("Acme, Inc.") == "ACME"


def test_normalize_collapses_whitespace_and_case():
    assert normalize_name("  IBM   Corporation  ") == "IBM"


def test_normalize_llp_suffix_no_dangling_letter():
    # Regression: "LP" suffix pattern used to have no word boundary, so it
    # matched the tail of "LLP" too, leaving a stray "L" behind.
    assert normalize_name("KPMG LLP") == "KPMG"
    assert normalize_name("Deloitte LLP") == "DELOITTE"


def test_normalize_lp_suffix_still_works_standalone():
    assert normalize_name("Foo Bar LP") == "FOO BAR"


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


def _filings(name: str, n: int) -> EmployerRecord:
    r = _record(name)
    r.by_fy = {"2024": {"filings": n, "certified": n, "denied": 0}}
    return r


def test_brand_alias_finds_legal_name():
    snapshot = {"META PLATFORMS": _filings("META PLATFORMS", 7503)}
    for brand in ("Meta", "Facebook"):
        results = match(brand, snapshot)
        assert results and results[0].record.by_fy["2024"]["filings"] == 7503


def test_group_sums_sibling_entities_not_just_exact_shell():
    snapshot = {
        "AMAZON": _filings("AMAZON", 2),
        "AMAZONCOM SERVICES": _filings("AMAZONCOM SERVICES", 20072),
        "AMAZON WEB SERVICES": _filings("AMAZON WEB SERVICES", 3857),
    }
    rec = match("Amazon", snapshot)[0].record
    assert rec.by_fy["2024"]["filings"] == 23931
    assert "3 related legal entities" in rec.note


def test_ungrouped_name_is_not_prefix_merged():
    snapshot = {"APPLE": _filings("APPLE", 8344), "APPLE TREE DENTAL": _filings("APPLE TREE DENTAL", 4)}
    assert match("Apple", snapshot)[0].record.by_fy["2024"]["filings"] == 8344

from __future__ import annotations

from visaradar.ingest import LCARow, aggregate, annualize_wage


def test_aggregate_groups_by_normalized_name():
    rows = [
        LCARow(employer_name="Google LLC", case_status="Certified", fiscal_year="2024", job_title="SWE"),
        LCARow(employer_name="Google Inc.", case_status="Certified", fiscal_year="2024", job_title="SWE"),
        LCARow(employer_name="Amazon", case_status="Denied", fiscal_year="2024", job_title="SDE"),
    ]
    result = aggregate(rows)
    assert "GOOGLE" in result
    assert "AMAZON" in result
    assert result["GOOGLE"]["by_fy"]["2024"]["filings"] == 2
    assert result["GOOGLE"]["by_fy"]["2024"]["certified"] == 2
    assert result["AMAZON"]["by_fy"]["2024"]["denied"] == 1


def test_aggregate_certified_withdrawn_counts_as_certified():
    rows = [
        LCARow(employer_name="Acme", case_status="Certified - Withdrawn", fiscal_year="2024", job_title="Eng"),
    ]
    result = aggregate(rows)
    assert result["ACME"]["by_fy"]["2024"]["certified"] == 1


def test_aggregate_top_titles_most_common_first():
    rows = [
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Engineer"),
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Engineer"),
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Manager"),
    ]
    result = aggregate(rows)
    assert result["ACME"]["top_titles"][0] == "Engineer"


def test_aggregate_display_name_is_most_common_original_casing():
    rows = [
        LCARow(employer_name="ACME INC", case_status="Certified", fiscal_year="2024", job_title="Eng"),
        LCARow(employer_name="Acme Inc", case_status="Certified", fiscal_year="2024", job_title="Eng"),
        LCARow(employer_name="Acme Inc", case_status="Certified", fiscal_year="2024", job_title="Eng"),
    ]
    result = aggregate(rows)
    assert result["ACME"]["display_name"] == "Acme Inc"


def test_aggregate_multi_year_separated():
    rows = [
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Eng"),
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2025", job_title="Eng"),
    ]
    result = aggregate(rows)
    assert result["ACME"]["by_fy"]["2024"]["filings"] == 1
    assert result["ACME"]["by_fy"]["2025"]["filings"] == 1


def test_aggregate_empty_input():
    assert aggregate([]) == {}


def test_annualize_wage_year_unit():
    assert annualize_wage(100000, 120000, "Year") == 110000.0


def test_annualize_wage_hour_unit():
    assert annualize_wage(50, 60, "Hour") == 55 * 2080


def test_annualize_wage_no_to_uses_from():
    assert annualize_wage(100000, None, "Year") == 100000.0


def test_annualize_wage_missing_unit_returns_none():
    assert annualize_wage(100000, 120000, None) is None


def test_annualize_wage_missing_from_returns_none():
    assert annualize_wage(None, 120000, "Year") is None


def test_annualize_wage_unrecognized_unit_returns_none():
    assert annualize_wage(100000, 120000, "Fortnight") is None


def test_aggregate_computes_wage_stats():
    rows = [
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Eng", wage_annual=100000),
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Eng", wage_annual=120000),
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Eng", wage_annual=110000),
    ]
    result = aggregate(rows)
    wage = result["ACME"]["wage"]
    assert wage["n"] == 3
    assert wage["median"] == 110000


def test_aggregate_no_wage_data_is_none():
    rows = [
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Eng"),
    ]
    result = aggregate(rows)
    assert result["ACME"]["wage"] is None


def test_aggregate_states_ranked_by_frequency():
    rows = [
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Eng", worksite_state="CA"),
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Eng", worksite_state="CA"),
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Eng", worksite_state="NY"),
    ]
    result = aggregate(rows)
    assert result["ACME"]["states"] == ["CA", "NY"]


def test_aggregate_missing_state_does_not_crash():
    rows = [
        LCARow(employer_name="Acme", case_status="Certified", fiscal_year="2024", job_title="Eng"),
    ]
    result = aggregate(rows)
    assert result["ACME"]["states"] == []

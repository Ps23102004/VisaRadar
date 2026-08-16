from __future__ import annotations

from visaradar.ingest import LCARow, aggregate


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

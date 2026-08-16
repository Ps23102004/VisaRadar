from __future__ import annotations

import pytest

from visaradar.extract import parse_extraction


def test_clean_json():
    raw = '{"company": "Acme", "title": "Engineer", "location": "NY", "sponsorship_language": "", "stance": "silent"}'
    posting = parse_extraction(raw)
    assert posting.company == "Acme"
    assert posting.title == "Engineer"
    assert posting.stance == "silent"


def test_fenced_json():
    raw = '```json\n{"company": "Acme", "title": "Engineer", "location": "", "sponsorship_language": "", "stance": "sponsors"}\n```'
    posting = parse_extraction(raw)
    assert posting.company == "Acme"
    assert posting.stance == "sponsors"


def test_json_with_preamble_chatter():
    raw = 'Sure, here is the JSON:\n{"company": "Acme", "title": "Engineer", "location": "", "sponsorship_language": "", "stance": "no_sponsor"}\nHope that helps!'
    posting = parse_extraction(raw)
    assert posting.company == "Acme"
    assert posting.stance == "no_sponsor"


def test_garbage_raises():
    with pytest.raises(ValueError):
        parse_extraction("not json at all, sorry")


def test_missing_company_raises():
    raw = '{"title": "Engineer", "location": "", "sponsorship_language": "", "stance": "silent"}'
    with pytest.raises(ValueError):
        parse_extraction(raw)


def test_invalid_stance_defaults_to_silent():
    raw = '{"company": "Acme", "title": "Engineer", "location": "", "sponsorship_language": "", "stance": "maybe"}'
    posting = parse_extraction(raw)
    assert posting.stance == "silent"

from __future__ import annotations

from visaradar.cost_of_living import load_cost_of_living, adjusted_wage


def test_load_cost_of_living_has_all_states():
    data = load_cost_of_living()
    assert len(data) == 51  # 50 states + DC
    assert data["CA"]["rpp"] > 100  # California is above national average


def test_adjusted_wage_above_average_state_deflates():
    data = {"CA": {"name": "California", "rpp": 110.0, "year": "2024"}}
    result = adjusted_wage(110000, "CA", data)
    assert result == 100000


def test_adjusted_wage_below_average_state_inflates():
    data = {"AR": {"name": "Arkansas", "rpp": 90.0, "year": "2024"}}
    result = adjusted_wage(90000, "AR", data)
    assert result == 100000


def test_adjusted_wage_unknown_state_returns_none():
    data = {"CA": {"name": "California", "rpp": 110.0, "year": "2024"}}
    assert adjusted_wage(100000, "ZZ", data) is None

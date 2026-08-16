from __future__ import annotations

import importlib.resources
import json
from typing import Dict, Optional, TypedDict


class StateCOL(TypedDict):
    name: str
    rpp: float
    year: str


def load_cost_of_living() -> Dict[str, StateCOL]:
    """State-level BEA Regional Price Parity (RPP) index, 100 = national average.

    Source: BEA Regional Price Parities by State and Metro Area, mirrored via
    FRED (series {STATE}RPPALL). A state's RPP of 110 means prices there run
    ~10% above the national average; 90 means ~10% below.
    """
    path = importlib.resources.files(__package__).joinpath("cost_of_living.json")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def adjusted_wage(annual_wage: float, state: str, col_data: Optional[Dict[str, StateCOL]] = None) -> Optional[float]:
    """Annual wage deflated to national-average purchasing power for the given state.

    Returns None if the state isn't in the dataset (e.g. non-US worksite code).
    """
    if col_data is None:
        col_data = load_cost_of_living()
    entry = col_data.get(state)
    if not entry:
        return None
    return round(annual_wage / (entry["rpp"] / 100))

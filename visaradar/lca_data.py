from __future__ import annotations

import gzip
import importlib.resources
import json
import os
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class EmployerRecord:
    name: str
    display_name: str
    by_fy: Dict[str, Dict[str, int]]
    top_titles: List[str]
    states: List[str]


def load_snapshot(path: str) -> Dict[str, EmployerRecord]:
    records: Dict[str, EmployerRecord] = {}
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            rec = EmployerRecord(
                name=obj["name"],
                display_name=obj.get("display_name", obj["name"]),
                by_fy=obj.get("by_fy", {}),
                top_titles=obj.get("top_titles", []),
                states=obj.get("states", []),
            )
            records[rec.name] = rec
    return records


def default_snapshot_path() -> str:
    return str(importlib.resources.files(__package__).joinpath("lca_snapshot.jsonl.gz"))


def resolve_snapshot_path(data_dir: str) -> str:
    candidate = os.path.join(data_dir, "lca_snapshot.jsonl.gz")
    if os.path.isfile(candidate):
        return candidate
    return default_snapshot_path()

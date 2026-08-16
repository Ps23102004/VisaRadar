from __future__ import annotations

import hashlib
import json
import os
import re
import time
from datetime import datetime

import yaml


def resolve_data_dir(cli_arg: str | None) -> str:
    path: str | None = None
    if cli_arg:
        path = cli_arg
    else:
        path = os.environ.get("VISARADAR_DATA_DIR")
    if not path:
        path = os.path.expanduser("~/.visaradar")

    os.makedirs(path, exist_ok=True)
    return path


class HistoryLedger:
    def __init__(self, data_dir: str) -> None:
        self.path = os.path.join(data_dir, "history.jsonl")

    def record(self, company: str, title: str, label: str, evidence: list[str]) -> None:
        entry = {
            "company": company,
            "title": title,
            "label": label,
            "evidence": evidence,
            "timestamp": time.time(),
        }
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")

    def read_recent(self, limit: int = 20) -> list[dict]:
        entries: list[dict] = []
        if not os.path.exists(self.path):
            return []
        with open(self.path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        # Most recent entries are at the end of the file; take last `limit` and reverse
        tail = entries[-limit:] if limit > 0 else entries
        tail.reverse()
        return tail


def write_markdown_note(
    data_dir: str,
    company: str,
    title: str,
    label: str,
    evidence: list[str],
) -> str:
    notes_dir = os.path.join(data_dir, "notes")
    os.makedirs(notes_dir, exist_ok=True)

    date_str = datetime.now().strftime("%Y-%m-%d")
    slug = re.sub(r"[^a-z0-9]+", "-", company.lower()).strip("-")
    if not slug:
        slug = hashlib.sha256(company.encode("utf-8")).hexdigest()[:10]
    slug = slug[:60]
    base_name = f"{date_str}-{slug}"

    candidate = os.path.join(notes_dir, base_name + ".md")
    if os.path.exists(candidate):
        idx = 2
        while True:
            candidate = os.path.join(notes_dir, f"{base_name}-{idx}.md")
            if not os.path.exists(candidate):
                break
            idx += 1

    iso_date = datetime.now().date().isoformat()
    frontmatter = yaml.safe_dump(
        {"company": company, "title": title, "label": label, "date": iso_date},
        default_flow_style=False,
        sort_keys=False,
    ).strip()
    lines: list[str] = [
        "---",
        frontmatter,
        "---",
        "",
        "## Evidence",
    ]
    for item in evidence:
        lines.append(f"- {item}")

    with open(candidate, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    return candidate

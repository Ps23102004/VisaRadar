from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from visaradar import lca_data, matcher


def label_for(total_filings: int) -> str:
    if total_filings >= 20:
        return "strong"
    if total_filings >= 5:
        return "moderate"
    if total_filings >= 1:
        return "weak"
    return "none"


def main() -> None:
    snapshot_path = lca_data.default_snapshot_path()
    snapshot = lca_data.load_snapshot(snapshot_path)

    out_path = Path(__file__).resolve().parent.parent / "web" / "employers.json"

    # Add one summed row per multi-entity brand (Amazon, Deloitte) and attach
    # brand aliases ("a") to single-entity ones (Facebook -> Meta Platforms), so
    # browse search agrees with `radar company`. Individual entities stay listed.
    by_prefixes: dict[tuple, list[str]] = {}
    for alias, prefixes in matcher.GROUPS.items():
        by_prefixes.setdefault(prefixes, []).append(alias)
    aliases: dict[str, list[str]] = {}
    extra: dict[str, lca_data.EmployerRecord] = {}
    for prefixes, names in by_prefixes.items():
        merged = matcher.merge_group(names[0], prefixes, snapshot)
        if merged is None:
            continue
        if merged.note:
            merged.name = f"GROUP:{names[0]}"
            extra[merged.name] = merged
            aliases[merged.name] = names
        else:
            single = next(k for k, r in snapshot.items() if any(k.startswith(p) for p in prefixes))
            aliases.setdefault(single, []).extend(names)

    records = []
    for key, record in {**snapshot, **extra}.items():
        total_filings = sum(fy["filings"] for fy in record.by_fy.values())
        total_certified = sum(fy["certified"] for fy in record.by_fy.values())
        certified_pct = round(100 * total_certified / total_filings) if total_filings else 0
        records.append(
            {
                "k": key,
                "n": record.display_name,
                "f": total_filings,
                "c": certified_pct,
                "l": label_for(total_filings),
                "s": record.states[:3],
                "t": record.top_titles[:3],
                "w": record.wage["median"] if record.wage else None,
                **({"a": aliases[key]} if key in aliases else {}),
            }
        )

    records.sort(key=lambda r: r["f"], reverse=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, separators=(",", ":"))

    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f"wrote {out_path} ({len(records)} employers, {size_mb:.2f} MB)", file=sys.stderr)


if __name__ == "__main__":
    main()

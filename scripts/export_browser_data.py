from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from visaradar import lca_data


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

    records = []
    for key, record in snapshot.items():
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
            }
        )

    records.sort(key=lambda r: r["f"], reverse=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, separators=(",", ":"))

    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f"wrote {out_path} ({len(records)} employers, {size_mb:.2f} MB)", file=sys.stderr)


if __name__ == "__main__":
    main()

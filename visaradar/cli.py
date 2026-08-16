from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from typing import Optional

import typer
from rich.console import Console
from rich.markup import escape as rich_escape
from rich.panel import Panel
from rich.table import Table

from visaradar import config, fetch, extract, lca_data, llm_client, matcher, score, storage

app = typer.Typer()
console = Console()
error_console = Console(stderr=True)

_LABEL_COLORS = {
    "strong": "bold green",
    "moderate": "bold yellow",
    "weak": "bold red",
    "none": "dim red",
}


def _resolve_source(text: Optional[str], url: Optional[str], file: Optional[str]) -> Optional[str]:
    """Return the raw posting text, or None if no source was supplied."""
    if url is not None:
        return fetch.fetch_text(url)
    if file is not None:
        with open(file, "r", encoding="utf-8") as fh:
            return fh.read()
    if text is not None:
        return text
    if not sys.stdin.isatty():
        return sys.stdin.read()
    return None


def _render_result(
    company: str,
    title: str,
    location: str,
    label: str,
    evidence: list,
    match_confidence: float,
    fuzzy_warning: Optional[str],
    json_out: bool,
) -> None:
    if json_out:
        print(
            json.dumps(
                {
                    "company": company,
                    "title": title,
                    "location": location,
                    "label": label,
                    "evidence": evidence,
                    "match_confidence": match_confidence,
                },
                indent=2,
            )
        )
        return

    color = _LABEL_COLORS.get(label, "white")
    safe_company = rich_escape(str(company))
    safe_title = rich_escape(str(title))
    safe_location = rich_escape(str(location))
    lines = [
        f"[bold cyan]{safe_company}[/bold cyan]",
        f"[bold cyan]{safe_title}[/bold cyan]" if title else "",
        f"[bold cyan]{safe_location}[/bold cyan]" if location else "",
        f"[bold {color}]LABEL: {label}[/bold {color}]",
    ]
    body = "\n".join(ln for ln in lines if ln)
    panel = Panel(body, title="VisaRadar Assessment", border_style="blue")
    console.print(panel)

    if fuzzy_warning:
        console.print(f"[yellow]Warning:[/yellow] {rich_escape(fuzzy_warning)}")

    if evidence:
        table = Table(title="Evidence", show_header=False, expand=True)
        table.add_column("text", style="cyan")
        for item in evidence:
            stripped = str(item).strip()
            if stripped:
                table.add_row(f"• {rich_escape(stripped)}")
        console.print(table)


def _fuzzy_warning_text(candidates: list) -> Optional[str]:
    if not candidates:
        return None
    entries = ", ".join(f"{c.record.name} ({c.score:.2f})" for c in candidates)
    return f"fuzzy match — top score {candidates[0].score:.3f}; candidates: {entries}"


@app.command()
def check(
    text: Optional[str] = typer.Argument(None),
    url: Optional[str] = typer.Option(None, "--url"),
    file: Optional[str] = typer.Option(None, "--file"),
    model: Optional[str] = typer.Option(None, "--model"),
    base_url: Optional[str] = typer.Option(None, "--base-url"),
    data_dir: Optional[str] = typer.Option(None, "--data-dir"),
    json_out: bool = typer.Option(False, "--json"),
    no_notes: bool = typer.Option(False, "--no-notes"),
) -> None:
    try:
        source = _resolve_source(text, url, file)
        if source is None:
            error_console.print(
                "error: provide posting text as an argument, --file, --url, or via stdin"
            )
            raise typer.Exit(1)

        resolved_dir = storage.resolve_data_dir(data_dir)
        cfg = config.resolve_provider(
            model,
            base_url,
            os.environ.get("VISARADAR_MODEL"),
            os.environ.get("VISARADAR_BASE_URL"),
            os.path.join(resolved_dir, "config.yaml"),
        )
        client = llm_client.make_client(cfg)

        prompt = extract.build_extraction_prompt(source)
        raw = client.chat(prompt)
        try:
            posting = extract.parse_extraction(raw)
        except ValueError:
            raw = client.chat(prompt)
            try:
                posting = extract.parse_extraction(raw)
            except ValueError:
                error_console.print(
                    "error: could not parse LLM output after one retry. Raw output:\n" + raw
                )
                raise typer.Exit(1)

        snapshot = lca_data.load_snapshot(lca_data.resolve_snapshot_path(resolved_dir))
        candidates = matcher.match(posting.company, snapshot)

        fuzzy_warning: Optional[str] = None
        if not candidates:
            record = None
        else:
            record = candidates[0].record
            if candidates[0].score < 0.999:
                fuzzy_warning = _fuzzy_warning_text(candidates)

        result = score.assess(record, posting.stance)
        if fuzzy_warning:
            result.evidence.append(f"matched to: {record.display_name} (fuzzy match, not an exact name match)")

        storage.HistoryLedger(resolved_dir).record(
            posting.company, posting.title, result.label, result.evidence
        )
        if not no_notes:
            try:
                storage.write_markdown_note(
                    resolved_dir, posting.company, posting.title, result.label, result.evidence
                )
            except OSError as exc:
                error_console.print(f"warning: recorded to history but could not write note file: {exc}")

        confidence = candidates[0].score if candidates else 0.0
        _render_result(
            company=posting.company,
            title=posting.title,
            location=posting.location,
            label=result.label,
            evidence=result.evidence,
            match_confidence=confidence,
            fuzzy_warning=fuzzy_warning,
            json_out=json_out,
        )
    except fetch.FetchError as exc:
        error_console.print(f"error: failed to fetch URL: {exc}")
        raise typer.Exit(1)
    except llm_client.LLMConnectionError as exc:
        error_console.print(f"error: could not reach LLM provider: {exc}")
        raise typer.Exit(1)
    except ValueError as exc:
        error_console.print(f"error: {exc}")
        raise typer.Exit(1)


@app.command()
def company(
    name: str = typer.Argument(...),
    data_dir: Optional[str] = typer.Option(None, "--data-dir"),
    json_out: bool = typer.Option(False, "--json"),
) -> None:
    try:
        resolved_dir = storage.resolve_data_dir(data_dir)
        snapshot = lca_data.load_snapshot(lca_data.resolve_snapshot_path(resolved_dir))
        candidates = matcher.match(name, snapshot)

        fuzzy_warning: Optional[str] = None
        if not candidates:
            record = None
        else:
            record = candidates[0].record
            if candidates[0].score < 0.999:
                fuzzy_warning = _fuzzy_warning_text(candidates)

        result = score.assess(record, "silent")
        if fuzzy_warning:
            result.evidence.append(f"matched to: {record.display_name} (fuzzy match, not an exact name match)")

        confidence = candidates[0].score if candidates else 0.0
        _render_result(
            company=name,
            title="",
            location="",
            label=result.label,
            evidence=result.evidence,
            match_confidence=confidence,
            fuzzy_warning=fuzzy_warning,
            json_out=json_out,
        )
    except ValueError as exc:
        error_console.print(f"error: {exc}")
        raise typer.Exit(1)


@app.command("config")
def show_config() -> None:
    resolved_dir = storage.resolve_data_dir(None)
    cfg = config.resolve_provider(
        None,
        None,
        os.environ.get("VISARADAR_MODEL"),
        os.environ.get("VISARADAR_BASE_URL"),
        os.path.join(resolved_dir, "config.yaml"),
    )
    snapshot_path = lca_data.resolve_snapshot_path(resolved_dir)
    snapshot = lca_data.load_snapshot(snapshot_path)

    table = Table(title="VisaRadar Configuration")
    table.add_column("key", style="bold cyan")
    table.add_column("value")
    table.add_row("model", getattr(cfg, "model", ""))
    table.add_row("base_url", getattr(cfg, "base_url", ""))
    table.add_row("data_dir", resolved_dir)
    table.add_row("snapshot_path", snapshot_path)
    table.add_row("employers_loaded", str(len(snapshot)))
    console.print(table)


@app.command()
def history(
    limit: int = typer.Option(20, "--limit"),
    data_dir: Optional[str] = typer.Option(None, "--data-dir"),
    json_out: bool = typer.Option(False, "--json"),
) -> None:
    resolved_dir = storage.resolve_data_dir(data_dir)
    entries = storage.HistoryLedger(resolved_dir).read_recent(limit=limit)

    if json_out:
        print(json.dumps(entries, indent=2))
        return

    table = Table(title="VisaRadar History")
    table.add_column("date", style="cyan")
    table.add_column("company", style="bold cyan")
    table.add_column("title")
    table.add_column("label")
    for entry in entries:
        ts = entry.get("timestamp")
        date_str = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M") if ts else ""
        table.add_row(
            date_str,
            rich_escape(str(entry.get("company", ""))),
            rich_escape(str(entry.get("title", ""))),
            entry.get("label", ""),
        )
    console.print(table)


if __name__ == "__main__":
    app()

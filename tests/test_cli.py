from __future__ import annotations

from visaradar.cli import _render_result


def test_render_result_does_not_crash_on_malicious_markup():
    # Regression: untrusted (LLM-derived) strings used to be interpolated
    # directly into Rich markup, causing a MarkupError crash on unbalanced
    # tags and allowing spoofed styling (e.g. a fake "verified" badge).
    _render_result(
        company="[green]VERIFIED[/green] Scam Corp",
        title="Foo [/x] Bar",
        location="[bold]Nowhere[/bold]",
        label="strong",
        evidence=["[bold]FAKE[/bold] evidence"],
        match_confidence=1.0,
        fuzzy_warning="[red]spoofed[/red] warning",
        json_out=False,
    )


def test_render_result_json_mode_does_not_crash():
    _render_result(
        company="Acme",
        title="Engineer",
        location="Remote",
        label="strong",
        evidence=["e1", "e2"],
        match_confidence=1.0,
        fuzzy_warning=None,
        json_out=True,
    )

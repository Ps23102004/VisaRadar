from __future__ import annotations

import re
from html.parser import HTMLParser

import requests


class FetchError(Exception):
    pass


class _TextExtractor(HTMLParser):
    """Collects visible text, skipping script and style blocks."""

    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in ("script", "style"):
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style"):
            self._skip = False

    def handle_data(self, data: str) -> None:
        if not self._skip:
            stripped = data.strip()
            if stripped:
                self._parts.append(stripped)

    def get_text(self) -> str:
        return " ".join(self._parts)


def fetch_text(url: str) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; VisaRadar/0.1)"}
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        raise FetchError(f"fetch failed for {url!r}: {exc}") from exc

    parser = _TextExtractor()
    parser.feed(response.text)
    text = re.sub(r"\s+", " ", parser.get_text()).strip()

    if not text:
        raise FetchError("fetched page had no extractable text")
    return text

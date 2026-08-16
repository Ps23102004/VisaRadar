from __future__ import annotations

import ipaddress
import re
import socket
from html.parser import HTMLParser
from urllib.parse import urlparse

import requests


class FetchError(Exception):
    pass


def _reject_unsafe_target(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise FetchError(f"unsupported URL scheme: {parsed.scheme!r} (only http/https allowed)")
    hostname = parsed.hostname
    if not hostname:
        raise FetchError(f"could not determine hostname from URL: {url!r}")
    try:
        resolved_ip = socket.gethostbyname(hostname)
        addr = ipaddress.ip_address(resolved_ip)
    except (socket.gaierror, ValueError) as exc:
        raise FetchError(f"could not resolve hostname {hostname!r}: {exc}") from exc
    if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved or addr.is_multicast:
        raise FetchError(f"refusing to fetch {url!r}: resolves to a non-public address ({resolved_ip})")


_VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class _TextExtractor(HTMLParser):
    """Collects visible text, skipping script/style blocks and hidden elements."""

    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip_depth = 0
        self._hidden_depth = 0

    def _is_hidden(self, attr_dict: dict) -> bool:
        style_val = (attr_dict.get("style") or "").replace(" ", "").lower()
        return "hidden" in attr_dict or "display:none" in style_val or "visibility:hidden" in style_val

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in ("script", "style"):
            self._skip_depth += 1
        if tag in _VOID_TAGS:
            return
        # Any open tag while already inside a hidden ancestor stays counted
        # as hidden, so the matching close tag (always present for non-void
        # elements) correctly un-hides once the ancestor itself closes.
        if self._hidden_depth or self._is_hidden(dict(attrs)):
            self._hidden_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style") and self._skip_depth:
            self._skip_depth -= 1
        if tag in _VOID_TAGS:
            return
        if self._hidden_depth:
            self._hidden_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip_depth and not self._hidden_depth:
            stripped = data.strip()
            if stripped:
                self._parts.append(stripped)

    def get_text(self) -> str:
        return " ".join(self._parts)


_MAX_REDIRECTS = 5


def fetch_text(url: str) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; VisaRadar/0.1)"}
    current_url = url
    try:
        for _ in range(_MAX_REDIRECTS + 1):
            _reject_unsafe_target(current_url)
            response = requests.get(current_url, headers=headers, timeout=30, allow_redirects=False)
            if response.is_redirect:
                next_url = response.headers.get("Location")
                if not next_url:
                    raise FetchError(f"redirect from {current_url!r} had no Location header")
                current_url = requests.compat.urljoin(current_url, next_url)
                continue
            response.raise_for_status()
            break
        else:
            raise FetchError(f"too many redirects starting from {url!r}")
    except requests.exceptions.RequestException as exc:
        raise FetchError(f"fetch failed for {url!r}: {exc}") from exc

    parser = _TextExtractor()
    parser.feed(response.text)
    text = re.sub(r"\s+", " ", parser.get_text()).strip()

    if not text:
        raise FetchError("fetched page had no extractable text")
    return text

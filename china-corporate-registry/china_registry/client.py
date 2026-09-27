"""Read-only client for the public GLEIF LEI Records API."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Iterator
from typing import Any

API_ROOT = "https://api.gleif.org/api/v1"
USER_AGENT = "china-corporate-registry-connector/1.0 (+https://www.gleif.org/en/meta/lei-data-terms-of-use/)"


class GleifError(RuntimeError):
    pass


class GleifClient:
    def __init__(self, pause_seconds: float = 0.2, timeout: float = 60.0, attempts: int = 4) -> None:
        self.pause_seconds = pause_seconds
        self.timeout = timeout
        self.attempts = attempts
        self._legal_forms: dict[str, str | None] = {}

    def fetch_json(self, url: str) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(self.attempts):
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/vnd.api+json",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    payload = json.load(response)
            except urllib.error.HTTPError as exc:
                last_error = exc
                if exc.code in {429, 500, 502, 503, 504} and attempt + 1 < self.attempts:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                raise GleifError(f"GLEIF HTTP {exc.code} for {url}") from exc
            except urllib.error.URLError as exc:
                last_error = exc
                if attempt + 1 < self.attempts:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                raise GleifError(f"GLEIF request failed for {url}") from exc
            if not isinstance(payload, dict):
                raise GleifError(f"GLEIF returned a non-object payload for {url}")
            return payload
        raise GleifError(f"GLEIF request failed for {url}") from last_error

    def iter_china_pages(
        self,
        *,
        page_size: int = 200,
        max_pages: int | None = None,
        updated_after: str | None = None,
    ) -> Iterator[list[dict[str, Any]]]:
        """Yield pages of LEI resources whose legal jurisdiction is CN."""
        if page_size < 1 or page_size > 200:
            raise ValueError("page_size must be between 1 and 200")
        params = {
            "filter[entity.jurisdiction]": "CN",
            "page[size]": str(page_size),
            "page[number]": "1",
        }
        if updated_after:
            params["filter[registration.lastUpdateDate]"] = f">{updated_after}"
        url: str | None = f"{API_ROOT}/lei-records?{urllib.parse.urlencode(params)}"
        pages = 0
        while url:
            payload = self.fetch_json(url)
            records = payload.get("data") or []
            if not isinstance(records, list):
                raise GleifError("GLEIF page did not contain a data array")
            yield records
            pages += 1
            if max_pages is not None and pages >= max_pages:
                return
            url = (payload.get("links") or {}).get("next")
            if url:
                time.sleep(self.pause_seconds)

    def legal_form_name(self, code: str) -> str | None:
        """Return the published local name, or None when the code is only a free-text bucket."""
        if code in self._legal_forms:
            return self._legal_forms[code]
        payload = self.fetch_json(f"{API_ROOT}/entity-legal-forms/{urllib.parse.quote(code)}")
        attributes = (payload.get("data") or {}).get("attributes") or {}
        chosen = _pick_legal_form_name(attributes.get("names") or [])
        self._legal_forms[code] = chosen
        return chosen


def _pick_legal_form_name(names: list[dict[str, Any]]) -> str | None:
    preferred = [
        item
        for item in names
        if item.get("languageCode") == "zh" and (item.get("localName") or "").strip()
    ]
    ordered = preferred or names
    for item in ordered:
        local_name = (item.get("localName") or "").strip()
        if local_name:
            return local_name
        transliterated = (item.get("transliteratedName") or "").strip()
        if transliterated:
            return transliterated
    return None

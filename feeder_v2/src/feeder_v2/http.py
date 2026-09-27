"""HTTP helper with retries, used by all bronze extractors."""

from __future__ import annotations

import time
from typing import Any

import requests

DEFAULT_HEADERS = {
    "User-Agent": "FeederV2-ChinaCorporateRegistry/1.0 (PO-1594; bronze ingest)",
    "Accept": "*/*",
}


class HttpError(RuntimeError):
    pass


class HttpClient:
    def __init__(
        self,
        timeout: float = 90.0,
        retries: int = 5,
        backoff: float = 1.5,
        session: requests.Session | None = None,
    ) -> None:
        self.timeout = timeout
        self.retries = retries
        self.backoff = backoff
        self.session = session or requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)

    def get_json(self, url: str, *, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> Any:
        response = self._request("GET", url, params=params, headers=headers)
        try:
            return response.json()
        except ValueError as exc:
            raise HttpError(f"Non-JSON response from {url}: {response.text[:300]}") from exc

    def get_text(self, url: str, *, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> str:
        response = self._request("GET", url, params=params, headers=headers)
        response.encoding = response.apparent_encoding or "utf-8"
        return response.text

    def get_bytes(self, url: str, *, params: dict[str, Any] | None = None) -> bytes:
        response = self._request("GET", url, params=params)
        return response.content

    def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> requests.Response:
        last_error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            try:
                response = self.session.request(
                    method,
                    url,
                    params=params,
                    headers=headers,
                    timeout=self.timeout,
                )
            except requests.RequestException as exc:
                last_error = exc
                time.sleep(self.backoff * attempt)
                continue
            if response.status_code in {429, 500, 502, 503, 504}:
                retry_after = response.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else self.backoff * attempt
                time.sleep(wait)
                last_error = HttpError(f"{response.status_code} from {url}")
                continue
            if response.status_code >= 400:
                raise HttpError(f"{response.status_code} from {url}: {response.text[:400]}")
            return response
        raise HttpError(f"Request failed after {self.retries} attempts: {url}: {last_error}")

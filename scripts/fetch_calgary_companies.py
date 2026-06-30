#!/usr/bin/env python3
"""
OpenCorporates Calgary (Alberta) corporate data fetcher.

Fetches company records registered in Alberta (jurisdiction ca_ab) with
registered addresses in Calgary, via the OpenCorporates REST API v0.4.

Usage:
    export OPENCORPORATES_API_TOKEN="your_token_here"
    python scripts/fetch_calgary_companies.py --mode incremental
    python scripts/fetch_calgary_companies.py --mode full
    python scripts/fetch_calgary_companies.py --mode incremental --dry-run

Cron (daily):
    0 6 * * * cd /path/to/project && .venv/bin/python scripts/fetch_calgary_companies.py --mode incremental

Cron (weekly full refresh):
    0 2 * * 0 cd /path/to/project && .venv/bin/python scripts/fetch_calgary_companies.py --mode full
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import string
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

import requests

API_BASE = "https://api.opencorporates.com/v0.4"
# Calgary companies are searchable via country_code=ca + registered_address=Calgary.
# The Alberta provincial registry (ca_ab) is listed in OpenCorporates but currently
# returns no results from companies/search; federal Corporations Canada records (ca)
# with Calgary registered addresses are available via this filter.
COUNTRY_CODE = "ca"
CITY_FILTER = "Calgary"
DEFAULT_PER_PAGE = 100
MAX_PAGE = 100
REQUEST_DELAY_SECONDS = 0.5
MAX_RETRIES = 5
RETRY_BACKOFF_SECONDS = 2.0

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = DATA_DIR / "output"
STATE_FILE = DATA_DIR / "state.json"

ALPHABET_PREFIXES = list(string.ascii_lowercase) + list(string.digits)


@dataclass
class SyncState:
    last_sync_at: str | None = None
    last_run_at: str | None = None
    total_companies_fetched: int = 0
    runs: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def load(cls, path: Path) -> SyncState:
        if not path.exists():
            return cls()
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as f:
            json.dump(
                {
                    "last_sync_at": self.last_sync_at,
                    "last_run_at": self.last_run_at,
                    "total_companies_fetched": self.total_companies_fetched,
                    "runs": self.runs[-20:],
                },
                f,
                indent=2,
            )


class OpenCorporatesClient:
    def __init__(self, api_token: str, per_page: int = DEFAULT_PER_PAGE) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {
                "X-API-TOKEN": api_token,
                "Accept": "application/json",
                "User-Agent": "Reviewerly-CalgarySync/1.0",
            }
        )
        self.per_page = per_page

    def _request(self, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
        url = f"{API_BASE}/{endpoint.lstrip('/')}"
        params = {**params, "per_page": self.per_page}

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = self.session.get(url, params=params, timeout=60)
            except requests.RequestException as exc:
                if attempt == MAX_RETRIES:
                    raise RuntimeError(f"Request failed after {MAX_RETRIES} attempts: {exc}") from exc
                wait = RETRY_BACKOFF_SECONDS * attempt
                logging.warning("Request error (%s), retrying in %.1fs...", exc, wait)
                time.sleep(wait)
                continue

            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", RETRY_BACKOFF_SECONDS * attempt))
                logging.warning("Rate limited (429), waiting %ds...", retry_after)
                time.sleep(retry_after)
                continue

            if response.status_code >= 500:
                if attempt == MAX_RETRIES:
                    response.raise_for_status()
                wait = RETRY_BACKOFF_SECONDS * attempt
                logging.warning("Server error %d, retrying in %.1fs...", response.status_code, wait)
                time.sleep(wait)
                continue

            data = response.json()
            if "error" in data:
                raise RuntimeError(f"API error: {data['error'].get('message', data['error'])}")
            return data

        raise RuntimeError("Unreachable")

    def account_status(self) -> dict[str, Any]:
        return self._request("account_status", {})

    def search_companies(self, params: dict[str, Any]) -> dict[str, Any]:
        return self._request("companies/search", params)

    def get_company(self, company_number: str, sparse: bool = False) -> dict[str, Any]:
        params: dict[str, Any] = {}
        if sparse:
            params["sparse"] = "true"
        return self._request(f"companies/ca_ab/{company_number}", params)

    def iter_search_pages(self, params: dict[str, Any]) -> Iterator[dict[str, Any]]:
        page = 1
        while page <= MAX_PAGE:
            result = self.search_companies({**params, "page": page})
            companies = result.get("results", {}).get("companies", [])
            if not companies:
                break

            yield result

            total_pages = result.get("results", {}).get("total_pages", 1)
            if page >= total_pages:
                break
            page += 1
            time.sleep(REQUEST_DELAY_SECONDS)


def is_calgary_address(company: dict[str, Any]) -> bool:
    """Client-side validation that registered address is in Calgary, AB."""
    address = company.get("registered_address") or {}
    locality = (address.get("locality") or "").lower()
    region = (address.get("region") or "").lower()
    full = (company.get("registered_address_in_full") or "").lower()

    calgary_in_address = "calgary" in locality or "calgary" in full
    alberta_in_address = (
        "alberta" in region
        or region == "ab"
        or ", ab" in full
        or full.endswith(" ab")
        or not region
    )
    return calgary_in_address and alberta_in_address


def flatten_company(company: dict[str, Any]) -> dict[str, Any]:
    address = company.get("registered_address") or {}
    return {
        "company_number": company.get("company_number"),
        "name": company.get("name"),
        "jurisdiction_code": company.get("jurisdiction_code"),
        "company_type": company.get("company_type"),
        "current_status": company.get("current_status"),
        "inactive": company.get("inactive"),
        "incorporation_date": company.get("incorporation_date"),
        "dissolution_date": company.get("dissolution_date"),
        "registered_address_street": address.get("street_address"),
        "registered_address_locality": address.get("locality"),
        "registered_address_region": address.get("region"),
        "registered_address_postal_code": address.get("postal_code"),
        "registered_address_country": address.get("country"),
        "registered_address_in_full": company.get("registered_address_in_full"),
        "registry_url": company.get("registry_url"),
        "opencorporates_url": company.get("opencorporates_url"),
        "created_at": company.get("created_at"),
        "updated_at": company.get("updated_at"),
        "retrieved_at": company.get("retrieved_at"),
    }


def build_search_params(
    mode: str,
    state: SyncState,
    prefix: str | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "country_code": COUNTRY_CODE,
        "registered_address": CITY_FILTER,
        "order": "updated_at",
        "inactive": "false",
        "q": prefix or "a",
    }

    if mode == "incremental" and state.last_sync_at:
        sync_date = state.last_sync_at[:10]
        params["updated_at"] = f"{sync_date}:"

    return params


def fetch_companies(
    client: OpenCorporatesClient,
    mode: str,
    state: SyncState,
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    records: list[dict[str, Any]] = []

    prefixes = ALPHABET_PREFIXES

    for prefix in prefixes:
        params = build_search_params(mode, state, prefix)
        label = prefix or "incremental"
        logging.info("Searching (prefix=%s, params=%s)", label, {k: v for k, v in params.items() if k != "q"})

        try:
            for page_result in client.iter_search_pages(params):
                page_num = page_result.get("results", {}).get("page", "?")
                total = page_result.get("results", {}).get("total_count", "?")
                logging.info("  page %s / total matches: %s", page_num, total)

                for wrapper in page_result.get("results", {}).get("companies", []):
                    company = wrapper.get("company", {})
                    key = f"{company.get('jurisdiction_code')}:{company.get('company_number')}"
                    if key in seen:
                        continue
                    if not is_calgary_address(company):
                        continue
                    seen.add(key)
                    records.append(flatten_company(company))
        except RuntimeError as exc:
            if "Invalid Api Token" in str(exc):
                raise
            logging.warning("Search prefix '%s' failed: %s", label, exc)

    return records


def write_outputs(records: list[dict[str, Any]], run_id: str) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    jsonl_path = OUTPUT_DIR / f"calgary_companies_{run_id}.jsonl"
    csv_path = OUTPUT_DIR / f"calgary_companies_{run_id}.csv"

    with jsonl_path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    if records:
        with csv_path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
            writer.writeheader()
            writer.writerows(records)
    else:
        csv_path.write_text("", encoding="utf-8")

    latest_jsonl = OUTPUT_DIR / "calgary_companies_latest.jsonl"
    latest_csv = OUTPUT_DIR / "calgary_companies_latest.csv"
    latest_jsonl.write_text(jsonl_path.read_text(encoding="utf-8"), encoding="utf-8")
    if records:
        latest_csv.write_text(csv_path.read_text(encoding="utf-8"), encoding="utf-8")

    return jsonl_path, csv_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch Calgary corporate data from OpenCorporates API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--mode",
        choices=["incremental", "full"],
        default="incremental",
        help="incremental: fetch changes since last run; full: alphabet sweep of all Calgary companies",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Check API connectivity and quota without fetching data",
    )
    parser.add_argument(
        "--per-page",
        type=int,
        default=DEFAULT_PER_PAGE,
        help=f"Results per page (max {DEFAULT_PER_PAGE})",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    api_token = os.environ.get("OPENCORPORATES_API_TOKEN", "").strip()
    if not api_token:
        logging.error(
            "OPENCORPORATES_API_TOKEN is not set. "
            "Get a token at https://opencorporates.com/api_accounts/new"
        )
        return 1

    client = OpenCorporatesClient(api_token, per_page=min(args.per_page, DEFAULT_PER_PAGE))
    state = SyncState.load(STATE_FILE)
    run_started = datetime.now(timezone.utc)

    try:
        status = client.account_status()
        account = status.get("results", {}).get("account_status", {})
        logging.info(
            "API account: plan=%s, calls_remaining_today=%s, calls_remaining_month=%s",
            account.get("plan"),
            account.get("calls_remaining", {}).get("today"),
            account.get("calls_remaining", {}).get("this_month"),
        )
    except RuntimeError as exc:
        logging.error("Could not verify API account: %s", exc)
        return 1

    if args.dry_run:
        logging.info("Dry run complete — API token is valid.")
        return 0

    logging.info("Starting %s sync for Calgary, Alberta (country_code=%s)...", args.mode, COUNTRY_CODE)
    records = fetch_companies(client, args.mode, state)

    run_id = run_started.strftime("%Y%m%d_%H%M%S")
    jsonl_path, csv_path = write_outputs(records, run_id)

    state.last_sync_at = run_started.isoformat()
    state.last_run_at = run_started.isoformat()
    state.total_companies_fetched += len(records)
    state.runs.append(
        {
            "run_id": run_id,
            "mode": args.mode,
            "started_at": run_started.isoformat(),
            "records_fetched": len(records),
            "output_jsonl": str(jsonl_path),
        }
    )
    state.save(STATE_FILE)

    logging.info("Sync complete: %d companies fetched", len(records))
    logging.info("JSONL: %s", jsonl_path)
    logging.info("CSV:   %s", csv_path)
    logging.info("State: %s", STATE_FILE)
    return 0


if __name__ == "__main__":
    sys.exit(main())

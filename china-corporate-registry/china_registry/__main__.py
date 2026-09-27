"""Fetch the China corporate register into bronze and validate the landing."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

from china_registry.client import GleifClient
from china_registry.landing import land_batch
from china_registry.project import is_china_registry_record, legal_form_name_for, project_record
from china_registry.validate import validate_batch

PACKAGE_ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="China corporate-registry bronze connector")
    sub = parser.add_subparsers(dest="command", required=True)

    fetch = sub.add_parser("fetch", help="Land GSXT-backed China companies from GLEIF into bronze")
    fetch.add_argument("--bronze-root", type=Path, default=PACKAGE_ROOT / "data" / "bronze")
    fetch.add_argument("--state", type=Path, default=PACKAGE_ROOT / "data" / "state" / "china_corporate_registry.json")
    fetch.add_argument("--page-size", type=int, default=200)
    fetch.add_argument("--max-pages", type=int, default=None)
    fetch.add_argument("--full", action="store_true", help="Read every China jurisdiction page")
    fetch.add_argument("--incremental", action="store_true", help="Continue from the saved watermark date")
    fetch.add_argument("--pause-seconds", type=float, default=0.2)

    validate = sub.add_parser("validate", help="Validate entities, registrations, and addresses")
    validate.add_argument("batch_dir", type=Path)

    args = parser.parse_args(argv)
    if args.command == "fetch":
        return _fetch(args)
    report = validate_batch(args.batch_dir)
    print(report.text())
    return 0 if report.ok else 1


def _fetch(args: argparse.Namespace) -> int:
    if args.full and args.max_pages is not None:
        print("Use either --full or --max-pages, not both.", file=sys.stderr)
        return 2
    if not args.full and args.max_pages is None and not args.incremental:
        print("Refusing an unbounded pull. Pass --max-pages N, --incremental, or --full.", file=sys.stderr)
        return 2

    updated_after = None
    if args.incremental:
        updated_after = _read_watermark(args.state)
        if not updated_after:
            print(f"No watermark in {args.state}. Run a bounded or --full fetch first.", file=sys.stderr)
            return 2

    retrieved_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    batch_id = retrieved_at.replace("-", "").replace(":", "")
    client = GleifClient(pause_seconds=args.pause_seconds)
    raw_resources: list[dict] = []
    projected = []
    form_names: dict[str, str] = {}
    pages = 0
    max_pages = None if args.full else args.max_pages
    for page in client.iter_china_pages(
        page_size=args.page_size,
        max_pages=max_pages,
        updated_after=updated_after,
    ):
        pages += 1
        raw_resources.extend(page)
        for resource in page:
            if not is_china_registry_record(resource):
                continue
            entity = (resource.get("attributes") or {}).get("entity") or {}
            code = ((entity.get("legalForm") or {}).get("id") or "").strip()
            if code not in form_names:
                form_names[code] = client.legal_form_name(code)
            projected.append(
                project_record(
                    resource,
                    legal_form_name=legal_form_name_for(entity, form_names[code]),
                    retrieved_at=retrieved_at,
                    batch_id=batch_id,
                )
            )
        print(f"page {pages}: raw {len(raw_resources)}, kept {len(projected)}", file=sys.stderr)

    if not projected:
        print("No China corporate-registry records were returned.", file=sys.stderr)
        return 1

    watermark = _max_update_date(projected)
    batch_dir = args.bronze_root / "china_corporate_registry" / f"batch_id={batch_id}"
    result = land_batch(
        batch_dir=batch_dir,
        batch_id=batch_id,
        retrieved_at=retrieved_at,
        raw_resources=raw_resources,
        projected=projected,
        pages_fetched=pages,
        watermark=watermark,
    )
    _write_state(args.state, batch_id=batch_id, watermark=watermark, retrieved_at=retrieved_at)
    report = validate_batch(result.batch_dir)
    print(report.text())
    print(f"bronze: {result.batch_dir}")
    return 0 if report.ok else 1


def _max_update_date(projected: list[dict]) -> str | None:
    dates = [row["registration"]["last_update_date"] for row in projected if row["registration"].get("last_update_date")]
    if not dates:
        return None
    return max(dates)[:10]


def _read_watermark(path: Path) -> str | None:
    if not path.is_file():
        return None
    payload = json.loads(path.read_text(encoding="utf-8"))
    value = payload.get("watermark")
    return str(value) if value else None


def _write_state(path: Path, *, batch_id: str, watermark: str | None, retrieved_at: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "connector": "china_corporate_registry",
                "registration_authority_id": "RA000092",
                "last_successful_batch": batch_id,
                "watermark": watermark,
                "retrieved_at": retrieved_at,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    raise SystemExit(main())

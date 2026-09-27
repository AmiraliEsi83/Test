"""Land projected China registry records into a bronze batch directory."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from china_registry.project import canonical_raw


@dataclass
class LandingResult:
    batch_dir: Path
    batch_id: str
    raw_records: int
    kept_records: int
    entities: int
    registrations: int
    addresses: int
    watermark: str | None


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True))
            handle.write("\n")


def land_batch(
    *,
    batch_dir: Path,
    batch_id: str,
    retrieved_at: str,
    raw_resources: list[dict[str, Any]],
    projected: list[dict[str, Any]],
    pages_fetched: int,
    watermark: str | None,
) -> LandingResult:
    batch_dir.mkdir(parents=True, exist_ok=True)
    with (batch_dir / "raw_lei_records.jsonl").open("w", encoding="utf-8") as handle:
        for resource in raw_resources:
            handle.write(canonical_raw(resource))
            handle.write("\n")

    entities = [item["entity"] for item in projected]
    registrations = [item["registration"] for item in projected]
    addresses = [address for item in projected for address in item["addresses"]]
    _reject_duplicate([row["lei"] for row in entities], "entities")
    _reject_duplicate([row["lei"] for row in registrations], "registrations")
    _reject_duplicate(
        [f"{row['lei']}|{row['address_role']}" for row in addresses],
        "addresses",
    )

    write_jsonl(batch_dir / "entities.jsonl", entities)
    write_jsonl(batch_dir / "registrations.jsonl", registrations)
    write_jsonl(batch_dir / "addresses.jsonl", addresses)

    manifest = {
        "connector": "china_corporate_registry",
        "feeder_version": 2,
        "layer": "bronze",
        "batch_id": batch_id,
        "retrieved_at": retrieved_at,
        "jurisdiction": "CN",
        "registration_authority_id": "RA000092",
        "license": "CC0-1.0",
        "pages_fetched": pages_fetched,
        "raw_records": len(raw_resources),
        "kept_records": len(projected),
        "entities": len(entities),
        "registrations": len(registrations),
        "addresses": len(addresses),
        "watermark": watermark,
        "datasets": ["entities", "registrations", "addresses"],
    }
    (batch_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return LandingResult(
        batch_dir=batch_dir,
        batch_id=batch_id,
        raw_records=len(raw_resources),
        kept_records=len(projected),
        entities=len(entities),
        registrations=len(registrations),
        addresses=len(addresses),
        watermark=watermark,
    )


def _reject_duplicate(keys: list[str], dataset: str) -> None:
    seen: set[str] = set()
    for key in keys:
        if key in seen:
            raise ValueError(f"duplicate primary key in {dataset}: {key}")
        seen.add(key)

"""Bronze landing: JSONL parts, manifest, and _SUCCESS markers."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def new_ingest_id() -> str:
    return str(uuid.uuid4())


def wrap_bronze_record(
    payload: Mapping[str, Any],
    *,
    connector_id: str,
    stream: str,
    schema_version: str,
    source_system: str,
    source_uri: str,
    run_id: str,
    raw: Any,
    include_raw: bool = True,
) -> dict[str, Any]:
    record = {
        "_meta": {
            "ingest_id": new_ingest_id(),
            "ingested_at": utc_now(),
            "connector_id": connector_id,
            "stream": stream,
            "schema_version": schema_version,
            "layer": "bronze",
            "source_system": source_system,
            "source_uri": source_uri,
            "run_id": run_id,
        },
        **payload,
    }
    if include_raw:
        record["raw"] = raw
    return record


def stream_dir(bronze_root: Path, connector_id: str, stream: str, date: str, run_id: str) -> Path:
    return bronze_root / connector_id / stream / f"dt={date}" / f"run={run_id}"


def write_bronze_stream(
    records: Iterable[Mapping[str, Any]],
    *,
    output_dir: Path,
    stream: str,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    part_path = output_dir / "part-00000.jsonl"
    count = 0
    register_ids = 0
    with part_path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
            count += 1
            if record.get("register_id"):
                register_ids += 1
    manifest = {
        "stream": stream,
        "layer": "bronze",
        "format": "jsonl",
        "part_file": part_path.name,
        "row_count": count,
        "register_id_count": register_ids,
        "written_at": utc_now(),
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (output_dir / "_SUCCESS").write_text("", encoding="utf-8")
    return manifest

"""Run a Feeder v2 connector and land streams to bronze."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from feeder_v2.bronze import stream_dir, wrap_bronze_record, write_bronze_stream
from feeder_v2.extractors import load_extractors
from feeder_v2.http import HttpClient
from feeder_v2.yaml_spec import enabled_streams, load_connector_yaml


@dataclass
class RunResult:
    run_id: str
    connector_id: str
    profile: str
    date: str
    streams: dict[str, dict[str, Any]] = field(default_factory=dict)
    errors: dict[str, str] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return not self.errors and len(self.streams) > 0


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def run_connector(
    connector_path: str | Path,
    *,
    bronze_root: Path,
    profile_name: str = "validate",
    client: HttpClient | None = None,
    run_id: str | None = None,
) -> RunResult:
    spec = load_connector_yaml(connector_path)
    metadata = spec["metadata"]
    profiles = spec["spec"].get("run_profiles") or {}
    if profile_name not in profiles:
        raise ValueError(f"Unknown run profile {profile_name!r}; have {sorted(profiles)}")
    profile = profiles[profile_name]
    extractors = load_extractors()
    client = client or HttpClient()
    run_id = run_id or uuid4().hex[:12]
    date = _today()
    include_raw = bool(spec["spec"]["landing"].get("include_raw_payload", True))
    result = RunResult(
        run_id=run_id,
        connector_id=metadata["id"],
        profile=profile_name,
        date=date,
    )

    for stream in enabled_streams(spec):
        name = stream["name"]
        extractor_name = stream["extractor"]
        if extractor_name not in extractors:
            result.errors[name] = f"Unknown extractor {extractor_name}"
            continue
        try:
            output_dir = stream_dir(bronze_root, metadata["id"], name, date, run_id)
            bronze_records = []
            for extracted in extractors[extractor_name](stream, profile, client):
                raw = extracted.pop("_raw", None)
                bronze_records.append(
                    wrap_bronze_record(
                        extracted,
                        connector_id=metadata["id"],
                        stream=name,
                        schema_version=metadata["version"],
                        source_system=stream["source"]["system"],
                        source_uri=extracted.get("source_uri") or "",
                        run_id=run_id,
                        raw=raw,
                        include_raw=include_raw,
                    )
                )
            manifest = write_bronze_stream(bronze_records, output_dir=output_dir, stream=name)
            manifest["path"] = str(output_dir)
            result.streams[name] = manifest
        except Exception as exc:  # noqa: BLE001 - per-stream isolation for PO-1693 reporting
            result.errors[name] = f"{type(exc).__name__}: {exc}"

    run_dir = bronze_root / metadata["id"] / "_runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    summary = {
        "run_id": run_id,
        "connector_id": metadata["id"],
        "profile": profile_name,
        "date": date,
        "tickets": metadata.get("tickets"),
        "streams": result.streams,
        "errors": result.errors,
        "ok": result.ok,
    }
    (run_dir / "run.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    result_path = Path(connector_path).resolve().parents[1] / "runs" / run_id
    try:
        result_path.mkdir(parents=True, exist_ok=True)
        (result_path / "run.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    except OSError:
        pass
    return result

"""PO-1693: validate that China corporate-registry streams landed to bronze."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from feeder_v2.uscc import is_valid_hk_brn, is_valid_uscc
from feeder_v2.yaml_spec import enabled_streams, load_connector_yaml


class BronzeValidationError(AssertionError):
    pass


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    with path.open(encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise BronzeValidationError(f"{path}: invalid JSONL on line {line_no}: {exc}") from exc
    return rows


def validate_bronze_run(
    connector_path: str | Path,
    *,
    bronze_root: Path,
    run_id: str,
    date: str,
    profile_name: str = "validate",
) -> dict[str, Any]:
    spec = load_connector_yaml(connector_path)
    metadata = spec["metadata"]
    contract = spec["spec"]["bronze_contract"]
    required = list(contract["required_fields"])
    profile = spec["spec"]["run_profiles"][profile_name]
    report: dict[str, Any] = {"ok": True, "streams": {}, "failures": []}

    enabled = enabled_streams(spec)
    if len(enabled) != 3:
        report["ok"] = False
        report["failures"].append(f"Expected three enabled streams, found {len(enabled)}")

    for stream in enabled:
        name = stream["name"]
        quality = stream["quality"]
        output_dir = bronze_root / metadata["id"] / name / f"dt={date}" / f"run={run_id}"
        part = output_dir / "part-00000.jsonl"
        success = output_dir / "_SUCCESS"
        manifest_path = output_dir / "manifest.json"
        stream_report: dict[str, Any] = {"path": str(output_dir)}
        try:
            if not success.exists():
                raise BronzeValidationError(f"{name}: missing _SUCCESS")
            if not manifest_path.exists():
                raise BronzeValidationError(f"{name}: missing manifest.json")
            if not part.exists():
                raise BronzeValidationError(f"{name}: missing part-00000.jsonl")
            rows = _read_jsonl(part)
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            min_rows = int(quality.get("min_rows_validate") or 1)
            if profile_name != "validate":
                min_rows = 1
            if len(rows) < min_rows:
                raise BronzeValidationError(f"{name}: {len(rows)} rows < min {min_rows}")
            if manifest.get("row_count") != len(rows):
                raise BronzeValidationError(f"{name}: manifest row_count mismatch")
            for index, row in enumerate(rows):
                meta = row.get("_meta") or {}
                if meta.get("layer") != "bronze":
                    raise BronzeValidationError(f"{name}[{index}]: layer is not bronze")
                if meta.get("connector_id") != metadata["id"]:
                    raise BronzeValidationError(f"{name}[{index}]: connector_id mismatch")
                if meta.get("stream") != name:
                    raise BronzeValidationError(f"{name}[{index}]: stream mismatch")
                if meta.get("source_system") == "opencorporates":
                    raise BronzeValidationError(f"{name}[{index}]: OpenCorporates is excluded")
                for field in required:
                    if not row.get(field):
                        raise BronzeValidationError(f"{name}[{index}]: missing required {field}")
                if quality.get("uscc_required") and not is_valid_uscc(row.get("register_id")):
                    raise BronzeValidationError(
                        f"{name}[{index}]: invalid USCC {row.get('register_id')!r}"
                    )
                if quality.get("brn_required") and not is_valid_hk_brn(row.get("register_id")):
                    raise BronzeValidationError(
                        f"{name}[{index}]: invalid HK BR number {row.get('register_id')!r}"
                    )
                expected_country = quality.get("country_code")
                if expected_country and row.get("country_code") != expected_country:
                    raise BronzeValidationError(f"{name}[{index}]: country_code mismatch")
                if spec["spec"]["landing"].get("include_raw_payload") and "raw" not in row:
                    raise BronzeValidationError(f"{name}[{index}]: missing raw payload")
            stream_report.update(
                {
                    "ok": True,
                    "row_count": len(rows),
                    "register_id_type": stream["register"]["id_type"],
                    "limit": profile.get("limit_per_stream"),
                }
            )
        except BronzeValidationError as exc:
            report["ok"] = False
            stream_report["ok"] = False
            stream_report["error"] = str(exc)
            report["failures"].append(str(exc))
        report["streams"][name] = stream_report

    if len(report["streams"]) != 3:
        report["ok"] = False
        report["failures"].append("Did not validate all three bronze streams")
    return report

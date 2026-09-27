"""Validate that all three bronze datasets match the Feeder v2 YAML schema."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from china_registry.identifiers import lei_is_valid, uscc_is_valid
from china_registry.project import canonical_raw

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schemas" / "china_corporate_registry.yaml"
DATASETS = ("entities", "registrations", "addresses")


@dataclass
class ValidationReport:
    ok: bool
    batch_dir: Path
    counts: dict[str, int]
    errors: list[str] = field(default_factory=list)

    def text(self) -> str:
        lines = [
            f"batch: {self.batch_dir}",
            *[f"{name}: {self.counts.get(name, 0)}" for name in DATASETS],
        ]
        if self.ok:
            lines.append("result: all three bronze datasets passed")
        else:
            lines.append(f"result: failed with {len(self.errors)} error(s)")
            lines.extend(f"- {error}" for error in self.errors)
        return "\n".join(lines)


def load_schema(path: Path = SCHEMA_PATH) -> dict[str, Any]:
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict):
        raise ValueError(f"schema at {path} is not a mapping")
    datasets = document.get("datasets") or {}
    missing = [name for name in DATASETS if name not in datasets]
    if missing:
        raise ValueError(f"schema is missing datasets: {', '.join(missing)}")
    declared = (document.get("feeder") or {}).get("landing", {}).get("datasets")
    if list(declared or []) != list(DATASETS):
        raise ValueError("feeder landing datasets must be entities, registrations, addresses")
    return document


def validate_batch(batch_dir: Path, schema_path: Path = SCHEMA_PATH) -> ValidationReport:
    schema = load_schema(schema_path)
    errors: list[str] = []
    counts: dict[str, int] = {}
    rows_by_dataset: dict[str, list[dict[str, Any]]] = {}

    manifest_path = batch_dir / "manifest.json"
    if not manifest_path.is_file():
        errors.append("manifest.json is missing")
        manifest: dict[str, Any] = {}
    else:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("datasets") != list(DATASETS):
            errors.append("manifest datasets are not entities, registrations, addresses")
        if manifest.get("registration_authority_id") != "RA000092":
            errors.append("manifest registry is not RA000092")

    for name in DATASETS:
        path = batch_dir / f"{name}.jsonl"
        if not path.is_file():
            errors.append(f"{name}.jsonl is missing")
            rows_by_dataset[name] = []
            counts[name] = 0
            continue
        rows = _read_jsonl(path)
        rows_by_dataset[name] = rows
        counts[name] = len(rows)
        if not rows:
            errors.append(f"{name} is empty")
        dataset_schema = schema["datasets"][name]
        primary_key = dataset_schema["primary_key"]
        seen: set[tuple[Any, ...]] = set()
        for index, row in enumerate(rows, start=1):
            errors.extend(_check_row(name, index, row, dataset_schema["fields"]))
            key = tuple(row.get(column) for column in primary_key)
            if key in seen:
                errors.append(f"{name} row {index} repeats primary key {key}")
            seen.add(key)
        if manifest.get(name) not in (None, len(rows)):
            errors.append(f"manifest {name} count {manifest.get(name)} != {len(rows)}")

    entities = rows_by_dataset["entities"]
    registrations = rows_by_dataset["registrations"]
    addresses = rows_by_dataset["addresses"]
    entity_leis = {row.get("lei") for row in entities}
    registration_leis = {row.get("lei") for row in registrations}
    if entity_leis != registration_leis:
        errors.append("entity LEIs and registration LEIs do not match")
    legal_leis = {row.get("lei") for row in addresses if row.get("address_role") == "legal"}
    if entity_leis - legal_leis:
        errors.append("one or more entities have no legal address")
    headquarters_leis = {row.get("lei") for row in addresses if row.get("address_role") == "headquarters"}
    if entity_leis - headquarters_leis:
        errors.append("one or more entities have no headquarters address")

    raw_path = batch_dir / "raw_lei_records.jsonl"
    if not raw_path.is_file():
        errors.append("raw_lei_records.jsonl is missing")
    else:
        raw_by_lei = {}
        for line in raw_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            resource = json.loads(line)
            lei = ((resource.get("attributes") or {}).get("lei") or resource.get("id") or "").upper()
            raw_by_lei[lei] = resource
        if manifest.get("raw_records") not in (None, len(raw_by_lei)):
            errors.append("manifest raw_records does not match the raw file")
        for row in entities:
            raw = raw_by_lei.get(row.get("lei"))
            if raw is None:
                errors.append(f"entity {row.get('lei')} has no raw source record")
                continue
            expected = hashlib.sha256(canonical_raw(raw).encode("utf-8")).hexdigest()
            if row.get("raw_sha256") != expected:
                errors.append(f"entity {row.get('lei')} raw_sha256 does not match the raw file")

    return ValidationReport(ok=not errors, batch_dir=batch_dir, counts=counts, errors=errors)


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        row = json.loads(line)
        if not isinstance(row, dict):
            raise ValueError(f"{path.name} line {line_number} is not an object")
        rows.append(row)
    return rows


def _check_row(dataset: str, index: int, row: dict[str, Any], fields: list[dict[str, Any]]) -> list[str]:
    errors = []
    expected = {field["name"] for field in fields}
    extra = sorted(set(row) - expected)
    if extra:
        errors.append(f"{dataset} row {index} has unexpected fields: {', '.join(extra)}")
    for spec in fields:
        name = spec["name"]
        value = row.get(name)
        required = bool(spec.get("required"))
        if value is None:
            if required:
                errors.append(f"{dataset} row {index} is missing {name}")
            continue
        if not _type_ok(value, spec):
            errors.append(f"{dataset} row {index} field {name} has invalid {spec['type']} value")
    return errors


def _type_ok(value: Any, spec: dict[str, Any]) -> bool:
    kind = spec["type"]
    if kind == "string":
        return isinstance(value, str) and bool(value.strip())
    if kind == "lei":
        return isinstance(value, str) and lei_is_valid(value)
    if kind == "uscc":
        return isinstance(value, str) and uscc_is_valid(value)
    if kind == "datetime":
        return isinstance(value, str) and _is_datetime(value)
    if kind == "enum":
        return value in spec.get("values", [])
    return False


def _is_datetime(value: str) -> bool:
    text = value.replace("Z", "+00:00")
    try:
        dt.datetime.fromisoformat(text)
    except ValueError:
        return False
    return True

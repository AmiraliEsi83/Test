"""Minimal YAML connector-spec loader for Feeder v2."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

SUPPORTED_API = "feeder/v2"
REQUIRED_TOP = ("apiVersion", "kind", "metadata", "spec")
REQUIRED_METADATA = ("id", "name", "version", "layer")
REQUIRED_STREAM_KEYS = ("name", "extractor", "source", "register", "quality")


class SpecError(ValueError):
    pass


def load_connector_yaml(path: str | Path) -> dict[str, Any]:
    path = Path(path)
    if not path.exists():
        raise SpecError(f"Connector YAML not found: {path}")
    with path.open(encoding="utf-8") as handle:
        spec = yaml.safe_load(handle)
    validate_spec(spec)
    return spec


def validate_spec(spec: Any) -> None:
    if not isinstance(spec, dict):
        raise SpecError("Connector YAML must be a mapping")
    for key in REQUIRED_TOP:
        if key not in spec:
            raise SpecError(f"Missing top-level key: {key}")
    if spec["apiVersion"] != SUPPORTED_API:
        raise SpecError(f"Unsupported apiVersion {spec['apiVersion']!r}; expected {SUPPORTED_API}")
    if spec["kind"] != "SourceConnector":
        raise SpecError(f"Unsupported kind {spec['kind']!r}")
    metadata = spec["metadata"]
    for key in REQUIRED_METADATA:
        if key not in metadata:
            raise SpecError(f"Missing metadata.{key}")
    if metadata["layer"] != "bronze":
        raise SpecError("This Feeder v2 runtime only lands to bronze")
    spec_body = spec["spec"]
    streams = spec_body.get("streams")
    if not isinstance(streams, list) or not streams:
        raise SpecError("spec.streams must be a non-empty list")
    names: set[str] = set()
    for stream in streams:
        for key in REQUIRED_STREAM_KEYS:
            if key not in stream:
                raise SpecError(f"Stream {stream.get('name')!r} missing {key}")
        name = stream["name"]
        if name in names:
            raise SpecError(f"Duplicate stream name: {name}")
        names.add(name)
    if "bronze_contract" not in spec_body:
        raise SpecError("spec.bronze_contract is required")
    if "landing" not in spec_body:
        raise SpecError("spec.landing is required")


def enabled_streams(spec: dict[str, Any]) -> list[dict[str, Any]]:
    return [stream for stream in spec["spec"]["streams"] if stream.get("enabled", True)]


def stream_by_name(spec: dict[str, Any], name: str) -> dict[str, Any]:
    for stream in spec["spec"]["streams"]:
        if stream["name"] == name:
            return stream
    raise SpecError(f"Unknown stream: {name}")

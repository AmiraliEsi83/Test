"""CLI for Feeder v2 China corporate-registry bronze connector."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from feeder_v2.runner import run_connector
from feeder_v2.validation import validate_bronze_run
from feeder_v2.yaml_spec import load_connector_yaml

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONNECTOR = PACKAGE_ROOT / "connectors" / "china_corporate_registry.yaml"
DEFAULT_BRONZE = PACKAGE_ROOT / "bronze"


def _print(obj: object) -> None:
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Feeder v2 bronze connector runtime")
    parser.add_argument("--connector", default=str(DEFAULT_CONNECTOR), help="Path to connector YAML")
    parser.add_argument("--bronze-root", default=str(DEFAULT_BRONZE))
    sub = parser.add_subparsers(dest="command", required=True)

    spec_cmd = sub.add_parser("spec", help="Load and print the connector YAML")
    spec_cmd.set_defaults(func=_cmd_spec)

    run_cmd = sub.add_parser("run", help="Extract sources and land to bronze")
    run_cmd.add_argument("--profile", default="validate", choices=["validate", "full"])
    run_cmd.add_argument("--run-id")
    run_cmd.set_defaults(func=_cmd_run)

    val_cmd = sub.add_parser("validate", help="Validate a bronze run (PO-1693)")
    val_cmd.add_argument("--run-id", required=True)
    val_cmd.add_argument("--date", required=True, help="Partition date YYYY-MM-DD")
    val_cmd.add_argument("--profile", default="validate")
    val_cmd.set_defaults(func=_cmd_validate)

    land_cmd = sub.add_parser("land-and-validate", help="Run all three streams then validate bronze")
    land_cmd.add_argument("--profile", default="validate", choices=["validate", "full"])
    land_cmd.add_argument("--run-id")
    land_cmd.set_defaults(func=_cmd_land_and_validate)

    args = parser.parse_args(argv)
    return args.func(args)


def _cmd_spec(args: argparse.Namespace) -> int:
    spec = load_connector_yaml(args.connector)
    _print(
        {
            "apiVersion": spec["apiVersion"],
            "id": spec["metadata"]["id"],
            "tickets": spec["metadata"].get("tickets"),
            "streams": [stream["name"] for stream in spec["spec"]["streams"] if stream.get("enabled", True)],
        }
    )
    return 0


def _cmd_run(args: argparse.Namespace) -> int:
    result = run_connector(
        args.connector,
        bronze_root=Path(args.bronze_root),
        profile_name=args.profile,
        run_id=args.run_id,
    )
    _print(
        {
            "ok": result.ok,
            "run_id": result.run_id,
            "date": result.date,
            "streams": result.streams,
            "errors": result.errors,
        }
    )
    return 0 if result.ok else 1


def _cmd_validate(args: argparse.Namespace) -> int:
    report = validate_bronze_run(
        args.connector,
        bronze_root=Path(args.bronze_root),
        run_id=args.run_id,
        date=args.date,
        profile_name=args.profile,
    )
    _print(report)
    return 0 if report["ok"] else 1


def _cmd_land_and_validate(args: argparse.Namespace) -> int:
    result = run_connector(
        args.connector,
        bronze_root=Path(args.bronze_root),
        profile_name=args.profile,
        run_id=args.run_id,
    )
    report = validate_bronze_run(
        args.connector,
        bronze_root=Path(args.bronze_root),
        run_id=result.run_id,
        date=result.date,
        profile_name=args.profile,
    )
    _print(
        {
            "run": {
                "ok": result.ok,
                "run_id": result.run_id,
                "date": result.date,
                "streams": result.streams,
                "errors": result.errors,
            },
            "validation": report,
        }
    )
    return 0 if result.ok and report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())

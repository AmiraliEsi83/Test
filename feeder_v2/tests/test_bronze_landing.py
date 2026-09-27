from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from feeder_v2.runner import run_connector
from feeder_v2.validation import validate_bronze_run

ROOT = Path(__file__).resolve().parents[1]
CONNECTOR = ROOT / "connectors" / "china_corporate_registry.yaml"
FIXTURES = Path(__file__).parent / "fixtures"


class FixtureClient:
    """HTTP stand-in so bronze landing tests do not hit the network."""

    def __init__(self) -> None:
        self.gleif = json.loads((FIXTURES / "gleif_cn_page.json").read_text(encoding="utf-8"))
        self.package = json.loads((FIXTURES / "hk_package.json").read_text(encoding="utf-8"))
        self.wikidata = json.loads((FIXTURES / "wikidata_uscc.json").read_text(encoding="utf-8"))
        self.hk_local = (FIXTURES / "hk_local.csv").read_text(encoding="utf-8")
        self.hk_foreign = (FIXTURES / "hk_foreign.csv").read_text(encoding="utf-8")
        self.gleif_calls = 0
        self.wiki_calls = 0

    def get_json(self, url: str, *, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> Any:
        params = params or {}
        if "lei-records" in url:
            self.gleif_calls += 1
            page = int(params.get("page[number]") or 1)
            if page > 1:
                empty = dict(self.gleif)
                empty["data"] = []
                return empty
            return self.gleif
        if "package_show" in url:
            return self.package
        if "sparql" in url or "wikidata" in url:
            self.wiki_calls += 1
            offset = 0
            query = str(params.get("query") or "")
            if "OFFSET" in query:
                offset = int(query.rsplit("OFFSET", 1)[-1].strip().split()[0])
            if offset:
                return {"results": {"bindings": []}}
            return self.wikidata
        raise AssertionError(f"unexpected JSON url {url}")

    def get_text(self, url: str, *, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> str:
        if "RNC063L_" in url:
            return self.hk_local
        if "RNC063F_" in url:
            return self.hk_foreign
        raise AssertionError(f"unexpected text url {url}")


def test_all_three_streams_land_and_validate(tmp_path: Path):
    client = FixtureClient()
    result = run_connector(
        CONNECTOR,
        bronze_root=tmp_path,
        profile_name="validate",
        client=client,
        run_id="testvalidate01",
    )
    assert result.ok, result.errors
    assert set(result.streams) == {
        "cn_samr_lei",
        "hk_companies_register",
        "cn_uscc_wikidata",
    }
    for name, manifest in result.streams.items():
        assert manifest["row_count"] >= 20, name
        assert (tmp_path / "china_corporate_registry" / name / f"dt={result.date}" / "run=testvalidate01" / "_SUCCESS").exists()

    report = validate_bronze_run(
        CONNECTOR,
        bronze_root=tmp_path,
        run_id=result.run_id,
        date=result.date,
        profile_name="validate",
    )
    assert report["ok"], report["failures"]
    assert len(report["streams"]) == 3

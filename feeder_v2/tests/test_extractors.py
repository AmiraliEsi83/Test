from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from feeder_v2.extractors.gleif_cn import normalize_gleif_record
from feeder_v2.extractors.hk_cr import parse_hk_csv
from feeder_v2.extractors.wikidata_uscc import normalize_wikidata_row
from feeder_v2.uscc import is_valid_uscc

FIXTURES = Path(__file__).parent / "fixtures"


def test_gleif_normalizer_emits_uscc_register_ids():
    payload = json.loads((FIXTURES / "gleif_cn_page.json").read_text(encoding="utf-8"))
    records = []
    for row in payload["data"]:
        record = normalize_gleif_record(row["attributes"], source_uri="https://api.gleif.org/api/v1/lei-records")
        assert record is not None
        assert is_valid_uscc(record["register_id"])
        assert record["register_authority"] == "RA000092"
        assert record["country_code"] == "CN"
        assert record["legal_name"]
        records.append(record)
    assert len(records) >= 20


def test_hk_csv_parser_reads_redomiciliation_date_column():
    text = (
        "Seq,Current Company Name in English,Current Company Name in Chinese,BR Number,"
        "Date of Incorporation / Re-domiciliation Date,Date of Change of name\n"
        '"1","101080 MAISON LIMITED",,"81253866","18-09-2026",\n'
    )
    records = list(parse_hk_csv(text, scope="local", source_uri="fixture"))
    assert records[0]["register_id"] == "81253866"
    assert records[0]["incorporation_date"] == "2026-09-18"
    assert records[0]["event_date"] == "2026-09-18"


def test_hk_csv_parser_uses_br_numbers():
    text = (FIXTURES / "hk_local.csv").read_text(encoding="utf-8")
    records = list(parse_hk_csv(text, scope="local", source_uri="fixture"))
    assert len(records) >= 20
    assert all(item["register_id_type"] == "HK_BRN" for item in records)
    assert all(item["country_code"] == "HK" for item in records)
    assert all(item["register_id"].isdigit() and len(item["register_id"]) == 8 for item in records)


def test_wikidata_normalizer_keeps_valid_uscc_only():
    payload = json.loads((FIXTURES / "wikidata_uscc.json").read_text(encoding="utf-8"))
    records = [
        normalize_wikidata_row(row, source_uri="https://query.wikidata.org/sparql")
        for row in payload["results"]["bindings"]
    ]
    records = [row for row in records if row]
    assert len(records) >= 20
    assert all(is_valid_uscc(row["register_id"]) for row in records)

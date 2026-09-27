"""Wikidata P6795 Unified Social Credit Code extractor."""

from __future__ import annotations

from typing import Any, Iterator

from feeder_v2.http import HttpClient
from feeder_v2.uscc import is_valid_uscc, normalize_uscc

SPARQL = """
SELECT ?qid ?en ?zh ?uscc ?inception WHERE {{
  ?company wdt:P6795 ?uscc .
  BIND(STRAFTER(STR(?company), "entity/") AS ?qid)
  OPTIONAL {{ ?company wdt:P571 ?inception }}
  OPTIONAL {{ ?company rdfs:label ?en FILTER(LANG(?en)="en") }}
  OPTIONAL {{ ?company rdfs:label ?zh FILTER(LANG(?zh)="zh") }}
}}
LIMIT {limit}
OFFSET {offset}
"""


def _binding(row: dict[str, Any], key: str) -> str | None:
    blob = row.get(key) or {}
    value = blob.get("value")
    return str(value) if value else None


def normalize_wikidata_row(row: dict[str, Any], source_uri: str) -> dict[str, Any] | None:
    uscc = normalize_uscc(_binding(row, "uscc"))
    qid = _binding(row, "qid")
    legal_zh = _binding(row, "zh")
    legal_en = _binding(row, "en")
    legal_name = legal_zh or legal_en
    if not qid or not legal_name or not is_valid_uscc(uscc):
        return None
    inception = _binding(row, "inception")
    if inception:
        inception = inception[:10]
    return {
        "source_record_id": qid,
        "wikidata_qid": qid,
        "register_id": uscc,
        "register_id_type": "CN_USCC",
        "register_authority": "RA000092",
        "register_authority_name": "National Enterprise Credit Information Publicity System (SAMR)",
        "legal_name": legal_name,
        "legal_name_language": "zh" if legal_zh else "en",
        "legal_name_zh": legal_zh,
        "legal_name_en": legal_en,
        "country_code": "CN",
        "jurisdiction_code": "CN",
        "entity_status": "REPORTED",
        "company_type": None,
        "incorporation_date": inception,
        "source_uri": source_uri,
        "_raw": row,
    }


def extract(stream: dict[str, Any], profile: dict[str, Any], client: HttpClient) -> Iterator[dict[str, Any]]:
    source = stream["source"]
    endpoint = source["endpoint"]
    limit = int(profile.get("wikidata_limit") or profile.get("limit_per_stream") or 80)
    page_size = min(limit, 200)
    yielded = 0
    offset = 0
    while yielded < limit:
        query = SPARQL.format(limit=min(page_size, limit - yielded), offset=offset)
        payload = client.get_json(
            endpoint,
            params={"query": query, "format": "json"},
            headers={
                "Accept": "application/sparql-results+json",
                "User-Agent": "FeederV2-ChinaCorporateRegistry/1.0 (PO-1594; https://www.wikidata.org/wiki/Wikidata:Data_access)",
            },
        )
        rows = (payload.get("results") or {}).get("bindings") or []
        if not rows:
            break
        for row in rows:
            record = normalize_wikidata_row(row, source_uri=endpoint)
            if not record:
                continue
            yield record
            yielded += 1
            if yielded >= limit:
                return
        offset += len(rows)
        if len(rows) < page_size:
            break

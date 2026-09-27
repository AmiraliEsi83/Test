"""Hong Kong Companies Registry weekly open-data extractor."""

from __future__ import annotations

import csv
import io
import re
from typing import Any, Iterator

from feeder_v2.http import HttpClient
from feeder_v2.uscc import is_valid_hk_brn

DATE_RE = re.compile(r"(\d{2})-(\d{2})-(\d{4})")


def _iso_date(value: str | None) -> str | None:
    if not value:
        return None
    match = DATE_RE.fullmatch(value.strip())
    if not match:
        return value.strip()
    day, month, year = match.groups()
    return f"{year}-{month}-{day}"


def _is_chinese(text: str) -> bool:
    return any("\u4e00" <= char <= "\u9fff" for char in text)


def parse_hk_csv(text: str, *, scope: str, source_uri: str) -> Iterator[dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        br_number = (row.get("BR Number") or "").strip()
        english = (
            row.get("Current Company Name in English")
            or row.get("Current Corporate Name / Other Corporate Name")
            or ""
        ).strip()
        chinese = (
            row.get("Current Company Name in Chinese")
            or row.get("Current Approved Name for Carrying on Business in H.K.")
            or ""
        ).strip()
        if chinese and not _is_chinese(chinese) and not english:
            english, chinese = chinese, ""
        if _is_chinese(english) and not chinese:
            chinese, english = english, ""
        legal_name = english or chinese
        if not legal_name or not is_valid_hk_brn(br_number):
            continue
        incorporation = _iso_date(
            row.get("Date of Incorporation")
            or row.get("Date of Incorporation / Re-domiciliation Date")
            or row.get("Date of Registration")
            or row.get("Date of Registration / Re-domiciliation Date")
            or ""
        )
        name_change = _iso_date(row.get("Date of Change of name") or "")
        yield {
            "source_record_id": f"{br_number}:{legal_name}",
            "register_id": br_number,
            "register_id_type": "HK_BRN",
            "register_authority": "HK-CR",
            "register_authority_name": "Hong Kong Companies Registry",
            "legal_name": legal_name,
            "legal_name_language": "zh" if not english and chinese else "en",
            "legal_name_en": english or None,
            "legal_name_zh": chinese or None,
            "country_code": "HK",
            "jurisdiction_code": "HK",
            "entity_status": "REGISTERED",
            "company_type": "non_hong_kong_company" if scope == "non_hong_kong" else "local_company",
            "company_scope": scope,
            "incorporation_date": incorporation,
            "name_change_date": name_change,
            "event_date": name_change or incorporation,
            "source_uri": source_uri,
            "_raw": row,
        }


def _csv_resources(package: dict[str, Any], prefix: str) -> list[dict[str, Any]]:
    resources = []
    for resource in package.get("result", {}).get("resources", []):
        fmt = (resource.get("format") or "").upper()
        url = resource.get("url") or ""
        if fmt == "CSV" and prefix in url:
            resources.append(resource)
    return resources


def extract(stream: dict[str, Any], profile: dict[str, Any], client: HttpClient) -> Iterator[dict[str, Any]]:
    source = stream["source"]
    package = client.get_json(source["ckan_package_url"], params={"id": source["ckan_package_id"]})
    weeks = int(profile.get("hk_weeks") or 1)
    limit = profile.get("limit_per_stream")
    yielded = 0
    targets = [
        (resource, "local")
        for resource in _csv_resources(package, source["csv_local_prefix"])[-weeks:]
    ] + [
        (resource, "non_hong_kong")
        for resource in _csv_resources(package, source["csv_foreign_prefix"])[-weeks:]
    ]
    for resource, scope in targets:
        url = resource["url"]
        text = client.get_text(url)
        if text.startswith("\ufeff"):
            text = text.lstrip("\ufeff")
        for record in parse_hk_csv(text, scope=scope, source_uri=url):
            yield record
            yielded += 1
            if limit is not None and yielded >= int(limit):
                return

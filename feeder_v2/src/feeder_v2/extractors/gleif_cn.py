"""GLEIF Golden Copy extractor for mainland China SAMR / USCC records."""

from __future__ import annotations

from typing import Any, Iterator

from feeder_v2.http import HttpClient
from feeder_v2.uscc import is_valid_uscc, normalize_uscc

ELF_NAMES = {
    "ECAK": "Limited Liability Company / 有限责任公司",
    "6CHY": "Company Limited by Shares / 股份有限公司",
    "C2SW": "Partnership / 合伙企业",
}


def _name(blob: Any) -> tuple[str | None, str | None]:
    if not isinstance(blob, dict):
        return None, None
    return blob.get("name"), blob.get("language")


def _english_name(entity: dict[str, Any]) -> str | None:
    for collection_key in ("otherNames", "transliteratedOtherNames"):
        for item in entity.get(collection_key) or []:
            if not isinstance(item, dict):
                continue
            name = item.get("name")
            language = (item.get("language") or "").lower()
            name_type = item.get("type") or ""
            if name and (language.startswith("en") or "ALTERNATIVE_LANGUAGE" in name_type):
                return name
    return None


def _address_line(address: dict[str, Any] | None) -> str | None:
    if not address:
        return None
    lines = [line for line in (address.get("addressLines") or []) if line]
    return ", ".join(lines) if lines else None


def normalize_gleif_record(attributes: dict[str, Any], source_uri: str) -> dict[str, Any] | None:
    entity = attributes.get("entity") or {}
    registration = attributes.get("registration") or {}
    legal_name, legal_lang = _name(entity.get("legalName"))
    uscc = normalize_uscc(entity.get("registeredAs") or registration.get("validatedAs"))
    if not legal_name or not is_valid_uscc(uscc):
        return None
    authority = entity.get("registeredAt") or {}
    address = entity.get("legalAddress") or {}
    legal_form = entity.get("legalForm") or {}
    return {
        "source_record_id": attributes.get("lei"),
        "lei": attributes.get("lei"),
        "register_id": uscc,
        "register_id_type": "CN_USCC",
        "register_authority": authority.get("id") or "RA000092",
        "register_authority_name": "National Enterprise Credit Information Publicity System (SAMR)",
        "legal_name": legal_name,
        "legal_name_language": legal_lang,
        "legal_name_zh": legal_name if (legal_lang or "").startswith("zh") else None,
        "legal_name_en": _english_name(entity),
        "country_code": "CN",
        "jurisdiction_code": entity.get("jurisdiction") or "CN",
        "entity_status": entity.get("status"),
        "lei_registration_status": registration.get("status"),
        "company_type": ELF_NAMES.get(legal_form.get("id") or "", legal_form.get("other") or legal_form.get("id")),
        "legal_form_id": legal_form.get("id"),
        "entity_category": entity.get("category"),
        "incorporation_date": entity.get("creationDate"),
        "registered_address_line": _address_line(address),
        "registered_address_city": address.get("city"),
        "registered_address_region": address.get("region"),
        "registered_address_country": address.get("country"),
        "registered_address_postal_code": address.get("postalCode"),
        "corroboration_level": registration.get("corroborationLevel"),
        "last_update_date": registration.get("lastUpdateDate"),
        "source_uri": source_uri,
        "_raw": attributes,
    }


def extract(stream: dict[str, Any], profile: dict[str, Any], client: HttpClient) -> Iterator[dict[str, Any]]:
    source = stream["source"]
    url = source["base_url"].rstrip("/") + source["path"]
    page_size = int(profile.get("gleif_page_size") or source.get("max_page_size") or 40)
    limit = profile.get("limit_per_stream")
    page = 1
    yielded = 0
    while True:
        params = {
            **source.get("params", {}),
            "page[size]": page_size,
            "page[number]": page,
        }
        payload = client.get_json(url, params=params, headers={"Accept": "application/vnd.api+json"})
        rows = payload.get("data") or []
        if not rows:
            break
        for row in rows:
            attributes = row.get("attributes") or {}
            record = normalize_gleif_record(attributes, source_uri=url)
            if not record:
                continue
            yield record
            yielded += 1
            if limit is not None and yielded >= int(limit):
                return
        last_page = (payload.get("meta") or {}).get("pagination", {}).get("lastPage")
        if last_page is not None and page >= int(last_page):
            break
        page += 1

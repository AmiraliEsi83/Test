"""Project a GLEIF LEI resource onto the three bronze datasets."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from china_registry.identifiers import (
    CHINA_JURISDICTION,
    CHINA_REGISTRY_AUTHORITY_ID,
    lei_is_valid,
    uscc_is_valid,
)

REGISTRY_NAME = "National Enterprise Credit Information Publicity System"
REGISTRY_LOCAL_NAME = "全国企业信用信息公示系统"
REGISTRY_WEBSITE = "http://www.gsxt.gov.cn/"


def canonical_raw(resource: dict[str, Any]) -> str:
    return json.dumps(resource, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def raw_sha256(resource: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_raw(resource).encode("utf-8")).hexdigest()


def is_china_registry_record(resource: dict[str, Any]) -> bool:
    """Keep entities formed in China and registered on the GSXT / SAMR register."""
    entity = _entity(resource)
    registration = _registration(resource)
    registration_number = (entity.get("registeredAs") or "").strip().upper()
    validated_as = (registration.get("validatedAs") or "").strip().upper()
    legal_name, legal_language = _legal_name(entity)
    legal_form_code = ((entity.get("legalForm") or {}).get("id") or "").strip()
    return (
        entity.get("jurisdiction") == CHINA_JURISDICTION
        and _authority_id(entity.get("registeredAt")) == CHINA_REGISTRY_AUTHORITY_ID
        and _authority_id(registration.get("validatedAt")) == CHINA_REGISTRY_AUTHORITY_ID
        and uscc_is_valid(registration_number)
        and validated_as == registration_number
        and lei_is_valid(_lei(resource))
        and bool(legal_name and legal_language and legal_form_code)
        and entity.get("status") in {"ACTIVE", "INACTIVE", "NULL"}
        and bool((entity.get("category") or "").strip())
        and bool((registration.get("corroborationLevel") or "").strip())
        and bool((registration.get("managingLou") or "").strip())
        and registration.get("status")
        in {
            "ISSUED",
            "LAPSED",
            "MERGED",
            "RETIRED",
            "DUPLICATE",
            "ANNULLED",
            "CANCELLED",
            "TRANSFERRED",
            "PENDING_TRANSFER",
            "PENDING_ARCHIVAL",
        }
        and bool(registration.get("initialRegistrationDate"))
        and bool(registration.get("lastUpdateDate"))
        and _address_row("check", "legal", entity.get("legalAddress"), {"retrieved_at": "t", "ingest_batch_id": "b"})
        is not None
        and _address_row(
            "check",
            "headquarters",
            entity.get("headquartersAddress"),
            {"retrieved_at": "t", "ingest_batch_id": "b"},
        )
        is not None
    )


def legal_form_name_for(entity: dict[str, Any], published_name: str | None) -> str:
    """Use the ISO 20275 name, or the register's free-text form when the code is 8888."""
    legal_form = entity.get("legalForm") or {}
    code = (legal_form.get("id") or "").strip()
    other = (legal_form.get("other") or "").strip()
    if code == "8888" and other:
        return other
    if published_name and published_name.strip():
        return published_name.strip()
    if other:
        return other
    raise ValueError(f"legal form {code or '(missing)'} has no name")


def project_record(
    resource: dict[str, Any],
    *,
    legal_form_name: str,
    retrieved_at: str,
    batch_id: str,
) -> dict[str, Any]:
    if not is_china_registry_record(resource):
        raise ValueError("resource is not a China corporate-registry record")
    if not legal_form_name.strip():
        raise ValueError("legal form name is required")

    entity = _entity(resource)
    registration = _registration(resource)
    lei = _lei(resource)
    legal_name, legal_name_language = _legal_name(entity)
    if not legal_name or not legal_name_language:
        raise ValueError(f"{lei} is missing a legal name")

    registration_number = (entity.get("registeredAs") or "").strip().upper()
    validated_as = (registration.get("validatedAs") or "").strip().upper()
    legal_form = entity.get("legalForm") or {}
    legal_form_code = (legal_form.get("id") or "").strip()
    if not legal_form_code:
        raise ValueError(f"{lei} is missing a legal form code")

    common = {"retrieved_at": retrieved_at, "ingest_batch_id": batch_id}
    entity_row = {
        "lei": lei,
        "legal_name": legal_name,
        "legal_name_language": legal_name_language,
        "english_name": _english_name(entity),
        "transliterated_name": _transliterated_name(entity),
        "jurisdiction": CHINA_JURISDICTION,
        "entity_status": entity.get("status"),
        "entity_category": entity.get("category"),
        "legal_form_code": legal_form_code,
        "legal_form_name": legal_form_name.strip(),
        "creation_date": entity.get("creationDate"),
        "expiration_date": (entity.get("expiration") or {}).get("date"),
        "conformity_flag": (resource.get("attributes") or {}).get("conformityFlag"),
        "source_system": "gleif",
        "source_record_url": f"https://api.gleif.org/api/v1/lei-records/{lei}",
        "raw_sha256": raw_sha256(resource),
        **common,
    }
    registration_row = {
        "lei": lei,
        "registration_authority_id": CHINA_REGISTRY_AUTHORITY_ID,
        "registration_authority_name": REGISTRY_NAME,
        "registration_authority_local_name": REGISTRY_LOCAL_NAME,
        "registration_number": registration_number,
        "registration_number_check": True,
        "validation_authority_id": CHINA_REGISTRY_AUTHORITY_ID,
        "validated_as": validated_as,
        "numbers_match": registration_number == validated_as and uscc_is_valid(validated_as),
        "corroboration_level": registration.get("corroborationLevel"),
        "lei_registration_status": registration.get("status"),
        "initial_registration_date": registration.get("initialRegistrationDate"),
        "last_update_date": registration.get("lastUpdateDate"),
        "next_renewal_date": registration.get("nextRenewalDate"),
        "managing_lou": registration.get("managingLou"),
        "registry_website": REGISTRY_WEBSITE,
        **common,
    }
    addresses = [
        _address_row(lei, "legal", entity.get("legalAddress"), common),
        _address_row(lei, "headquarters", entity.get("headquartersAddress"), common),
    ]
    addresses = [row for row in addresses if row is not None]
    if not any(row["address_role"] == "legal" for row in addresses):
        raise ValueError(f"{lei} is missing a legal address")
    return {
        "entity": entity_row,
        "registration": registration_row,
        "addresses": addresses,
    }


def _entity(resource: dict[str, Any]) -> dict[str, Any]:
    return (resource.get("attributes") or {}).get("entity") or {}


def _registration(resource: dict[str, Any]) -> dict[str, Any]:
    return (resource.get("attributes") or {}).get("registration") or {}


def _lei(resource: dict[str, Any]) -> str:
    attributes = resource.get("attributes") or {}
    return (attributes.get("lei") or resource.get("id") or "").strip().upper()


def _authority_id(block: Any) -> str | None:
    if not isinstance(block, dict):
        return None
    value = block.get("id")
    if not value:
        return None
    return str(value).strip()


def _legal_name(entity: dict[str, Any]) -> tuple[str | None, str | None]:
    block = entity.get("legalName") or {}
    name = (block.get("name") or "").strip() or None
    language = (block.get("language") or "").strip() or None
    return name, language


def _english_name(entity: dict[str, Any]) -> str | None:
    for item in entity.get("otherNames") or []:
        if item.get("type") == "ALTERNATIVE_LANGUAGE_LEGAL_NAME" or item.get("language") == "en":
            name = (item.get("name") or "").strip()
            if name:
                return name
    return None


def _transliterated_name(entity: dict[str, Any]) -> str | None:
    for item in entity.get("transliteratedOtherNames") or []:
        name = (item.get("name") or "").strip()
        if name:
            return name
    return None


def _address_row(
    lei: str,
    role: str,
    block: Any,
    common: dict[str, str],
) -> dict[str, Any] | None:
    if not isinstance(block, dict):
        return None
    lines = [str(line).strip() for line in (block.get("addressLines") or []) if str(line).strip()]
    address_line = "\n".join(lines)
    country = (block.get("country") or "").strip()
    if not address_line or not country:
        return None
    return {
        "lei": lei,
        "address_role": role,
        "language": (block.get("language") or "").strip() or None,
        "address_line": address_line,
        "city": (block.get("city") or "").strip() or None,
        "region": (block.get("region") or "").strip() or None,
        "country": country,
        "postal_code": (block.get("postalCode") or "").strip() or None,
        **common,
    }

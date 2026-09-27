"""Checksums for the identifiers this connector treats as register-grade."""

from __future__ import annotations

# GB 32100-2015 Unified Social Credit Code.
USCC_CHARSET = "0123456789ABCDEFGHJKLMNPQRTUWXY"
USCC_WEIGHTS = (1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28)

# National Enterprise Credit Information Publicity System, operated by SAMR.
CHINA_REGISTRY_AUTHORITY_ID = "RA000092"
CHINA_JURISDICTION = "CN"


def uscc_is_valid(value: str | None) -> bool:
    """Return True when value is an 18-character USCC with a valid check character."""
    if not value or len(value) != 18:
        return False
    code = value.strip().upper()
    if len(code) != 18 or any(char not in USCC_CHARSET for char in code):
        return False
    total = sum(USCC_CHARSET.index(code[i]) * USCC_WEIGHTS[i] for i in range(17))
    check = (31 - (total % 31)) % 31
    return code[17] == USCC_CHARSET[check]


def lei_is_valid(value: str | None) -> bool:
    """Return True when value is a 20-character ISO 17442 LEI (mod-97 == 1)."""
    if not value or len(value) != 20:
        return False
    code = value.strip().upper()
    if len(code) != 20 or not code.isalnum():
        return False
    digits = "".join(str(ord(char) - 55) if char.isalpha() else char for char in code)
    return int(digits) % 97 == 1

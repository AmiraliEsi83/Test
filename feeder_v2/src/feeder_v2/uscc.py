"""GB 32100-2015 Unified Social Credit Code (USCC) helpers."""

from __future__ import annotations

import re

# Characters I, O, S, V, Z are excluded to avoid visual confusion.
CHARSET = "0123456789ABCDEFGHJKLMNPQRTUWXY"
CODEPOINT = {char: index for index, char in enumerate(CHARSET)}
WEIGHTS = [pow(3, index) for index in range(17)]

# Loose shape check used before checksum: 18 charset characters.
USCC_SHAPE = re.compile(r"^[0-9A-HJ-NP-RT-UW-Y]{18}$")
HK_BRN_SHAPE = re.compile(r"^\d{8}$")


def normalize_uscc(value: str | None) -> str | None:
    if value is None:
        return None
    code = re.sub(r"[\s-]+", "", str(value)).upper()
    return code or None


def uscc_check_digit(body17: str) -> str:
    total = sum(CODEPOINT[body17[i]] * WEIGHTS[i] for i in range(17))
    check = 31 - (total % 31)
    if check == 31:
        check = 0
    return CHARSET[check]


def is_valid_uscc(value: str | None) -> bool:
    code = normalize_uscc(value)
    if not code or not USCC_SHAPE.match(code):
        return False
    if any(char not in CODEPOINT for char in code):
        return False
    return uscc_check_digit(code[:17]) == code[17]


def is_valid_hk_brn(value: str | None) -> bool:
    if value is None:
        return False
    return bool(HK_BRN_SHAPE.match(str(value).strip()))
